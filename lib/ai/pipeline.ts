import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ANALYSIS_PLATFORMS } from "@/lib/analyses/constants";
import { callClaude, callClaudeJSON, type ImageInput } from "@/lib/ai/client";
import {
  formatBrandProfileForPrompt,
  truncateLandingPageForAgents,
} from "@/lib/ai/brand-profile-prompt";
import { getOrGenerateBrandProfile } from "@/lib/ai/brand-profile";
import {
  buildImageCreativeBrief,
  describeImageCreative,
} from "@/lib/ai/image-creative";
import { scrapePage } from "@/lib/ai/scrape";
import { processVideoCreative, buildVideoBrief } from "@/lib/ai/video";
import type { VideoCreativeContext } from "@/lib/ai/video";
import { buildIntelligenceBrief, formatIntelligenceForPrompt } from "@/lib/ai/intelligence";
import { captureHooksFromAnalysis } from "@/lib/hooks/capture";
import { hydrateFunnelReportFields } from "@/lib/report/enrich-report";
import { extractDrRewriteSeed } from "@/lib/report/script-rewrite";
import { ensureScriptRewrite } from "@/lib/ai/script-rewrite-fallback";
import {
  getCreativeGoalScoringBlock,
  normalizeCreativeGoal,
} from "@/lib/analyses/creative-goals";
import {
  buildContextBlock,
  DR_CRITIC_SYSTEM,
  FUNNEL_REPORT_SYSTEM,
  SKEPTICAL_BUYER_SYSTEM,
} from "@/lib/ai/prompts";
import type { Analysis } from "@/lib/types/analysis";
import type {
  AnalysisReport,
  ConversionCategory,
  ConversionScore,
  IcpSimulation,
  IntelligenceBrief,
} from "@/lib/types/report";
import type { Workspace } from "@/lib/types/workspace";

const AGENT_SUFFIX =
  "Give your analysis now, fully in character.";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

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

function normalizeConversion(categories: ConversionCategory[]): ConversionScore {
  const normalized = categories.map((c) => ({
    ...c,
    score: clamp(c.score ?? 0, 0, c.maxScore ?? 0),
  }));
  const total = clamp(
    normalized.reduce((sum, c) => sum + c.score, 0),
    0,
    100
  );
  return { total, categories: normalized };
}

