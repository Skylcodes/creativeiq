import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type ImageInput } from "@/lib/ai/client";
import {
  buildImageCreativeBrief,
  describeImageCreative,
} from "@/lib/ai/image-creative";
import { processVideoCreative, buildVideoBrief } from "@/lib/ai/video";
import type { VisualIntelligence } from "@/lib/ai/pipeline-types";
import type { Analysis } from "@/lib/types/analysis";

/**
 * JOB 1 — Visual Intelligence. Gemini (video, full native MP4) or Claude
 * vision (static image) act purely as an observer of what is actually in
 * the creative — never scoring or recommending. Reuses the existing
 * Vertex/Whisper/vision infrastructure; no new model calls are introduced
 * beyond what the pipeline already made.
 */
export async function buildVisualIntelligence(
  supabase: SupabaseClient,
  analysis: Analysis
): Promise<VisualIntelligence> {
  if (analysis.creative_type === "script") {
    const text = analysis.script_content?.trim() || "(No script content provided.)";
    return {
      kind: "script",
      briefText: `AD CREATIVE — SCRIPT/TEXT\n\n${text}`,
      sourceNotes: [],
    };
  }

  if (analysis.creative_type === "video") {
    const videoCtx = await processVideoCreative(supabase, analysis);
    const { text } = buildVideoBrief(videoCtx, analysis.creative_file_name ?? undefined);
    return {
      kind: "video",
      briefText: text,
      coldScrollStopScore: videoCtx.geminiAnalysis?.coldScrollStopScore,
      watchThroughScore: videoCtx.geminiAnalysis?.watchThroughScore,
      dropOffMoments: videoCtx.geminiAnalysis?.dropOffMoments,
      sourceNotes: videoCtx.processingNotes,
      videoContext: videoCtx,
    };
  }

  const path = analysis.creative_storage_path;
  if (!path) {
    return {
      kind: "image",
      briefText: "AD CREATIVE — STATIC IMAGE\n\n(Image creative missing.)",
      sourceNotes: ["Image creative was not found in storage."],
    };
  }

  try {
    const { data, error } = await supabase.storage
      .from("analysis-creatives")
      .download(path);
    if (error || !data) throw new Error(error?.message ?? "download failed");

    const buffer = Buffer.from(await data.arrayBuffer());
    const mediaType: ImageInput["mediaType"] =
      analysis.creative_mime_type === "image/png" ? "image/png" : "image/jpeg";
    const image: ImageInput = { mediaType, base64Data: buffer.toString("base64") };

    const visualDescription = await describeImageCreative(
      image,
      analysis.creative_file_name ?? undefined
    );
    const text = buildImageCreativeBrief(
      visualDescription,
      analysis.creative_file_name ?? undefined
    );

    return {
      kind: "image",
      briefText: text,
      sourceNotes: [],
      visionImage: image,
    };
  } catch (err) {
    return {
      kind: "image",
      briefText: `AD CREATIVE — STATIC IMAGE\n\n(Image creative could not be loaded. Proceed using brand, platform, and landing-page context.)`,
      sourceNotes: [
        `Image creative failed to load: ${err instanceof Error ? err.message : "unknown error"}`,
      ],
    };
  }
}
