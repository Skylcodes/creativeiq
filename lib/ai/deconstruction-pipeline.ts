import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaudeJSON, type ImageInput } from "@/lib/ai/client";
import { verifyAdEvidence } from "@/lib/ai/deconstruction-evidence";
import {
  DECONSTRUCTION_SYSTEM,
  HONEST_ANALYSIS_SYSTEM,
} from "@/lib/ai/deconstruction-prompts";
import { getOrGenerateBrandProfile } from "@/lib/ai/brand-profile";
import { formatBrandProfileForPrompt } from "@/lib/ai/brand-profile-prompt";
import {
  buildImageCreativeBrief,
  describeImageCreative,
} from "@/lib/ai/image-creative";
import {
  getOrBuildCriteria,
  STATIC_CRITERIA,
  type RawCriteria,
} from "@/lib/ai/criteria";
import { buildVideoBrief, processVideoCreative } from "@/lib/ai/video";
import { scrapePage } from "@/lib/ai/scrape";
import type { AdDeconstruction, DeconstructionReport } from "@/lib/types/deconstruction";
import type { Workspace } from "@/lib/types/workspace";

type DeconstructionAIResult = {
  psychologicalTrigger: string;
  structuralFramework: { role: string; description: string }[];
  offerMechanics: string;
  visualProduction: string;
  brandTranslation: {
    hook: string;
    structuralOutline: { role: string; description: string }[];
    offerTranslation: string;
    disclaimer: string;
  };
};

type HonestAnalysisAIResult = {
  headline: string;
  strengths: string[];
  weaknesses: string[];
  lessonsExtracted: string[];
  criteriaChecklist: { id: string; pass: boolean | null; note: string }[];
};

async function buildCreativeFromInput(
  supabase: SupabaseClient,
  row: AdDeconstruction
): Promise<{ text: string; visionImage?: ImageInput }> {
  const input = row.input;

  if (input.creativeType === "video") {
    const fakeAnalysis = {
      id: row.id,
      creative_type: "video" as const,
      creative_storage_path: input.creativeStoragePath,
      creative_mime_type: input.creativeMimeType ?? "video/mp4",
      creative_file_name: input.creativeFileName ?? null,
      thumbnail_url: input.thumbnailUrl ?? null,
    };
    const videoCtx = await processVideoCreative(supabase, fakeAnalysis as never);
    const { text } = buildVideoBrief(videoCtx, input.creativeFileName ?? undefined);
    return { text };
  }

  if (input.creativeType === "image") {
    const path = input.creativeStoragePath;
    try {
      const { data, error } = await supabase.storage
        .from("analysis-creatives")
        .download(path);
      if (error || !data) throw new Error(error?.message ?? "download failed");

      const buffer = Buffer.from(await data.arrayBuffer());
      const mediaType =
        input.creativeMimeType === "image/png" ? "image/png" : "image/jpeg";
      const image: ImageInput = { mediaType, base64Data: buffer.toString("base64") };

      const visualDescription = await describeImageCreative(
        image,
        input.creativeFileName ?? undefined
      );
      const text = buildImageCreativeBrief(
        visualDescription,
        input.creativeFileName ?? undefined
      );
      return { text, visionImage: image };
    } catch {
      return { text: "Image could not be loaded." };
    }
  }

  return { text: "(No creative content available.)" };
}

function criteriaForHonestAnalysis(criteriaList: RawCriteria[]): string {
  const creative = criteriaList.filter((c) => c.category !== "landing_page");
  return [
    "Evaluate against these creative criteria only (landing page criteria = N/A, use pass: null).",
    "Relevance gate: mark pass=false only when the item applies to this ad's job and the gap creates a real mechanism of harm.",
    "If an item is not needed for this creative approach, mark pass=null and do not mention it as a weakness.",
    "In-ad price is never a quality factor — mark C4 null unless the ad explicitly promised a specific deal.",
    "In-ad social proof is not required — mark C2 null unless the ad made a hard proof-led claim.",
    ...creative.map((c) => `${c.id}. ${c.label} [when: ${c.appliesWhen}]`),
  ].join("\n");
}

