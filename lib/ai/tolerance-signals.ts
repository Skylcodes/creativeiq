import "server-only";
import type { CompetitorAd, ToleranceSignal } from "@/lib/types/report";

const PRICE_PATTERN =
  /\$[\d,.]+|\d+\s*%|\b(?:off|discount|save|deal|free shipping|buy one)\b/i;
const URGENCY_PATTERN =
  /\b(?:today only|limited|hurry|ends?|last chance|24 hours?|while supplies|act now|before (?:it's|its) gone)\b/i;
const SOCIAL_PROOF_PATTERN =
  /\b(?:review|rating|stars?|\d+k\+?\s+customers?|testimonial|verified|as seen on|#\d+\s+in)\b/i;
const QUANTIFIED_PROOF_PATTERN =
  /\d+\s*%|\d+x\b|clinical|study|proven|results in \d/i;
const HARD_CTA_PATTERN =
  /\b(?:shop now|buy now|get yours|order now|claim|sign up|download|tap to)\b/i;

function imperfectionPresent(ad: CompetitorAd, kind: ToleranceSignal["imperfection"]): boolean {
  const copy = `${ad.copySnippet} ${ad.headline ?? ""}`.trim();
  const cta = (ad.cta ?? "").toLowerCase();

  switch (kind) {
    case "no_in_ad_price":
      return !PRICE_PATTERN.test(copy);
    case "no_urgency":
      return !URGENCY_PATTERN.test(copy);
    case "minimal_in_ad_social_proof":
      return !SOCIAL_PROOF_PATTERN.test(copy);
    case "no_quantified_proof":
      return !QUANTIFIED_PROOF_PATTERN.test(copy);
    case "soft_cta":
      return !HARD_CTA_PATTERN.test(`${copy} ${cta}`);
    case "simple_production":
      return (
        Boolean(ad.formatSignals?.includes("UGC-native")) ||
        Boolean(ad.formatSignals?.includes("creator-voice")) ||
        copy.length < 140
      );
    case "no_text_overlay":
      // Copy-only signal: very short hook lines without instructional/educational framing
      return copy.split(/\n/)[0]?.trim().split(/\s+/).length <= 8;
    default:
      return false;
  }
}

const IMPERFECTION_LABELS: Record<ToleranceSignal["imperfection"], string> = {
  no_in_ad_price: "No visible price or deal stated in the ad copy",
  no_text_overlay: "Minimal or no on-screen text hook (spoken/visual-led open)",
  simple_production: "Simple, UGC-native, or unpolished production style",
  no_urgency: "No explicit urgency mechanism (deadline, scarcity, limited time)",
  minimal_in_ad_social_proof: "Little or no social proof shown directly in the creative",
  no_quantified_proof: "No quantified stat or hard proof in the ad copy",
  soft_cta: "Soft or implicit CTA rather than a hard direct-response close",
};

function prevalenceFromRate(rate: number): ToleranceSignal["prevalence"] {
  if (rate >= 0.55) return "commonly_tolerated";
  if (rate >= 0.28) return "inconsistent";
  return "rare_among_winners";
}

function evidenceLine(
  kind: ToleranceSignal["imperfection"],
  rate: number,
  poolSize: number,
  longRunnerCount: number
): string {
  const pct = Math.round(rate * 100);
  const label = IMPERFECTION_LABELS[kind].toLowerCase();
  if (longRunnerCount >= 2) {
    return `${pct}% of ${poolSize} high-signal Meta ads (${longRunnerCount} with 21+ day runtime) show ${label}.`;
  }
  return `${pct}% of ${poolSize} high-signal Meta ads in library data show ${label}.`;
}

/** Deterministic tolerance extraction from scraped competitor ads — no extra AI call. */
export function buildToleranceSignalsFromAds(ads: CompetitorAd[]): ToleranceSignal[] {
  const highSignal = ads.filter((a) => a.qualitySignal === "high");
  const pool =
    highSignal.length >= 3
      ? highSignal
      : ads.filter((a) => a.qualitySignal !== "low");
  if (pool.length < 2) return [];

  const longRunners = pool.filter((a) => (a.runningDays ?? 0) >= 21);
  const kinds = Object.keys(IMPERFECTION_LABELS) as ToleranceSignal["imperfection"][];

  return kinds
    .map((kind) => {
      const presentCount = pool.filter((ad) => imperfectionPresent(ad, kind)).length;
      const rate = presentCount / pool.length;
      return {
        imperfection: kind,
        label: IMPERFECTION_LABELS[kind],
        prevalence: prevalenceFromRate(rate),
        evidence: evidenceLine(kind, rate, pool.length, longRunners.length),
      };
    })
    .filter((s) => s.prevalence !== "rare_among_winners" || pool.length >= 4);
}

const TAVILY_TOLERANCE_PATTERNS: {
  imperfection: ToleranceSignal["imperfection"];
  patterns: RegExp[];
  boost: "commonly_tolerated" | "inconsistent";
}[] = [
  {
    imperfection: "no_in_ad_price",
    patterns: [
      /successful ads.{0,40}(?:don'?t|without|omit|hide|skip).{0,30}price/i,
      /(?:no|without) price.{0,40}(?:still|perform|convert|work)/i,
    ],
    boost: "commonly_tolerated",
  },
  {
    imperfection: "minimal_in_ad_social_proof",
    patterns: [
      /(?:without|no|lack).{0,30}(?:social proof|testimonials|reviews).{0,40}(?:perform|work|convert)/i,
      /social proof.{0,30}(?:on the landing|landing page|lp)/i,
    ],
    boost: "commonly_tolerated",
  },
  {
    imperfection: "simple_production",
    patterns: [
      /ugc.{0,40}(?:perform|outperform|scale|win)/i,
      /(?:raw|unpolished|lo-?fi).{0,30}(?:perform|convert|work)/i,
    ],
    boost: "commonly_tolerated",
  },
  {
    imperfection: "no_urgency",
    patterns: [
      /(?:without|no) urgency.{0,40}(?:still|perform|convert)/i,
    ],
    boost: "inconsistent",
  },
];

/** Merge Tavily research text into tolerance signals when patterns support it. */
export function enrichToleranceFromResearch(
  signals: ToleranceSignal[],
  researchText: string
): ToleranceSignal[] {
  const combined = researchText.trim();
  if (!combined) return signals;

  const byKind = new Map(signals.map((s) => [s.imperfection, s]));

  for (const rule of TAVILY_TOLERANCE_PATTERNS) {
    if (!rule.patterns.some((p) => p.test(combined))) continue;

    const existing = byKind.get(rule.imperfection);
    if (existing) {
      if (
        existing.prevalence === "rare_among_winners" &&
        rule.boost === "commonly_tolerated"
      ) {
        existing.prevalence = "inconsistent";
        existing.evidence = `${existing.evidence} Public commentary also notes this pattern among performing ads.`;
      } else if (existing.prevalence === "inconsistent" && rule.boost === "commonly_tolerated") {
        existing.prevalence = "commonly_tolerated";
        existing.evidence = `${existing.evidence} Category research supports tolerance of this gap.`;
      }
    } else {
      byKind.set(rule.imperfection, {
        imperfection: rule.imperfection,
        label: IMPERFECTION_LABELS[rule.imperfection],
        prevalence: rule.boost,
        evidence: `Category research mentions successful ads tolerating: ${IMPERFECTION_LABELS[rule.imperfection].toLowerCase()}.`,
      });
    }
  }

  return [...byKind.values()];
}

export function formatToleranceSignalsForPrompt(signals: ToleranceSignal[]): string {
  if (!signals.length) return "";

  const lines = [
    "=== CATEGORY TOLERANCE SIGNALS (severity calibration — internal use) ===",
    "These show which checklist-style gaps appear even in long-running / high-signal competitor ads.",
    "Use when classifying severity of confirmed flaws — NOT to skip the relevance gate.",
    "",
  ];

  const tolerated = signals.filter((s) => s.prevalence === "commonly_tolerated");
  const mixed = signals.filter((s) => s.prevalence === "inconsistent");
  const rare = signals.filter((s) => s.prevalence === "rare_among_winners");

  if (tolerated.length) {
    lines.push("COMMONLY TOLERATED among successful ads (minor severity when confirmed relevant):");
    for (const s of tolerated) lines.push(`  • ${s.label} — ${s.evidence}`);
    lines.push("");
  }
  if (mixed.length) {
    lines.push("INCONSISTENT across successful ads (moderate severity when confirmed relevant):");
    for (const s of mixed) lines.push(`  • ${s.label} — ${s.evidence}`);
    lines.push("");
  }
  if (rare.length) {
    lines.push("RARE among successful ads (lean critical when confirmed relevant):");
    for (const s of rare) lines.push(`  • ${s.label} — ${s.evidence}`);
    lines.push("");
  }

  lines.push(
    "SEVERITY RULE: A confirmed relevant flaw that matches a COMMONLY TOLERATED pattern should cost minimal score — treat as nice-to-have polish.",
    "A flaw matching RARE among winners should weigh heavily unless this ad's specific mechanism of harm is weak.",
    "=== END TOLERANCE SIGNALS ==="
  );

  return lines.join("\n");
}
