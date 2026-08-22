import { describe, expect, it } from "vitest";
import { parseJsonObject } from "@/lib/ai/parse-json";

describe("parseJsonObject", () => {
  it("parses clean JSON", () => {
    const result = parseJsonObject<{ a: number }>('{"a": 1}');
    expect(result.a).toBe(1);
  });

  it("extracts JSON from markdown fences", () => {
    const result = parseJsonObject<{ ok: boolean }>(
      'Here is the result:\n```json\n{"ok": true}\n```'
    );
    expect(result.ok).toBe(true);
  });

  it("repairs trailing commas", () => {
    const result = parseJsonObject<{ a: number; b: number }>('{"a": 1, "b": 2,}');
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("repairs raw newlines inside string values", () => {
    const raw = '{"visualDescription": "Line one\nLine two", "score": 5}';
    const result = parseJsonObject<{ visualDescription: string; score: number }>(raw);
    expect(result.visualDescription).toContain("Line one");
    expect(result.score).toBe(5);
  });

  it("repairs unquoted timeline entries that break colons", () => {
    const raw =
      '{"visualTimeline": ["~0:00 opening beat", "~0:04 product shown"], "primaryMessaging": "hello"}';
    const result = parseJsonObject<{ primaryMessaging: string }>(raw);
    expect(result.primaryMessaging).toBe("hello");
  });
});
