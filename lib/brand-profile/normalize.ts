import type { BrandProfile } from "@/lib/types/report";

/** Backfill new fields on profiles saved before the schema expansion. */
export function normalizeLegacyProfile(profile: BrandProfile): BrandProfile {
  const coreValuePropositions =
    profile.coreValuePropositions?.length > 0
      ? profile.coreValuePropositions
      : profile.valueProposition
        ? [profile.valueProposition]
        : [];

  return {
    ...profile,
    coreValuePropositions,
    valueProposition: profile.valueProposition || coreValuePropositions[0] || "",
    pricePointSignals: profile.pricePointSignals || profile.pricePositioning || "unknown",
    socialProofAvailability: profile.socialProofAvailability || "unknown",
    offerStructure: profile.offerStructure || "unknown",
    targetCustomerAgeRange: profile.targetCustomerAgeRange || "",
    targetCustomerPainPoints: profile.targetCustomerPainPoints ?? [],
    targetCustomerDesires: profile.targetCustomerDesires ?? [],
    offerGuarantee: profile.offerGuarantee || "",
    offerKeyElements: profile.offerKeyElements ?? [],
    notableClaims: profile.notableClaims ?? profile.differentiators ?? [],
    rawScrapedContent: profile.rawScrapedContent || "",
  };
}
