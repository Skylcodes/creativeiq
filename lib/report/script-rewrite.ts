import type { HookVariant } from "@/lib/types/report";

const SECTION_STOP_RE =
  /\n\s*(?:\d+\.\s*)?(?:TOP WEAKNESS|CREATIVE VERDICT|HOOK REWRITES|VERDICT|KEY FINDINGS|ANGLE RECOMMENDATIONS)\b/i;

const REWRITE_HEADER_RE =
  /(?:^|\n)\s*(?:\d+\.\s*)?REWRITE:?\s*(?:\([^)\n]*\))?[\s\-—:]*/i;

/** Market/analysis copy that sometimes leaks into scriptRewrite from synthesis. */
const META_SCRIPT_PATTERNS = [
  /^\*\*[^*]+\*\*:?/,
  /winning ad in this niche/i,
  /be first in line when we open the doors/i,
  /no credit card\.\s*no commitment/i,
  /just early access to funnel intelligence/i,
  /credibility anchor/i,
  /creator-led ugc/i,
  /\bfast cuts,?\s+(?:desk|work)/i,
  /^\[.+\]\s*—\s*hook:/i,
  /competitor(?:s)? (?:in this|are running)/i,
  /scaled advertisers in this niche/i,
  /pattern interrupt energy/i,
  /^\s*format:\s/i,
  /opening (?:frame|visual):\s/i,
];

const WAITLIST_SCRIPT_BLOCK_RE =
  /^(?:\*\*[^*]+\*\*:?\s*)?(?:Be first in line when we open the doors\.\s*)?(?:No credit card\.\s*No commitment\.\s*)?(?:Just early access to funnel intelligence before you spend on ads\.\s*)+/i;

const MIN_SPOKEN_WORDS = 50;

/** Remove marketing / waitlist preambles that leak into scriptRewrite. */
export function sanitizeScriptRewrite(text: string): string {
  let trimmed = text.trim();
  if (!trimmed) return "";

  trimmed = trimmed.replace(WAITLIST_SCRIPT_BLOCK_RE, "").trim();

  for (let i = 0; i < 4; i += 1) {
    const next = trimmed
      .replace(
        /^(?:\*\*[^*]+\*\*:?|Be first in line[^\n]*|No credit card[^\n]*|Just early access[^\n]*)\s*\n?/i,
        ""
      )
      .trim();
    if (next === trimmed) break;
    trimmed = next;
  }

  return trimmed;
}

/** Spoken script body without production note, labels, or marketing preambles. */
export function spokenScriptBody(text: string): string {
  return sanitizeScriptRewrite(text)
    .replace(/^REWRITE:\s*/i, "")
    .replace(/\n*Production note:[\s\S]*$/i, "")
    .trim();
}

function scriptWordCount(text: string): number {
  return spokenScriptBody(text).split(/\s+/).filter(Boolean).length;
}

function isTruncatedScript(body: string): boolean {
  const trimmed = body.trim();
  if (!trimmed) return true;

  // Ends mid-phrase — classic token-limit truncation
  if (/\b(and|or|the|a|an|with|for|to|in|on|at|that|this)\s+a?\s*$/i.test(trimmed)) {
    return true;
  }
  if (/[,;:\-—]\s*$/.test(trimmed)) return true;

  const words = scriptWordCount(trimmed);
  const lastLine = trimmed.split("\n").pop()?.trim() ?? "";
  const endsCleanly = /[.!?"']$/.test(lastLine);

  // Short body without a finished sentence is almost always truncated synthesis
  if (words < 70 && !endsCleanly) return true;

  return false;
}

function looksLikeMarketAnalysis(body: string): boolean {
  const trimmed = body.trim();
  if (!trimmed) return true;

  const hits = META_SCRIPT_PATTERNS.filter((p) => p.test(trimmed)).length;
  if (hits >= 1 && scriptWordCount(trimmed) < 80) return true;
  if (hits >= 2) return true;

  // Descriptive third-person brief with no spoken lines
  const hasDialogue =
    /\b(I'|I'm|I've|I'd|my |you |your |we're |we've )\b/i.test(body) ||
    /"[^"]{12,}"/.test(body);
  const hasBriefingTone =
    /\b(debunking|anchor|fast cuts|desk\/work|niche right now|creator-led)\b/i.test(
      body
    );

  return hasBriefingTone && !hasDialogue;
}

/** Spoken script body must be a complete deliverable — not analysis or a truncated fragment. */
export function isValidScriptRewrite(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const body = spokenScriptBody(trimmed);
  const words = scriptWordCount(trimmed);

  if (words < MIN_SPOKEN_WORDS) return false;
  if (/^production note:/i.test(trimmed) && words < 20) return false;
  if (isTruncatedScript(body)) return false;
  if (looksLikeMarketAnalysis(body)) return false;

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

function pickBestCandidate(candidates: string[]): string {
  const unique = [...new Set(candidates.map((c) => c.trim()).filter(Boolean))];

  for (const candidate of unique) {
    if (isValidScriptRewrite(candidate)) {
      return candidate.trim();
    }
  }

  return "";
}

/**
 * Picks the best full script rewrite, rejecting production-note-only outputs,
 * market-analysis leaks, and token-truncated fragments.
 */
export function resolveScriptRewrite(input: ResolveScriptRewriteInput): string {
  const seed =
    input.drRewriteSeed?.trim() || extractScriptRewriteFromAgent(input.drCritic);

  const candidates = [input.synthesis?.trim(), seed]
    .map((c) => (c ? sanitizeScriptRewrite(c) : c))
    .filter(Boolean) as string[];

  const resolved = pickBestCandidate(candidates);
  if (resolved) return resolved;

  // Only accept seed alone when it is a complete spoken script
  if (seed) {
    const cleaned = sanitizeScriptRewrite(seed);
    if (cleaned && isValidScriptRewrite(cleaned)) {
      return cleaned.trim();
    }
  }

  return "";
}
