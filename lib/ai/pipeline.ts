import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ANALYSIS_PLATFORMS } from "@/lib/analyses/constants";
import { type ImageInput } from "@/lib/ai/client";
import { formatBrandProfileForPrompt } from "@/lib/ai/brand-profile-prompt";
import { buildFunnelAnalysisReport } from "@/lib/ai/build-funnel-analysis-report";
import { runFunnelGrading } from "@/lib/ai/funnel-grading";
import { getOrGenerateBrandProfile } from "@/lib/ai/brand-profile";
import {
  buildImageCreativeBrief,
  describeImageCreative,
} from "@/lib/ai/image-creative";
import { isScrapeContentSufficient, scrapePage } from "@/lib/ai/scrape";
import { processVideoCreative, buildVideoBrief } from "@/lib/ai/video";
import type { VideoCreativeContext } from "@/lib/ai/video";
import { buildIntelligenceBrief, formatIntelligenceForPrompt } from "@/lib/ai/intelligence";
import {
  getCreativeGoalLabel,
  normalizeCreativeGoal,
} from "@/lib/analyses/creative-goals";
import { getOrBuildCriteria, formatCriteriaForContext } from "@/lib/ai/criteria";
import type { Analysis } from "@/lib/types/analysis";
import type { IntelligenceBrief } from "@/lib/types/report";
import type { Workspace } from "@/lib/types/workspace";

function platformText(analysis: Analysis): string {
  const labels = analysis.platforms.map((id) => {
    if (id === "other" && analysis.platform_other) return analysis.platform_other;
    return ANALYSIS_PLATFORMS.find((p) => p.id === id)?.label ?? id;
  });
  return labels.length ? labels.join(", ") : "Unspecified platform";
}

async function buildCreative(
  supabase: SupabaseClient,
  analysis: Analysis
): Promise<{
  text: string;
  visionImage?: ImageInput;
  kind: "image" | "script" | "video-placeholder" | "video";
  videoContext?: VideoCreativeContext;
}> {
  if (analysis.creative_type === "script") {
    return {
      text: analysis.script_content?.trim() || "(No script content provided.)",
      kind: "script",
    };
  }

  if (analysis.creative_type === "video") {
    const videoCtx = await processVideoCreative(supabase, analysis);
    const { text } = buildVideoBrief(videoCtx, analysis.creative_file_name ?? undefined);
    return {
      text,
      kind: "video",
      videoContext: videoCtx,
    };
  }

  const path = analysis.creative_storage_path;
  if (!path) {
    return { text: "(Image creative missing.)", kind: "image" };
  }

  try {
    const { data, error } = await supabase.storage
      .from("analysis-creatives")
      .download(path);
    if (error || !data) throw new Error(error?.message ?? "download failed");

    const buffer = Buffer.from(await data.arrayBuffer());
    const mediaType =
      analysis.creative_mime_type === "image/png" ? "image/png" : "image/jpeg";
    const image: ImageInput = {
      mediaType,
      base64Data: buffer.toString("base64"),
    };

    const visualDescription = await describeImageCreative(
      image,
      analysis.creative_file_name ?? undefined
    );
    const text = buildImageCreativeBrief(
      visualDescription,
      analysis.creative_file_name ?? undefined
    );

    return {
      text,
      visionImage: image,
      kind: "image",
    };
  } catch {
    return {
      text: `Image creative could not be loaded (filename: "${analysis.creative_file_name ?? "creative"}"). Proceed using brand, platform, and landing-page context and flag that the image was unavailable.`,
      kind: "image",
    };
  }
}

/**
 * Runs the full AI analysis pipeline for an analysis row and persists the
 * structured report. Throws on unrecoverable failure (caller marks "failed").
 */
