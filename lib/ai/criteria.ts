import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaudeJSON } from "@/lib/ai/client";
import type { IntelligenceBrief } from "@/lib/types/report";

// ---------------------------------------------------------------------------
// Static universal performance criteria — hardcoded, zero cost, always present.
// Written as binary yes/no checks at a concrete, repeatable level.
// ---------------------------------------------------------------------------

export type RawCriteria = {
  id: string;
  category: "creative" | "landing_page" | "dynamic";
  label: string;
  appliesWhen: string;
};

export const STATIC_CRITERIA: RawCriteria[] = [
  // Creative criteria
  {
    id: "C1",
    category: "creative",
    label: "Hook states the core benefit or outcome within the first line or first 3 seconds",
    appliesWhen: "Direct, lead, sale, launch, or retargeting clarity.",
  },
  {
    id: "C2",
    category: "creative",
    label: "Specific quantified proof (stat, result) in the ad — only when the ad makes a claim that needs backing",
    appliesWhen: "Hard proof-led claims only. In-ad social proof is optional — mark N/A for UGC, story, intrigue, awareness.",
  },
  {
    id: "C3",
    category: "creative",
    label: "CTA appears with enough time remaining for the viewer to act on it — not only at the very final frame",
    appliesWhen: "Immediate click, signup, purchase, or return visit.",
  },
  {
    id: "C4",
    category: "creative",
    label: "When the ad's job is to sell a specific deal, that deal (discount, bundle, deadline) is stated explicitly — not whether price is shown",
    appliesWhen: "Promote-sale or offer-led ads only. In-ad price omission is normal — mark N/A otherwise.",
  },
  {
    id: "C5",
    category: "creative",
    label: "Opening stops scroll with platform-native energy — not brand logo-first",
    appliesWhen: "Cold-feed attention. Common hook templates are fine if execution works.",
  },
  {
    id: "C6",
    category: "creative",
    label: "Core claim is believable for this price point — no miracle language without supporting proof",
    appliesWhen: "Performance, transformation, savings, or efficacy claims.",
  },
  {
    id: "C7",
    category: "creative",
    label: "Creative retains attention past 3 seconds — has a curiosity loop, tension, or reason to keep watching/reading",
    appliesWhen: "Feed, short-form, or video retention.",
  },
  {
    id: "C8",
    category: "creative",
    label: "Format matches the platform natively (UGC-style for TikTok; proof-in-same-frame density for Meta feed)",
    appliesWhen: "Platform-native attention and trust.",
  },
  {
    id: "C9",
    category: "creative",
    label: "Script/copy uses conversational, human language — avoids corporate tone and generic superlatives",
    appliesWhen: "Social, UGC, creator, or cold-feed credibility.",
  },
  {
    id: "C10",
    category: "creative",
    label: "The ad's single angle or promise is executed completely — hook, body, and CTA all serve the same message",
    appliesWhen: "Single-angle execution; not alternate angles.",
  },
  // Landing page criteria
  {
    id: "L1",
    category: "landing_page",
    label: "LP headline delivers on this ad's specific promise or outcome (not just the brand's general value prop)",
    appliesWhen: "Specific promise, outcome, product, or offer.",
  },
  {
    id: "L2",
    category: "landing_page",
    label: "Primary social proof (reviews, ratings, or user count) visible above the fold",
    appliesWhen: "LP trust check — recommend when missing; light score deduction only, not a blocker.",
  },
  {
    id: "L3",
    category: "landing_page",
    label: "When the ad promised a specific deal or price, the LP shows that same deal without hunting for it",
    appliesWhen: "Ad explicitly promised a deal/price. Not when the ad never mentioned price.",
  },
  {
    id: "L4",
    category: "landing_page",
    label: "The main purchase objection for this product's price tier and category is addressed somewhere on the page",
    appliesWhen: "Real buyer doubt for THIS product type (efficacy, safety, value, fit). Not generic policy templates.",
  },
  {
    id: "L5",
    category: "landing_page",
    label: "CTA button text is specific to the offer — not just generic 'Shop Now' with no context",
    appliesWhen: "Click, signup, purchase, demo, or lead page.",
  },
  {
    id: "L6",
    category: "landing_page",
    label: "LP fulfills the concrete expectation created by the ad — no contradiction or missing promised offer, product, claim, or guarantee",
    appliesWhen: "Specific click expectation; not angle/style matching.",
  },
  {
    id: "L7",
    category: "landing_page",
    label: "Category-appropriate risk reduction is present OR the page addresses the main purchase doubt for this product type (proof, guarantee language, expert endorsement, satisfaction terms — not necessarily physical returns)",
    appliesWhen: "Risk-based purchase doubt for this category. Mark N/A for consumables/supplements/perishables/digital when physical returns are unrealistic unless missing trust creates real harm.",
  },
  {
    id: "L8",
    category: "landing_page",
    label: "Product mechanism or key outcome is briefly explained so a new visitor understands what they're buying",
    appliesWhen: "New, technical, considered, or claim-led products.",
  },
];

