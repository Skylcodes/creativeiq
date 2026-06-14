import type { HookVariant } from "@/lib/types/report";

const SECTION_STOP_RE =
  /\n\s*(?:\d+\.\s*)?(?:TOP WEAKNESS|CREATIVE VERDICT|HOOK REWRITES|VERDICT|KEY FINDINGS|ANGLE RECOMMENDATIONS)\b/i;

const REWRITE_HEADER_RE =
  /(?:^|\n)\s*(?:\d+\.\s*)?REWRITE:?\s*(?:\([^)\n]*\))?[\s\-—:]*/i;

/** Spoken script body without production note or section labels. */
export function spokenScriptBody(text: string): string {
  return text
    .replace(/^REWRITE:\s*/i, "")
    .replace(/\n*Production note:[\s\S]*$/i, "")
    .trim();
}

/** Spoken script body must have substance — not just a production note. */
export function isValidScriptRewrite(text: string): boolean {
  const body = spokenScriptBody(text);
  const words = body.split(/\s+/).filter(Boolean).length;

  if (words < 25) return false;
  if (/^production note:/i.test(text.trim()) && words < 15) return false;

  return true;
}

function stripRewriteBoilerplate(text: string): string {
  return text
    .split("\n")
    .filter((line) => {
      const t = line.trim().toLowerCase();
      if (!t) return true;
      if (t.startsWith("write the complete spoken script")) return false;
      if (t.startsWith("(this section is the deliverable")) return false;
      if (t.startsWith("invalid rewrite:")) return false;
      if (t.startsWith("valid rewrite:")) return false;
      if (/^minimum \d+ words/.test(t)) return false;
      if (t === "rewrite:" || t === "rewrite") return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Extract the DR Critic's REWRITE block from free-form agent output. */
export function extractScriptRewriteFromAgent(drCriticRaw: string): string {
  const text = drCriticRaw.trim();
  if (!text) return "";

  const headerMatch = text.match(REWRITE_HEADER_RE);
  if (headerMatch && headerMatch.index !== undefined) {
    const start = headerMatch.index + headerMatch[0].length;
    let block = text.slice(start);
    const stop = block.match(SECTION_STOP_RE);
    if (stop?.index !== undefined) {
      block = block.slice(0, stop.index);
    }
    const cleaned = stripRewriteBoilerplate(block.trim());
    if (cleaned) return cleaned;
  }

  const continuation = text.match(
    /(?:exact rewritten opening|script continuation|full script)[:\s—-]*\n([\s\S]{80,}?)(?:\n\n|\n\s*(?:\d+\.\s*)?TOP WEAKNESS)/i
  );
  if (continuation?.[1]?.trim()) {
    return continuation[1].trim();
  }

  const quotedScript = text.match(/"([^"]{80,})"/);
  if (quotedScript?.[1]) {
    return quotedScript[1].trim();
  }

  return "";
}

export function extractDrRewriteSeed(drCriticRaw: string): string {
  return extractScriptRewriteFromAgent(drCriticRaw);
}

type ResolveScriptRewriteInput = {
  synthesis?: string;
  drCritic: string;
  drRewriteSeed?: string;
  hookVariants?: HookVariant[];
};

function wordCount(text: string): number {
  return spokenScriptBody(text).split(/\s+/).filter(Boolean).length;
}

function pickBestCandidate(candidates: string[]): string {
  const unique = [...new Set(candidates.map((c) => c.trim()).filter(Boolean))];

  for (const candidate of unique) {
    if (isValidScriptRewrite(candidate)) {
      return candidate.trim();
    }
  }

  const ranked = unique
    .map((c) => ({ text: c, words: wordCount(c) }))
    .filter((c) => c.words >= 20)
    .sort((a, b) => b.words - a.words);

  if (ranked[0]) return ranked[0].text.trim();

  return "";
}

/**
 * Picks the best full script rewrite, rejecting production-note-only outputs.
 */
export function resolveScriptRewrite(input: ResolveScriptRewriteInput): string {
  const seed =
    input.drRewriteSeed?.trim() || extractScriptRewriteFromAgent(input.drCritic);

  const candidates = [
    input.synthesis?.trim(),
    seed,
  ].filter(Boolean) as string[];

  const resolved = pickBestCandidate(candidates);
  if (resolved) return resolved;

  const topHook = [...(input.hookVariants ?? [])]
    .sort((a, b) => a.rank - b.rank)[0]?.hook?.trim();

  if (topHook && seed) {
    const seedBody = spokenScriptBody(seed);
    if (
      seedBody.toLowerCase().includes(topHook.toLowerCase().slice(0, 24)) ||
      wordCount(seed) >= 20
    ) {
      return seed.trim();
    }
  }

  return "";
}
