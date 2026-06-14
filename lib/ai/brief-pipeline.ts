import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { callClaudeJSON } from "@/lib/ai/client";
import { getOrGenerateBrandProfile } from "@/lib/ai/brand-profile";
import { formatBrandProfileForPrompt } from "@/lib/ai/brand-profile-prompt";
import { buildIntelligenceBrief, formatIntelligenceForPrompt } from "@/lib/ai/intelligence";
import { captureHooksFromBrief } from "@/lib/hooks/capture";
import {
  BRIEF_ANGLE_OPTIONS_SYSTEM,
  BRIEF_FULL_GENERATION_SYSTEM,
} from "@/lib/ai/prompts";
import {
  AD_BUDGETS,
  AUDIENCE_TEMPERATURES,
  BRIEF_GOALS,
  BRIEF_PLATFORMS,
  PRODUCTION_RESOURCES,
  isStaticCreative,
} from "@/lib/briefs/constants";
import type {
  BriefAngleOption,
  BriefWizardInput,
  CreativeBrief,
  CreativeBriefDocument,
} from "@/lib/types/brief";
import type { Workspace } from "@/lib/types/workspace";

function labelFor<T extends { id: string; label: string }>(
  list: readonly T[],
  id: string
): string {
  return list.find((x) => x.id === id)?.label ?? id;
}

function buildInputContext(
  input: BriefWizardInput,
  brandProfileText: string,
  intelligenceBriefText?: string
): string {
  const staticCreative = isStaticCreative(input.creativeDuration);
  const sections = [
    "=== BRAND PROFILE ===",
    brandProfileText,
    "",
    "=== CAMPAIGN BRIEF INPUTS ===",
    `Campaign goal: ${labelFor(BRIEF_GOALS, input.goal)}`,
    `Platform: ${labelFor(BRIEF_PLATFORMS, input.platform)}`,
    `Audience temperature: ${labelFor(AUDIENCE_TEMPERATURES, input.audienceTemperature)}`,
    input.audienceNotes?.trim()
      ? `Audience notes: ${input.audienceNotes.trim()}`
      : "",
    `Production resources: ${labelFor(PRODUCTION_RESOURCES, input.productionResource)}`,
    `Ad budget: ${labelFor(AD_BUDGETS, input.adBudget)}`,
    `Creative format: ${staticCreative ? "Static" : "Video"} — ${input.creativeDuration}`,
    `Landing page: ${input.landingPageUrl || "(from brand profile)"}`,
    "",
    input.angleMode === "user_idea" && input.angleIdea?.trim()
      ? `=== USER'S ANGLE DIRECTION ===\n${input.angleIdea.trim()}`
      : "",
  ].filter(Boolean);

  if (intelligenceBriefText) {
    sections.push("", intelligenceBriefText);
  }

  return sections.join("\n");
}

type RawAngleResponse = { angles: BriefAngleOption[] };

export async function generateBriefAngleOptions(
  input: BriefWizardInput,
  brandProfileText: string,
  intelligenceBriefText?: string
): Promise<BriefAngleOption[]> {
  const raw = await callClaudeJSON<RawAngleResponse>({
    system: BRIEF_ANGLE_OPTIONS_SYSTEM,
    cachedContext: buildInputContext(input, brandProfileText, intelligenceBriefText),
    prompt: "Propose 3 distinct angle options for this campaign. JSON only.",
    maxTokens: 2500,
    temperature: 0.85,
  });

  return (raw.angles ?? []).slice(0, 3).map((a, i) => ({
    id: a.id ?? `angle_${i + 1}`,
    name: a.name ?? `Angle ${i + 1}`,
    description: a.description ?? "",
    emotionalHook: a.emotionalHook ?? "",
    productionFormat: a.productionFormat ?? "",
  }));
}