// ---------------------------------------------------------------------------
// Dynamic criteria generation — one small Haiku call at brief-build time.
// Produces 2–4 category-specific items; cached alongside the intelligence brief.
// ---------------------------------------------------------------------------

const DYNAMIC_CRITERIA_PROMPT = `You are reviewing real-world market intelligence for a specific product category and platform.
Extract exactly 3 CATEGORY-SPECIFIC performance criteria that are NOT already covered by universal DTC best-practices.
Focus on what the research reveals about THIS category's unique buyer psychology, objection patterns, or proof requirements.
Do NOT generate generic ecommerce checklist items (e.g. "30-day return policy", "free returns", "money-back guarantee") unless the research shows they are a category-specific conversion requirement — many categories use different trust mechanics.
Each criterion must be a binary yes/no check — specific enough to evaluate from reading the actual ad copy and landing page.
Each criterion must include an appliesWhen condition explaining what kind of ad goal, format, or buyer situation makes it relevant.

Research input:
{RESEARCH}

Return ONLY JSON:
{
  "criteria": [
    { "label": "one sentence binary criterion", "appliesWhen": "short relevance condition" },
    { "label": "one sentence binary criterion", "appliesWhen": "short relevance condition" },
    { "label": "one sentence binary criterion", "appliesWhen": "short relevance condition" }
  ]
}

Rules: no generic criteria (e.g. "Is the ad engaging?" is INVALID). Must be specific to this category. Label under 20 words. appliesWhen under 14 words. Valid JSON only.`;

