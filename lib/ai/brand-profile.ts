import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaudeJSON } from "@/lib/ai/client";
import { isScrapeContentSufficient, scrapePage } from "@/lib/ai/scrape";
import { normalizeLegacyProfile } from "@/lib/brand-profile/normalize";
import type {
  BrandProfile,
  BrandProfileProgress,
} from "@/lib/types/report";
import type { Workspace } from "@/lib/types/workspace";

export const BRAND_PROGRESS_STEPS = {
  scrape: { message: "Crawling your website…", percent: 20 },
  read: { message: "Reading your product pages…", percent: 45 },
  customer: { message: "Identifying your target customer…", percent: 65 },
  synthesize: { message: "Building your brand profile…", percent: 85 },
  done: { message: "Almost ready…", percent: 100 },
} as const;

const BRAND_SYSTEM = `You are a brand strategist. Given raw text scraped from a company's website (and its name/URL), extract a concise, accurate brand profile. Be specific and avoid generic filler. If information is missing, infer conservatively from context and never fabricate specific claims (prices, stats, testimonials).

Return ONLY a JSON object with exactly these keys:
{
  "brandName": string,
  "oneLiner": string,
  "category": string,
  "coreValuePropositions": string[],
  "productsServices": string[],
  "targetCustomer": string,
  "targetCustomerAgeRange": string,
  "targetCustomerPainPoints": string[],
  "targetCustomerDesires": string[],
  "pricePointSignals": string,
  "socialProofAvailability": string,
  "offerStructure": string,
  "offerGuarantee": string,
  "offerKeyElements": string[],
  "notableClaims": string[],
  "toneOfVoice": string,
  "differentiators": string[],
  "pricePositioning": string
}`;

const MANUAL_BRAND_SYSTEM = `You are a brand strategist. The user could not scrape their website, so they described their brand manually. Extract a structured brand profile from their description. Be specific. Do not invent claims they didn't imply.

Return ONLY a JSON object with exactly these keys:
{
  "brandName": string,
  "oneLiner": string,
  "category": string,
  "coreValuePropositions": string[],
  "productsServices": string[],
  "targetCustomer": string,
  "targetCustomerAgeRange": string,
  "targetCustomerPainPoints": string[],
  "targetCustomerDesires": string[],
  "pricePointSignals": string,
  "socialProofAvailability": string,
  "offerStructure": string,
  "offerGuarantee": string,
  "offerKeyElements": string[],
  "notableClaims": string[],
  "toneOfVoice": string,
  "differentiators": string[],
  "pricePositioning": string
}`;

type RawBrandFields = Omit<
  BrandProfile,
  "url" | "partial" | "generatedFrom" | "rawScrapedContent" | "valueProposition" | "manualDescription"
>;

function isScrapeInsufficient(scrape: Awaited<ReturnType<typeof scrapePage>>): boolean {
  return !isScrapeContentSufficient(scrape);
}

async function setProgress(
  supabase: SupabaseClient,
  workspaceId: string,
  progress: BrandProfileProgress,
  status: Workspace["brand_profile_status"] = "processing"
) {
  await supabase
    .from("workspaces")
    .update({
      brand_profile_status: status,
      brand_profile_progress: progress,
    })
    .eq("id", workspaceId);
}

function buildProfile(
  raw: RawBrandFields,
  workspace: Workspace,
  opts: {
    rawScrapedContent: string;
    partial: boolean;
    generatedFrom: BrandProfile["generatedFrom"];
    manualDescription?: string;
  }
): BrandProfile {
  const coreValuePropositions = raw.coreValuePropositions?.length
    ? raw.coreValuePropositions
    : raw.differentiators?.slice(0, 3) ?? [];

  return {
    brandName: raw.brandName || workspace.name,
    url: workspace.brand_url,
    category: raw.category || "unknown",
    oneLiner: raw.oneLiner || `${workspace.name}`,
    coreValuePropositions,
    valueProposition: coreValuePropositions[0] ?? raw.oneLiner ?? "",
    productsServices: raw.productsServices ?? [],
    targetCustomer: raw.targetCustomer || "unknown",
    targetCustomerAgeRange: raw.targetCustomerAgeRange || "",
    targetCustomerPainPoints: raw.targetCustomerPainPoints ?? [],
    targetCustomerDesires: raw.targetCustomerDesires ?? [],
    pricePointSignals: raw.pricePointSignals || raw.pricePositioning || "unknown",
    socialProofAvailability: raw.socialProofAvailability || "unknown",
    offerStructure: raw.offerStructure || "unknown",
    offerGuarantee: raw.offerGuarantee || "",
    offerKeyElements: raw.offerKeyElements ?? [],
    notableClaims: raw.notableClaims ?? raw.differentiators ?? [],
    toneOfVoice: raw.toneOfVoice || "unknown",
    differentiators: raw.differentiators ?? [],
    pricePositioning: raw.pricePositioning || "unknown",
    rawScrapedContent: opts.rawScrapedContent,
    manualDescription: opts.manualDescription,
    partial: opts.partial,
    generatedFrom: opts.generatedFrom,
  };
}

