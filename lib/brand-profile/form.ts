import type { BrandProfile } from "@/lib/types/report";

export type BrandProfileForm = {
  brandName: string;
  websiteUrl: string;
  category: string;
  toneOfVoice: string;
  coreValuePropositions: string[];
  targetCustomer: string;
  targetCustomerAgeRange: string;
  targetCustomerPainPoints: string[];
  targetCustomerDesires: string[];
  offerPricePoint: string;
  offerGuarantee: string;
  offerKeyElements: string[];
  socialProofAvailability: string;
  notableClaims: string[];
};

const UNKNOWN = new Set(["unknown", ""]);

function clean(value: string | undefined): string {
  if (!value || UNKNOWN.has(value.trim().toLowerCase())) return "";
  return value.trim();
}

function cleanList(values: string[] | undefined): string[] {
  return (values ?? []).map((v) => v.trim()).filter(Boolean);
}

function splitOfferStructure(offerStructure: string): string[] {
  const cleaned = clean(offerStructure);
  if (!cleaned) return [];
  return cleaned
    .split(/[,;•|\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function createEmptyBrandProfileForm(
  workspaceName: string,
  websiteUrl: string
): BrandProfileForm {
  return {
    brandName: workspaceName,
    websiteUrl,
    category: "",
    toneOfVoice: "",
    coreValuePropositions: [""],
    targetCustomer: "",
    targetCustomerAgeRange: "",
    targetCustomerPainPoints: [""],
    targetCustomerDesires: [""],
    offerPricePoint: "",
    offerGuarantee: "",
    offerKeyElements: [""],
    socialProofAvailability: "",
    notableClaims: [""],
  };
}

export function profileToForm(
  profile: BrandProfile,
  workspaceName: string,
  websiteUrl: string
): BrandProfileForm {
  const valueProps = cleanList(profile.coreValuePropositions);
  const painPoints = cleanList(profile.targetCustomerPainPoints);
  const desires = cleanList(profile.targetCustomerDesires);
  const offerElements = cleanList(profile.offerKeyElements);
  const claims = cleanList(profile.notableClaims);

  return {
    brandName: clean(profile.brandName) || workspaceName,
    websiteUrl: clean(profile.url) || websiteUrl,
    category: clean(profile.category),
    toneOfVoice: clean(profile.toneOfVoice),
    coreValuePropositions: valueProps.length ? valueProps : [""],
    targetCustomer: clean(profile.targetCustomer),
    targetCustomerAgeRange: clean(profile.targetCustomerAgeRange),
    targetCustomerPainPoints: painPoints.length ? painPoints : [""],
    targetCustomerDesires: desires.length ? desires : [""],
    offerPricePoint:
      clean(profile.pricePointSignals) || clean(profile.pricePositioning),
    offerGuarantee: clean(profile.offerGuarantee),
    offerKeyElements: offerElements.length
      ? offerElements
      : splitOfferStructure(profile.offerStructure).length
        ? splitOfferStructure(profile.offerStructure)
        : [""],
    socialProofAvailability: clean(profile.socialProofAvailability),
    notableClaims: claims.length
      ? claims
      : cleanList(profile.differentiators).length
        ? cleanList(profile.differentiators)
        : [""],
  };
}

export function formToProfile(
  form: BrandProfileForm,
  existing: BrandProfile | null,
  websiteUrl: string
): BrandProfile {
  const coreValuePropositions = cleanList(form.coreValuePropositions).slice(0, 8);
  const targetCustomerPainPoints = cleanList(form.targetCustomerPainPoints);
  const targetCustomerDesires = cleanList(form.targetCustomerDesires);
  const offerKeyElements = cleanList(form.offerKeyElements);
  const notableClaims = cleanList(form.notableClaims);

  const offerStructure =
    offerKeyElements.join(", ") ||
    existing?.offerStructure ||
    "unknown";

  return {
    brandName: form.brandName.trim(),
    url: websiteUrl,
    category: form.category.trim() || "unknown",
    oneLiner: existing?.oneLiner || form.brandName.trim(),
    coreValuePropositions,
    valueProposition: coreValuePropositions[0] ?? existing?.valueProposition ?? "",
    productsServices: existing?.productsServices ?? [],
    targetCustomer: form.targetCustomer.trim() || "unknown",
    targetCustomerAgeRange: form.targetCustomerAgeRange.trim(),
    targetCustomerPainPoints,
    targetCustomerDesires,
    pricePointSignals: form.offerPricePoint.trim() || "unknown",
    pricePositioning: form.offerPricePoint.trim() || existing?.pricePositioning || "unknown",
    socialProofAvailability:
      form.socialProofAvailability.trim() || "unknown",
    offerStructure,
    offerGuarantee: form.offerGuarantee.trim(),
    offerKeyElements,
    notableClaims,
    toneOfVoice: form.toneOfVoice.trim() || "unknown",
    differentiators: notableClaims.length
      ? notableClaims
      : existing?.differentiators ?? [],
    rawScrapedContent: existing?.rawScrapedContent ?? "",
    manualDescription: existing?.manualDescription,
    partial: existing?.partial ?? true,
    generatedFrom: existing?.generatedFrom ?? "manual",
  };
}

function normalizeListForCompare(values: string[]): string[] {
  return values.map((v) => v.trim()).filter(Boolean);
}

export function formsEqual(a: BrandProfileForm, b: BrandProfileForm): boolean {
  return JSON.stringify({
    ...a,
    coreValuePropositions: normalizeListForCompare(a.coreValuePropositions),
    targetCustomerPainPoints: normalizeListForCompare(a.targetCustomerPainPoints),
    targetCustomerDesires: normalizeListForCompare(a.targetCustomerDesires),
    offerKeyElements: normalizeListForCompare(a.offerKeyElements),
    notableClaims: normalizeListForCompare(a.notableClaims),
  }) === JSON.stringify({
    ...b,
    coreValuePropositions: normalizeListForCompare(b.coreValuePropositions),
    targetCustomerPainPoints: normalizeListForCompare(b.targetCustomerPainPoints),
    targetCustomerDesires: normalizeListForCompare(b.targetCustomerDesires),
    offerKeyElements: normalizeListForCompare(b.offerKeyElements),
    notableClaims: normalizeListForCompare(b.notableClaims),
  });
}

export function formatBrandProfileUpdatedAt(iso: string | null): string {
  if (!iso) return "Not yet saved";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