async function generateDynamicCriteria(brief: IntelligenceBrief): Promise<RawCriteria[]> {
  const research = [
    brief.categoryConversion ? `Category conversion patterns: ${brief.categoryConversion.slice(0, 400)}` : "",
    brief.customerFrustrations ? `Customer frustrations: ${brief.customerFrustrations.slice(0, 300)}` : "",
    brief.nicheSophistication ? `Buyer psychology: ${brief.nicheSophistication.slice(0, 300)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!research) return [];

  try {
    const result = await callClaudeJSON<{ criteria: { label: string; appliesWhen?: string }[] }>({
      system: "Extract specific, binary evaluation criteria from market research. Return valid JSON only.",
      prompt: DYNAMIC_CRITERIA_PROMPT.replace("{RESEARCH}", research),
      maxTokens: 300,
      temperature: 0.2,
    });

    return (result.criteria ?? [])
      .slice(0, 4)
      .filter((c) => c.label && c.label.length > 10)
      .map((c, i) => ({
        id: `D${i + 1}`,
        category: "dynamic" as const,
        label: c.label.trim(),
        appliesWhen:
          c.appliesWhen?.trim() ||
          "When this category-specific buyer concern is central to the ad's chosen job.",
      }));
  } catch {
    return [];
  }
}

const STATIC_CRITERIA_BY_ID = new Map(STATIC_CRITERIA.map((criterion) => [criterion.id, criterion]));

function normalizeCriteria(criteria: RawCriteria[]): RawCriteria[] {
  return criteria.map((criterion) => {
    const staticCriterion = STATIC_CRITERIA_BY_ID.get(criterion.id);
    if (staticCriterion) {
      return staticCriterion;
    }

    return {
      ...criterion,
      appliesWhen:
        criterion.appliesWhen?.trim() ||
        "When this category-specific buyer concern is central to the ad's chosen job.",
    };
  });
}

// ---------------------------------------------------------------------------
// Cache: stored inside intelligence_cache JSON alongside the brief.
// Key suffix ":criteria:v1" distinguishes from the brief key.
// No new DB columns needed.
// ---------------------------------------------------------------------------

const CRITERIA_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function criteriaCacheKey(workspaceId: string, category: string): string {
  return `${workspaceId}:${category.toLowerCase().trim()}:criteria:v1`;
}

export type CriteriaCache = {
  key: string;
  criteria: RawCriteria[];
  generatedAt: string;
};

export async function getOrBuildCriteria(
  supabase: SupabaseClient,
  workspaceId: string,
  brief: IntelligenceBrief | null
): Promise<RawCriteria[]> {
  const category = brief?.category ?? "";
  const key = criteriaCacheKey(workspaceId, category);

  // Check workspace criteria cache
  try {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("criteria_cache, criteria_cache_updated_at")
      .eq("id", workspaceId)
      .single();

    if (ws?.criteria_cache && ws.criteria_cache_updated_at) {
      const age = Date.now() - new Date(ws.criteria_cache_updated_at).getTime();
      const cached = ws.criteria_cache as { key?: string; criteria?: RawCriteria[] };
      if (age < CRITERIA_CACHE_TTL_MS && cached?.key === key && Array.isArray(cached?.criteria)) {
        return normalizeCriteria(cached.criteria);
      }
    }
  } catch {
    // Cache miss — proceed
  }

  // Build: static base + dynamic additions from brief
  const dynamic = brief ? await generateDynamicCriteria(brief) : [];
  const full: RawCriteria[] = normalizeCriteria([...STATIC_CRITERIA, ...dynamic]);

  // Persist
  try {
    await supabase
      .from("workspaces")
      .update({
        criteria_cache: { key, criteria: full },
        criteria_cache_updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId);
  } catch {
    // Non-fatal
  }

  return full;
}

// ---------------------------------------------------------------------------
// Format criteria for injection into agent cachedContext.
// Kept compact and cache-friendly; no extra model call is needed per analysis.
// ---------------------------------------------------------------------------

export function formatCriteriaForContext(criteria: RawCriteria[], creativeGoalLabel?: string): string {
  const creative = criteria.filter((c) => c.category === "creative");
  const lp = criteria.filter((c) => c.category === "landing_page");
  const dynamic = criteria.filter((c) => c.category === "dynamic");

  const lines: string[] = [
    "=== PERFORMANCE CRITERIA CHECKLIST ===",
    creativeGoalLabel ? `Selected creative goal: ${creativeGoalLabel}` : "",
    "Gate each item: PASS=applies+met. FAIL=applies+specific harm. N/A=not needed for this goal/format/category/brand strategy. Never criticize or score down N/A items.",
    "Before failing L4 or L7: read brand profile category, offerGuarantee, and offerStructure. Do not fail for missing generic return/guarantee language when the product category or brand uses a different trust model.",
    "After confirming pass=false, classify severity internally (critical/moderate/minor) using CATEGORY TOLERANCE SIGNALS when present — severity drives score weight, not raw fail count.",
    "IN-AD PRICE IS NOT A QUALITY FACTOR: omitting price in the creative is normal DTC practice and never makes an ad good or bad. Do not FAIL C4 or dock creativeStrengthScore for missing price unless the ad explicitly promised a specific deal and failed to state it.",
    "IN-AD SOCIAL PROOF IS NOT REQUIRED: testimonials, review counts, and stat stacks belong on the LP. Do not FAIL C2 or dock creativeStrengthScore for missing in-ad proof.",
    "COMMON HOOKS ARE FINE: do not FAIL or dock for familiar TikTok/Reels openers — judge execution, not novelty.",
    "",
    "CREATIVE:",
    ...creative.map((c) => `${c.id}. ${c.label} [when: ${c.appliesWhen}]`),
    "",
    "LANDING PAGE:",
    ...lp.map((c) => `${c.id}. ${c.label} [when: ${c.appliesWhen}]`),
  ];

  if (dynamic.length > 0) {
    lines.push("", "CATEGORY-SPECIFIC:");
    dynamic.forEach((c) => lines.push(`${c.id}. ${c.label} [when: ${c.appliesWhen}]`));
  }

  lines.push(
    "",
    "CONTRADICTION RULE: Before finalizing recommendations, verify no action says to add something that another action says to remove. If two recommendations conflict on the same element, keep the one best supported by the checklist evidence above and drop the other.",
    "=== END CRITERIA ===" 
  );

  return lines.join("\n");
}
