import type { BrandProfile } from "@/lib/types/report";

/** Fields stored on the profile but never needed in agent prompts (already distilled). */
const PROMPT_OMIT_KEYS = ["rawScrapedContent", "manualDescription"] as const;

/**
 * Serializes brand profile for LLM context without redundant raw scrape text
 * (~2K tokens saved per call when multiplied across the pipeline).
 */
export function formatBrandProfileForPrompt(profile: BrandProfile): string {
  const slim = { ...profile } as Record<string, unknown>;
  for (const key of PROMPT_OMIT_KEYS) {
    delete slim[key];
  }

  const contextHeader = [
    profile.category ? `Product category: ${profile.category}` : "",
    profile.offerStructure ? `Offer structure: ${profile.offerStructure}` : "",
    profile.offerGuarantee ? `Stated guarantee / risk reversal: ${profile.offerGuarantee}` : "",
    profile.pricePointSignals ? `Price tier signals: ${profile.pricePointSignals}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!contextHeader) {
    return JSON.stringify(slim, null, 2);
  }

  return `${contextHeader}\n\n${JSON.stringify(slim, null, 2)}`;
}

/** Shorter landing page text for persona agents; conversion scorer gets the full page. */
export function truncateLandingPageForAgents(
  landingPageText: string,
  maxChars = 4000
): string {
  if (landingPageText.length <= maxChars) return landingPageText;
  return `${landingPageText.slice(0, maxChars).trim()}\n\n[Landing page truncated here — conversion scorer receives the full page.]`;
}
