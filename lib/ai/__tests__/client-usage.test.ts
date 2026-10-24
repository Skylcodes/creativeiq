import { describe, expect, it } from "vitest";
import {
  addClaudeUsage,
  emptyClaudeUsage,
  formatClaudeUsage,
  totalInputTokens,
  usageFromAnthropic,
} from "@/lib/ai/client";

describe("Claude usage helpers", () => {
  it("sums Anthropic usage fields including cache write/read", () => {
    const first = usageFromAnthropic({
      input_tokens: 200,
      output_tokens: 800,
      cache_creation_input_tokens: 12_000,
      cache_read_input_tokens: 0,
    });
    const second = usageFromAnthropic({
      input_tokens: 180,
      output_tokens: 700,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 12_000,
    });
    const total = addClaudeUsage(addClaudeUsage(emptyClaudeUsage(), first), second);

    expect(total.calls).toBe(2);
    expect(total.inputTokens).toBe(380);
    expect(total.cacheCreationTokens).toBe(12_000);
    expect(total.cacheReadTokens).toBe(12_000);
    expect(total.outputTokens).toBe(1_500);
    expect(totalInputTokens(total)).toBe(24_380);
    expect(formatClaudeUsage("scoring.split an_x", total)).toBe(
      "[worker] claude-usage scoring.split an_x calls=2 in=380 cacheWrite=12000 cacheRead=12000 out=1500 totalIn=24380"
    );
  });
});
