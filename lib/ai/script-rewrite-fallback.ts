import "server-only";

import { callClaude, CLAUDE_JSON_MODEL } from "@/lib/ai/client";
import { SCRIPT_REWRITE_EXPERTISE } from "@/lib/ai/prompts";
import {
  extractScriptRewriteFromAgent,
  isValidScriptRewrite,
  resolveScriptRewrite,
  sanitizeScriptRewrite,
} from "@/lib/report/script-rewrite";
import type { HookVariant } from "@/lib/types/report";

const SCRIPT_REWRITE_FALLBACK_SYSTEM = `You write full spoken ad scripts for DTC performance marketers.

${SCRIPT_REWRITE_EXPERTISE}

OUTPUT FORMAT:
- Write ONLY the deliverable — no preamble, no analysis, no markdown headers.
- NEVER write market commentary (e.g. "Winning ad in this niche", "Creator-led UGC debunking", format briefs). Write words the creator SPEAKS on camera.
- First lines: the full spoken script (80–150 words): hook → body → proof → offer → CTA.
- Final line ONLY: Production note: [format]. [visual style]. Opening frame: [first 2 seconds].
- Never output only a production note. Never end mid-sentence.`;

type GenerateScriptRewriteInput = {
  synthesis?: string;
  drCritic: string;
  drRewriteSeed?: string;
  hookVariants?: HookVariant[];
  creativeContext: string;
  platformText: string;
  brandProfileText: string;
};

/**
 * Ensures a full script rewrite exists — uses synthesis/DR seed first, then a
 * focused Claude call when the funnel JSON omitted or truncated the script.
 */
export async function ensureScriptRewrite(
  input: GenerateScriptRewriteInput
): Promise<string> {
  const resolved = resolveScriptRewrite({
    synthesis: input.synthesis,
    drCritic: input.drCritic,
    drRewriteSeed: input.drRewriteSeed,
    hookVariants: input.hookVariants,
  });

  if (resolved) return resolved;

  const topHook = [...(input.hookVariants ?? [])]
    .sort((a, b) => a.rank - b.rank)[0];

  const drSeed =
    input.drRewriteSeed?.trim() ||
    extractScriptRewriteFromAgent(input.drCritic);

  const generated = await callClaude({
    system: SCRIPT_REWRITE_FALLBACK_SYSTEM,
    prompt: [
      "The funnel report synthesis failed to produce a valid full script rewrite.",
      "Write a complete new script for THIS brand and THIS creative context.",
      "",
      `Platform: ${input.platformText}`,
      "",
      "=== BRAND PROFILE ===",
      input.brandProfileText.slice(0, 2500),
      "",
      "=== CREATIVE CONTEXT ===",
      input.creativeContext.slice(0, 3000),
      "",
      ...(topHook
        ? ["=== TOP RECOMMENDED HOOK (use or beat this opening) ===", `"${topHook.hook}"`, ""]
        : []),
      ...(drSeed
        ? [
            "=== DR CRITIC REWRITE SEED (extend this voice — do not replace with generic copy) ===",
            drSeed.slice(0, 1500),
            "",
          ]
        : []),
      "=== DR CRITIC ANALYSIS (for strategic direction) ===",
      input.drCritic.slice(0, 2000),
      "",
      "Write the full spoken script now, then one Production note line.",
    ].join("\n"),
    maxTokens: 1200,
    temperature: 0.75,
    model: CLAUDE_JSON_MODEL,
  });

  const trimmed = sanitizeScriptRewrite(generated);
  if (isValidScriptRewrite(trimmed)) {
    return trimmed;
  }

  return "";
}