export async function runAnalysisPipeline(
  supabase: SupabaseClient,
  analysis: Analysis,
  workspace: Workspace
): Promise<void> {
  const brandProfile = await getOrGenerateBrandProfile(supabase, workspace);
  const brandProfileText = formatBrandProfileForPrompt(brandProfile);

  const platforms = platformText(analysis)
    .split(", ")
    .filter(Boolean);

  const [creative, intelligenceBrief, lp] = await Promise.all([
    buildCreative(supabase, analysis),
    buildIntelligenceBrief(
      supabase,
      workspace.id,
      brandProfile.category || brandProfile.brandName,
      platforms
    ).catch((): IntelligenceBrief | null => null),
    analysis.landing_page_url
      ? scrapePage(analysis.landing_page_url)
      : Promise.resolve(null),
  ]);

  const creativeGoal = normalizeCreativeGoal(analysis.creative_goal);

  // Fetch or build the performance criteria checklist (cached 7 days in workspaces table).
  // The Haiku distillation call only fires on cache miss — effectively zero cost per analysis.
  const criteriaList = await getOrBuildCriteria(
    supabase,
    workspace.id,
    intelligenceBrief
  ).catch(() => []);
  const criteriaText = criteriaList.length > 0
    ? formatCriteriaForContext(criteriaList, getCreativeGoalLabel(creativeGoal))
    : undefined;

  const landingPageStatus: "ok" | "partial" | "failed" = !lp
    ? "failed"
    : lp.ok
      ? isScrapeContentSufficient(lp)
        ? "ok"
        : "partial"
      : "failed";
  const landingPageText =
    lp?.asPromptText ?? "(No landing page URL was provided.)";

  const intelligenceBriefText = intelligenceBrief
    ? formatIntelligenceForPrompt(intelligenceBrief)
    : undefined;

  const {
    report: reportRaw,
    buyer,
    drCritic,
    drRewriteSeed,
  } = await runFunnelGrading({
    brandProfileText,
    creativeText: creative.text,
    creativeIsImage: creative.kind === "image",
    creativeIsVideo: creative.kind === "video",
    creativeGoal,
    landingPageText,
    landingPageStatus,
    platformText: platformText(analysis),
    intelligenceBriefText,
    criteriaText,
    visionImage: creative.visionImage,
  });

  const report = await buildFunnelAnalysisReport({
    reportRaw,
    buyer,
    drCritic,
    drRewriteSeed,
    brandProfileText,
    creativeText: creative.text,
    platformText: platformText(analysis),
    landingPageStatus,
    lpError: lp?.error,
    creativeKind: creative.kind,
    criteriaList,
    intelligenceBrief,
    brandProfilePartial: brandProfile.partial,
    videoContext: creative.videoContext
      ? {
          transcript: creative.videoContext.transcript,
          primaryMessaging: creative.videoContext.primaryMessaging,
          backgroundAudioNote: creative.videoContext.backgroundAudioNote,
          onScreenText: creative.videoContext.onScreenText,
          transcriptAvailable: creative.videoContext.transcriptAvailable,
          visualDescription: creative.videoContext.visualDescription,
          visualTimeline: creative.videoContext.visualTimeline,
          frameTimestamps: creative.videoContext.frameTimestamps,
          frameCount: creative.videoContext.frameCount,
          analyzedDurationSec: creative.videoContext.analyzedDurationSec,
          videoDurationSec: creative.videoContext.videoDurationSec,
          visualAnalysisMode: creative.videoContext.visualAnalysisMode,
          processingNotes: creative.videoContext.processingNotes,
        }
      : undefined,
  });

  const conversionScore = report.conversionScore;
  const creativeStrengthScore = report.creativeStrengthScore;
  const overallFunnelScore = report.overallFunnelScore;

  const { error } = await supabase
    .from("analyses")
    .update({
      report,
      funnel_score: overallFunnelScore,
      conversion_score: conversionScore.total,
      creative_strength_score: creativeStrengthScore,
      status: "completed",
      error_message: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", analysis.id);

  if (error) {
    throw new Error(`Failed to save report: ${error.message}`);
  }
}
