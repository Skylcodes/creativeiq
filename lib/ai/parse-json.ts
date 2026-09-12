import { jsonrepair } from "jsonrepair";

/**
 * Extract the outermost JSON object from mixed model output. Uses brace-depth
 * tracking that respects quoted strings — naive lastIndexOf("}") corrupts
 * truncated Gemini structured-output when a `}` appears inside a string value
 * (e.g. visualDescription prose), which surfaces as "Colon expected at N".
 */
export function extractJsonObjectString(raw: string): string {
  let text = raw.trim();

  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  }

  const start = text.indexOf("{");
  if (start === -1) return text;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  // Truncated response — return from opening brace so jsonrepair can attempt repair.
  return text.slice(start);
}

/** Normalize model output to a single JSON object string. */
export function normalizeJsonText(raw: string): string {
  return extractJsonObjectString(raw);
}

function stripTrailingCommas(json: string): string {
  return json.replace(/,\s*([}\]])/g, "$1");
}

/** Replace ASCII control chars inside JSON string values with spaces. */
function sanitizeControlCharsInStrings(json: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i += 1) {
    const ch = json[i];
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inString = false;
        continue;
      }
      if (ch === "\n" || ch === "\r" || ch === "\t") {
        out += " ";
        continue;
      }
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        out += " ";
        continue;
      }
      out += ch;
      continue;
    }

    if (ch === '"') {
      inString = true;
    }
    out += ch;
  }

  return out;
}

/**
 * Parse a JSON object from LLM output. Tries normalization, trailing-comma
 * cleanup, control-char sanitization, and jsonrepair before failing.
 */
export function parseJsonObject<T>(raw: string): T {
  const trimmed = raw.trim();
  const normalized = normalizeJsonText(raw);
  const candidates = [
    trimmed,
    normalized,
    stripTrailingCommas(normalized),
    sanitizeControlCharsInStrings(normalized),
    sanitizeControlCharsInStrings(stripTrailingCommas(normalized)),
    jsonrepair(normalized),
    jsonrepair(stripTrailingCommas(normalized)),
    jsonrepair(sanitizeControlCharsInStrings(normalized)),
    jsonrepair(sanitizeControlCharsInStrings(stripTrailingCommas(normalized))),
  ];

  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(
    lastError
      ? `Could not parse JSON object: ${lastError.message}`
      : "Could not parse JSON object."
  );
}
