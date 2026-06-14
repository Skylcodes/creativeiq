import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";

export const CLAUDE_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";

/** Used for structured JSON extraction/scoring — cheaper, same schema fidelity. */
export const CLAUDE_JSON_MODEL =
  process.env.ANTHROPIC_JSON_MODEL?.trim() || "claude-haiku-4-5-20251001";

/** Floor for small calls (hooks, conversion score). */
const MIN_REQUEST_TIMEOUT_MS = 120_000;
/** Cap — must stay under worker maxDuration (300s on Vercel). */
const MAX_REQUEST_TIMEOUT_MS = 280_000;

/** Scale timeout with output budget — large JSON extraction needs more headroom. */
export function timeoutForMaxTokens(maxTokens: number): number {
  const scaled = 75_000 + maxTokens * 28;
  return Math.min(Math.max(MIN_REQUEST_TIMEOUT_MS, scaled), MAX_REQUEST_TIMEOUT_MS);
}

let cachedClient: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to run analyses."
    );
  }

  cachedClient = new Anthropic({
    apiKey,
    maxRetries: 0,
    timeout: MAX_REQUEST_TIMEOUT_MS,
  });

  return cachedClient;
}

export type ImageInput = {
  mediaType: "image/jpeg" | "image/png";
  base64Data: string;
};

export type ClaudeCallOptions = {
  system: string;
  /** Agent-specific instructions (appended after cachedContext when set). */
  prompt: string;
  /**
   * Shared context block cached with Anthropic prompt caching (1h TTL).
   * Identical prefix across parallel calls → ~90% input discount on repeats.
   */
  cachedContext?: string;
  image?: ImageInput;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  prefill?: string;
  /** Override default model (Sonnet for voice, Haiku for JSON). */
  model?: string;
  /** Sonnet for funnel/comparison numeric grading — not Haiku. */
  grading?: boolean;
};

function buildUserContent(
  prompt: string,
  image?: ImageInput,
  cachedContext?: string
): Anthropic.MessageParam["content"] {
  if (cachedContext) {
    const blocks: Anthropic.ContentBlockParam[] = [];

    if (image) {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType,
          data: image.base64Data,
        },
      });
    }

    blocks.push({
      type: "text",
      text: cachedContext,
      cache_control: { type: "ephemeral", ttl: "1h" },
    });

    const suffix = prompt.trim();
    if (suffix) {
      blocks.push({ type: "text", text: suffix });
    }

    return blocks;
  }

  if (!image) return prompt;

  return [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: image.mediaType,
        data: image.base64Data,
      },
    },
    { type: "text", text: prompt },
  ];
}

function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

/**
 * Calls Claude once, retrying a single time on transient failure / timeout.
 */
export async function callClaude(options: ClaudeCallOptions): Promise<string> {
  const {
    system,
    prompt,
    cachedContext,
    image,
    maxTokens = 2400,
    temperature = 0.7,
    prefill,
    timeoutMs = timeoutForMaxTokens(maxTokens),
    model = CLAUDE_MODEL,
  } = options;

  const client = getAnthropic();

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: buildUserContent(prompt, image, cachedContext),
    },
  ];
  if (prefill) {
    messages.push({ role: "assistant", content: prefill });
  }

  const run = async (requestTimeoutMs: number): Promise<string> => {
    const message = await client.messages.create(
      {
        model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages,
      },
      { timeout: requestTimeoutMs }
    );
    const text = extractText(message);
    const full = prefill ? `${prefill}${text}` : text;
    if (!full.trim()) {
      throw new Error("Claude returned an empty response.");
    }
    return full;
  };

  try {
    return await run(timeoutMs);
  } catch (firstError) {
    const isTimeout =
      firstError instanceof Error &&
      /timeout|timed out|ETIMEDOUT|AbortError/i.test(firstError.message);

    const retryTimeout = isTimeout
      ? Math.min(Math.round(timeoutMs * 1.25), MAX_REQUEST_TIMEOUT_MS)
      : timeoutMs;

    try {
      await new Promise((r) => setTimeout(r, isTimeout ? 2500 : 1200));
      return await run(retryTimeout);
    } catch (secondError) {
      const msg =
        secondError instanceof Error ? secondError.message : String(secondError);
      throw new Error(`Claude call failed after retry: ${msg}`);
    }
  }
}

const JSON_OUTPUT_RULES = [
  "Respond with ONLY a valid JSON object.",
  "No markdown fences, no commentary before or after.",
  "Escape double quotes inside string values as \\\".",
  "Use \\n for line breaks inside strings — never raw newlines inside JSON strings.",
  "No trailing commas after the last array element or object property.",
].join(" ");

function normalizeJsonText(raw: string): string {
  let text = raw.trim();

  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  return text;
}

function stripTrailingCommas(json: string): string {
  return json.replace(/,\s*([}\]])/g, "$1");
}

function tryParseJson<T>(text: string): T {
  return JSON.parse(text) as T;
}

export function parseJsonObject<T>(raw: string): T {
  const normalized = normalizeJsonText(raw);
  const candidates = [
    normalized,
    stripTrailingCommas(normalized),
    jsonrepair(normalized),
    jsonrepair(stripTrailingCommas(normalized)),
  ];

  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      return tryParseJson<T>(candidate);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(
    lastError
      ? `Could not parse JSON from Claude response: ${lastError.message}`
      : "Could not parse JSON from Claude response."
  );
}

/**
 * Calls Claude (Haiku by default) and parses a JSON object from the response.
 */
export async function callClaudeJSON<T>(
  options: Omit<ClaudeCallOptions, "prefill">
): Promise<T> {
  const jsonModel = options.grading
    ? (options.model ?? CLAUDE_MODEL)
    : (options.model ?? CLAUDE_JSON_MODEL);

  const raw = await callClaude({
    ...options,
    model: jsonModel,
    temperature: options.temperature ?? 0.2,
    prompt: `${options.prompt}\n\n${JSON_OUTPUT_RULES}`,
  });

  try {
    return parseJsonObject<T>(raw);
  } catch (firstError) {
    const parseMessage =
      firstError instanceof Error ? firstError.message : String(firstError);

    const repairedRaw = await callClaude({
      ...options,
      model: jsonModel,
      temperature: 0,
      maxTokens: options.maxTokens ?? 4000,
      prompt: [
        "The JSON object below failed to parse. Fix syntax only — keep the same data and schema.",
        `Parse error: ${parseMessage}`,
        "",
        "Broken JSON:",
        raw.slice(0, 24_000),
        "",
        JSON_OUTPUT_RULES,
      ].join("\n"),
    });

    return parseJsonObject<T>(repairedRaw);
  }
}
