import { jsonrepair } from "jsonrepair";

/** Normalize model output to a single JSON object string. */
export function normalizeJsonText(raw: string): string {
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
  const normalized = normalizeJsonText(raw);
  const candidates = [
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