type FunnelReportResult = {
  conversionCategories: ConversionCategory[];
  verdictSummary: string;
  headline: string;
  creativeStrengthScore: number;
  angleTags: AnalysisReport["angleTags"];
  agentFindings: AnalysisReport["agentFindings"];
  angleRecommendations: AnalysisReport["angleRecommendations"];
  topBlockers: AnalysisReport["topBlockers"];
  hookVariants: AnalysisReport["hookVariants"];
  scriptRewrite: string;
  priorityActions: AnalysisReport["priorityActions"];
  icpSimulation?: IcpSimulation;
};

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

  const landingPageStatus: "ok" | "partial" | "failed" = !lp
    ? "failed"
    : lp.ok
      ? lp.bodyText.length > 200
        ? "ok"
        : "partial"
      : "failed";
  const landingPageText =
    lp?.asPromptText ?? "(No landing page URL was provided.)";
  const agentLandingPageText = truncateLandingPageForAgents(landingPageText);

  const intelligenceBriefText = intelligenceBrief
    ? formatIntelligenceForPrompt(intelligenceBrief)
    : undefined;

  const creativeGoal = normalizeCreativeGoal(analysis.creative_goal);
  const goalScoringBlock = getCreativeGoalScoringBlock(creativeGoal);

  const agentContext = buildContextBlock({
    brandProfileText,
    creativeText: creative.text,
    creativeIsImage: creative.kind === "image",
    creativeIsVideo: creative.kind === "video",
    creativeGoal,
    landingPageText: agentLandingPageText,
    landingPageStatus,
    platformText: platformText(analysis),
    intelligenceBriefText,
  });

  const gradingContext = buildContextBlock({
    brandProfileText,
    creativeText: creative.text,
    creativeIsImage: creative.kind === "image",
    creativeIsVideo: creative.kind === "video",
    creativeGoal,
    landingPageText,
    landingPageStatus,
    platformText: platformText(analysis),
    intelligenceBriefText,
  });

  const [buyer, drCritic] = await Promise.all([
    callClaude({
      system: SKEPTICAL_BUYER_SYSTEM,
      cachedContext: agentContext,
      prompt: AGENT_SUFFIX,
      maxTokens: 1100,
      temperature: 0.8,
    }),
    callClaude({
      system: DR_CRITIC_SYSTEM,
      cachedContext: agentContext,
      prompt: AGENT_SUFFIX,
      image: creative.visionImage,
      maxTokens: 1700,
      temperature: 0.8,
    }),
  ]);

  const drRewriteSeed = extractDrRewriteSeed(drCritic);

  const reportRaw = await callClaudeJSON<FunnelReportResult>({
    system: FUNNEL_REPORT_SYSTEM,
    cachedContext: gradingContext,
    prompt: [
      "=== AGENT — THE SKEPTICAL BUYER ===",
      buyer,
      "",
      "=== AGENT — THE DIRECT RESPONSE CRITIC ===",
      drCritic,
      "",
      ...(drRewriteSeed
        ? [
            "=== DR CRITIC SCRIPT SEED (extend this — do NOT replace with generic copy) ===",
            drRewriteSeed.slice(0, 1200),
            "",
          ]
        : []),
      "GOAL-SPECIFIC SCORING (conversionCategories + creativeStrengthScore):",
      goalScoringBlock,
      "",
      "SYNTHESIS INSTRUCTIONS:",
      "1. Grade creative strength through the CREATIVE GOAL lens in context — not generic conversion-first unless goal is drive_purchases.",
      "2. scriptRewrite MUST be a complete spoken script (80+ words): hook → body → proof → offer → CTA, THEN a final line starting with 'Production note:'. NEVER output only a production note — that field is INVALID without the full script above it. Extend the DR Critic REWRITE section when present.",
      "3. agentFindings: EXACTLY 2 entries (skeptical_buyer, direct_response) — quote THIS ad; 3+ keyFindings each.",
      "4. priorityActions: MINIMUM 5 — mostly ad creative fixes from agent debate; full strategic breakdown on every item.",
      "5. SCORING: Ask 'would this flaw stop or create doubt in a buyer?' before reducing scores. Optimizations (weaker hook, more proof, better visuals) belong in recommendations — only critical conversion problems should significantly lower scores. Multiple small improvements must NOT produce a failing score.",
      "6. Never lower scores because this ad omitted product features outside its chosen angle.",
      "7. AUDIENCE: If the ad targets a valid buyer who could purchase this product — even when the landing page hero copy describes a different entry-point persona — do NOT penalize, block, or call it 'wrong audience'. Different ad/LP entry points are normal DTC strategy.",
      "8. ICP personas: simulate plausible product buyers reacting honestly — not landing-page demographic clones.",
      "9. VIDEO: If creative is video, analyze ONLY primary ad messaging + on-screen text — never song lyrics or background audio as brand copy.",
      "",
      "Produce the complete funnel report JSON now.",
    ].join("\n"),
    image: creative.visionImage,
    maxTokens: 6144,
    temperature: 0.35,
    grading: true,
  });

  const hydrated = hydrateFunnelReportFields(
    {
      agentFindings: reportRaw.agentFindings ?? [],
      priorityActions: reportRaw.priorityActions ?? [],
      topBlockers: reportRaw.topBlockers ?? [],
      conversionScore: {
        total: 0,
        categories: reportRaw.conversionCategories ?? [],
      },
      angleRecommendations: reportRaw.angleRecommendations ?? [],
    },
    {
      skeptical_buyer: buyer,
      direct_response: drCritic,
      verdict: reportRaw.verdictSummary ?? "",
    }
  );

  const conversionScore = normalizeConversion(reportRaw.conversionCategories ?? []);
  const creativeStrengthScore = clamp(reportRaw.creativeStrengthScore ?? 0, 0, 100);
  const overallFunnelScore = clamp(
    (conversionScore.total + creativeStrengthScore) / 2,
    0,
    100
  );

  const flagsNotes: string[] = [];
  if (landingPageStatus !== "ok") {
    flagsNotes.push(
      landingPageStatus === "failed"
        ? `Landing page could not be fully analyzed${lp?.error ? ` (${lp.error})` : ""}.`
        : "Landing page returned limited content; some scoring is conservative."
    );
  }
  if (creative.kind === "video-placeholder") {
    flagsNotes.push("Video was not transcribed; creative judged from context only.");
  }
  if (brandProfile.partial) {
    flagsNotes.push("Brand profile was derived from limited data.");
  }

  const icpSimulation: IcpSimulation | undefined =
    Array.isArray(reportRaw.icpSimulation?.personas) &&
    reportRaw.icpSimulation.personas.length > 0
      ? { personas: reportRaw.icpSimulation.personas }
      : undefined;

  const scriptRewrite = await ensureScriptRewrite({
    synthesis: reportRaw.scriptRewrite,
    drCritic,
    drRewriteSeed,
    hookVariants: reportRaw.hookVariants ?? [],
    creativeContext: creative.text,
    platformText: platformText(analysis),
    brandProfileText,
  });

  const report: AnalysisReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    overallFunnelScore,
    creativeStrengthScore,
    conversionScore,
    headline: reportRaw.headline ?? "",
    angleTags: reportRaw.angleTags ?? [],
    agentFindings: hydrated.agentFindings,
    angleRecommendations: reportRaw.angleRecommendations ?? [],
    topBlockers: (reportRaw.topBlockers ?? []).slice(0, 5),
    hookVariants: reportRaw.hookVariants ?? [],
    scriptRewrite,
    priorityActions: hydrated.priorityActions,
    ...(icpSimulation ? { icpSimulation } : {}),
    ...(intelligenceBrief ? { intelligenceBrief } : {}),
    flags: {
      landingPagePartial: landingPageStatus === "partial",
      landingPageFailed: landingPageStatus === "failed",
      creativeKind: creative.kind,
      notes: flagsNotes,
    },
    ...(creative.videoContext
      ? {
          videoContext: {
            transcript: creative.videoContext.transcript,
            primaryMessaging: creative.videoContext.primaryMessaging,
            backgroundAudioNote: creative.videoContext.backgroundAudioNote,
            onScreenText: creative.videoContext.onScreenText,
            transcriptAvailable: creative.videoContext.transcriptAvailable,
            visualDescription: creative.videoContext.visualDescription,
            frameCount: creative.videoContext.frameCount,
            processingNotes: creative.videoContext.processingNotes,
          },
        }
      : {}),
    rawAgents: {
      skeptical_buyer: buyer,
      direct_response: drCritic,
      verdict:
        reportRaw.verdictSummary?.trim() ||
        hydrated.verdictFallback ||
        "",
    },
  };

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

  await captureHooksFromAnalysis(supabase, analysis, report, workspace.user_id);
}