export async function generateFullBrief(
  input: BriefWizardInput,
  brandProfileText: string,
  selectedAngle?: BriefAngleOption,
  intelligenceBriefText?: string
): Promise<CreativeBriefDocument> {
  const angleBlock = selectedAngle
    ? [
        "=== SELECTED ANGLE ===",
        `Name: ${selectedAngle.name}`,
        `Concept: ${selectedAngle.description}`,
        `Emotional hook: ${selectedAngle.emotionalHook}`,
        `Format: ${selectedAngle.productionFormat}`,
      ].join("\n")
    : input.angleIdea?.trim()
      ? `=== CREATIVE DIRECTION ===\n${input.angleIdea.trim()}`
      : "";

  const raw = await callClaudeJSON<CreativeBriefDocument>({
    system: BRIEF_FULL_GENERATION_SYSTEM,
    cachedContext: buildInputContext(input, brandProfileText, intelligenceBriefText),
    prompt: [angleBlock, "", "Generate the complete production-ready creative brief JSON now."]
      .filter(Boolean)
      .join("\n"),
    maxTokens: 6144,
    temperature: 0.75,
  });

  return {
    ...raw,
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    header: raw.header ?? {
      campaignGoal: labelFor(BRIEF_GOALS, input.goal),
      targetAudience: input.audienceNotes ?? "Target customer from brand profile",
      platform: labelFor(BRIEF_PLATFORMS, input.platform),
      audienceTemperature: labelFor(AUDIENCE_TEMPERATURES, input.audienceTemperature),
      productionResources: labelFor(PRODUCTION_RESOURCES, input.productionResource),
      strategicRationale: "",
    },
    angle: raw.angle ?? {
      name: selectedAngle?.name ?? "Creative Angle",
      explanation: selectedAngle?.description ?? "",
      emotion: selectedAngle?.emotionalHook ?? "",
      belief: "",
    },
    hookOptions: raw.hookOptions ?? [],
    script: raw.script ?? "",
    shotList: raw.shotList ?? [],
    productionNotes: raw.productionNotes ?? "",
    ctaGuidance: raw.ctaGuidance ?? {
      primary: "",
      alternative: "",
      placement: "",
      rationale: "",
    },
    whatToAvoid: raw.whatToAvoid ?? [],
  };
}

export async function runBriefPipeline(
  supabase: SupabaseClient,
  briefRow: CreativeBrief,
  workspace: Workspace
): Promise<void> {
  const brandProfile = await getOrGenerateBrandProfile(supabase, workspace);
  const brandProfileText = formatBrandProfileForPrompt(brandProfile);
  const input = briefRow.input as BriefWizardInput;

  if (
    briefRow.generation_phase === "angles" &&
    input.angleMode === "surprise_me" &&
    !briefRow.selected_angle_id
  ) {
    const angles = await generateBriefAngleOptions(input, brandProfileText);
    const withIds = angles.map((a) => ({
      ...a,
      id: a.id || randomUUID(),
    }));

    const { error } = await supabase
      .from("creative_briefs")
      .update({
        status: "awaiting_angle",
        angle_options: withIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", briefRow.id);

    if (error) throw new Error(error.message);
    return;
  }

  const category =
    (brandProfile as { category?: string }).category?.trim() || workspace.name || "DTC";
  const platformLabel = labelFor(BRIEF_PLATFORMS, input.platform);
  const intelligenceBrief = await buildIntelligenceBrief(
    supabase,
    workspace.id,
    category,
    [platformLabel]
  );
  const intelligenceBriefText = intelligenceBrief
    ? formatIntelligenceForPrompt(intelligenceBrief)
    : undefined;

  const selectedAngle = briefRow.selected_angle_id
    ? ((briefRow.angle_options ?? []) as BriefAngleOption[]).find(
        (a) => a.id === briefRow.selected_angle_id
      )
    : undefined;

  const document = await generateFullBrief(
    input,
    brandProfileText,
    selectedAngle,
    intelligenceBriefText
  );

  const title = document.angle?.name
    ? `${document.angle.name} · ${labelFor(BRIEF_PLATFORMS, input.platform)}`
    : briefRow.title;

  const { error } = await supabase
    .from("creative_briefs")
    .update({
      title,
      status: "completed",
      brief: document,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", briefRow.id);

  if (error) throw new Error(error.message);

  await captureHooksFromBrief(
    supabase,
    briefRow.id,
    workspace.id,
    briefRow.user_id,
    document,
    input.platform
  );
}