/**
 * Full onboarding brand profile generation with live progress updates.
 * Sets workspace status to manual_required if scrape is insufficient.
 */
export async function runBrandProfileGeneration(
  supabase: SupabaseClient,
  workspace: Workspace
): Promise<void> {
  await setProgress(supabase, workspace.id, {
    step: "scrape",
    ...BRAND_PROGRESS_STEPS.scrape,
  });

  const scrape = await scrapePage(workspace.brand_url);

  if (isScrapeInsufficient(scrape)) {
    await supabase
      .from("workspaces")
      .update({
        brand_profile_status: "manual_required",
        brand_profile_error:
          scrape.error ??
          "We couldn't read enough content from your website. Please describe your brand below.",
        brand_profile_progress: {
          step: "manual",
          message: "We need your help to describe your brand",
          percent: 0,
        },
      })
      .eq("id", workspace.id);
    return;
  }

  await setProgress(supabase, workspace.id, {
    step: "read",
    ...BRAND_PROGRESS_STEPS.read,
  });

  const rawContent = scrape.asPromptText;

  await setProgress(supabase, workspace.id, {
    step: "customer",
    ...BRAND_PROGRESS_STEPS.customer,
  });

  await setProgress(supabase, workspace.id, {
    step: "synthesize",
    ...BRAND_PROGRESS_STEPS.synthesize,
  });

  let raw: RawBrandFields;
  try {
    raw = await callClaudeJSON<RawBrandFields>({
      system: BRAND_SYSTEM,
      prompt: `Brand name: ${workspace.name}\nWebsite: ${workspace.brand_url}\n\nScraped website content:\n${rawContent}`,
      maxTokens: 1600,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Brand profile generation failed.";
    await supabase
      .from("workspaces")
      .update({
        brand_profile_status: "manual_required",
        brand_profile_error: message,
        brand_profile_progress: {
          step: "manual",
          message: "We need your help to describe your brand",
          percent: 0,
        },
      })
      .eq("id", workspace.id);
    return;
  }

  const profile = buildProfile(raw, workspace, {
    rawScrapedContent: scrape.bodyText,
    partial: false,
    generatedFrom: "scrape",
  });

  await setProgress(supabase, workspace.id, {
    step: "done",
    ...BRAND_PROGRESS_STEPS.done,
  });

  await supabase
    .from("workspaces")
    .update({
      brand_profile: profile,
      brand_profile_generated_at: new Date().toISOString(),
      brand_profile_status: "complete",
      brand_profile_progress: {
        step: "done",
        ...BRAND_PROGRESS_STEPS.done,
      },
      brand_profile_error: null,
    })
    .eq("id", workspace.id);
}

/**
 * Saves a user-provided manual brand description when scraping failed.
 */
export async function saveManualBrandProfile(
  supabase: SupabaseClient,
  workspace: Workspace,
  manualDescription: string
): Promise<BrandProfile> {
  const trimmed = manualDescription.trim();
  if (trimmed.length < 50) {
    throw new Error("Please provide at least 50 characters describing your brand.");
  }

  await setProgress(
    supabase,
    workspace.id,
    { step: "synthesize", message: "Building your brand profile…", percent: 85 },
    "processing"
  );

  const raw = await callClaudeJSON<RawBrandFields>({
    system: MANUAL_BRAND_SYSTEM,
    prompt: `Brand name: ${workspace.name}\nWebsite: ${workspace.brand_url}\n\nUser description:\n${trimmed}`,
    maxTokens: 1600,
  });

  const profile = buildProfile(raw, workspace, {
    rawScrapedContent: "",
    partial: true,
    generatedFrom: "manual",
    manualDescription: trimmed,
  });

  await supabase
    .from("workspaces")
    .update({
      brand_profile: profile,
      brand_profile_generated_at: new Date().toISOString(),
      brand_profile_status: "complete",
      brand_profile_progress: {
        step: "done",
        ...BRAND_PROGRESS_STEPS.done,
      },
      brand_profile_error: null,
    })
    .eq("id", workspace.id);

  return profile;
}

/** Returns cached profile or throws if missing/incomplete. */
export async function getOrGenerateBrandProfile(
  supabase: SupabaseClient,
  workspace: Workspace
): Promise<BrandProfile> {
  if (workspace.brand_profile?.brandName) {
    return normalizeLegacyProfile(workspace.brand_profile);
  }

  throw new Error(
    "Brand profile not found for this workspace. Complete onboarding first."
  );
}

export { normalizeLegacyProfile } from "@/lib/brand-profile/normalize";