export async function runDeconstructionPipeline(
  supabase: SupabaseClient,
  row: AdDeconstruction,
  workspace: Workspace
): Promise<void> {
  const evidence = await verifyAdEvidence(row.input);

  const brandProfile = await getOrGenerateBrandProfile(supabase, workspace);
  const brandProfileText = formatBrandProfileForPrompt(brandProfile);

  const [creative, competitorLp] = await Promise.all([
    buildCreativeFromInput(supabase, row),
    scrapePage(row.input.landingPageUrl).catch(() => null),
  ]);

  const criteriaList = await getOrBuildCriteria(supabase, workspace.id, null).catch(
    () => STATIC_CRITERIA as RawCriteria[]
  );

  const contextBlock = [
    "=== USER BRAND (translate strategy TO this brand) ===",
    brandProfileText,
    "",
    "=== COMPETITOR LANDING PAGE ===",
    competitorLp?.asPromptText ?? row.input.landingPageUrl,
    "",
    "=== REFERENCE AD CREATIVE (uploaded) ===",
    creative.text,
    "",
    "=== EVIDENCE VERIFICATION ===",
    `Confidence: ${evidence.confidence.toUpperCase()}`,
    `Summary: ${evidence.summary}`,
    evidence.badges.length ? `Signals: ${evidence.badges.join("; ")}` : "",
    evidence.resolvedAdvertiser ? `Advertiser: ${evidence.resolvedAdvertiser}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  let report: DeconstructionReport;

  if (evidence.confidence === "low") {
    const criteriaText = criteriaForHonestAnalysis(criteriaList);

    const honest = await callClaudeJSON<HonestAnalysisAIResult>({
      system: HONEST_ANALYSIS_SYSTEM,
      cachedContext: `${contextBlock}\n\n=== PERFORMANCE CRITERIA ===\n${criteriaText}`,
      prompt:
        "We could not verify this ad has a real performance track record. Provide an honest creative breakdown — strengths, weaknesses, and lessons only from criteria that genuinely pass. Do not assume this is a winning ad.",
      maxTokens: 2500,
      temperature: 0.35,
    });

    report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      mode: "honest_analysis",
      evidence,
      honestAnalysis: {
        headline: honest.headline,
        strengths: honest.strengths ?? [],
        weaknesses: honest.weaknesses ?? [],
        lessonsExtracted: honest.lessonsExtracted ?? [],
        criteriaChecklist: criteriaList
          .filter((c) => c.category !== "landing_page")
          .map((raw) => {
            const ai = honest.criteriaChecklist?.find((r) => r.id === raw.id);
            return {
              id: raw.id,
              label: raw.label,
              pass: ai?.pass ?? null,
              note:
                ai?.pass === null
                  ? ai.note || "Not applicable to this ad's goal."
                  : ai?.note,
            };
          }),
      },
    };
  } else {
    const toneInstruction =
      evidence.confidence === "medium"
        ? "Use cautious language (appears to, likely) — do not assert proven winner status."
        : "Analyze confidently while citing specific creative elements.";

    const result = await callClaudeJSON<DeconstructionAIResult>({
      system: DECONSTRUCTION_SYSTEM,
      cachedContext: contextBlock,
      prompt: `${toneInstruction}\n\nDeconstruct the strategic framework, then translate it to the user's brand. Return complete JSON.`,
      maxTokens: 3500,
      temperature: 0.4,
      grading: true,
    });

    report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      mode: "deconstruction",
      evidence,
      deconstruction: {
        psychologicalTrigger: result.psychologicalTrigger,
        structuralFramework: result.structuralFramework ?? [],
        offerMechanics: result.offerMechanics,
        visualProduction: result.visualProduction,
      },
      brandTranslation: result.brandTranslation,
    };
  }

  const { error } = await supabase
    .from("ad_deconstructions")
    .update({
      report,
      confidence_level: evidence.confidence,
      status: "completed",
      error_message: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (error) {
    throw new Error(`Failed to save deconstruction: ${error.message}`);
  }
}
