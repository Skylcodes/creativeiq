import "server-only";
import fs from "fs";
import os from "os";
import path from "path";
import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaudeJSON, type ImageInput } from "@/lib/ai/client";
import {
  analyzeVideoWithGeminiVertex,
  formatGeminiVisualContextForGrading,
  isGeminiVertexConfigured,
} from "@/lib/ai/gemini-vertex-video";
import type {
  VideoAnalysisResult,
  VisualAnalysisMode,
} from "@/lib/ai/video-analysis-types";
import { VIDEO_ANALYSIS_JSON_SCHEMA } from "@/lib/ai/video-analysis-types";
import type { Analysis } from "@/lib/types/analysis";

// Whisper API hard limit is 25MB. Use 24MB to give a safe margin.
const WHISPER_MAX_BYTES = 24 * 1024 * 1024;

export type VideoCreativeContext = {
  /** Raw Whisper output — may mix voiceover with background lyrics */
  transcript: string;
  /** Isolated selling message: voiceover, creator speech, intentional dialogue */
  primaryMessaging: string;
  /** Background music, song lyrics, trending audio, ambient SFX */
  backgroundAudioNote: string;
  /** On-screen text/captions quoted from sampled frames */
  onScreenText: string;
  /** How primary vs background layers were separated */
  messagingSource:
    | "gemini_vertex"
    | "ai_layers"
    | "heuristic"
    | "speech_only"
    | "visual_only";
  transcriptAvailable: boolean;
  visualDescription: string;
  /** Chronological notes from video analysis */
  visualTimeline?: string[];
  /** Approximate timestamps when frames were captured (frame fallback mode) */
  frameTimestamps?: string[];
  frameCount: number;
  /** Portion of the video covered by visual analysis (seconds) */
  analyzedDurationSec?: number;
  videoDurationSec?: number;
  /** How visuals were processed for downstream agents */
  visualAnalysisMode?: VisualAnalysisMode;
  /** Full Gemini analysis payload (when mode is gemini_vertex) */
  geminiAnalysis?: VideoAnalysisResult;
  /**
   * Preformatted ground-truth block for Claude grading agents.
   * Present only when Gemini successfully watched the video.
   */
  geminiVisualContext?: string;
  processingNotes: string[];
};

const MAX_GEMINI_INLINE_BYTES = 18 * 1024 * 1024;
const MAX_VIDEO_FRAMES = readEnvInt("VIDEO_MAX_FRAMES", 12, 4, 16);
const MIN_VIDEO_FRAMES = 4;
/** Most paid social ads finish within 90s — cap visual sampling to control cost. */
const MAX_ANALYSIS_DURATION_SEC = readEnvInt("VIDEO_MAX_DURATION_SEC", 90, 15, 180);
/** Smaller frames = fewer vision tokens (480px ≈ 40% cheaper than 640px per frame). */
const VIDEO_FRAME_WIDTH = readEnvInt("VIDEO_FRAME_WIDTH", 480, 320, 768);

function readEnvInt(
  name: string,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function framePlan(durationSec: number): {
  analyzedDurationSec: number;
  frameCount: number;
  intervalSec: number;
} {
  const analyzedDurationSec = Math.min(
    Math.max(durationSec, 3),
    MAX_ANALYSIS_DURATION_SEC
  );
  const frameCount = Math.min(
    MAX_VIDEO_FRAMES,
    Math.max(MIN_VIDEO_FRAMES, Math.ceil(analyzedDurationSec / 3))
  );
  return {
    analyzedDurationSec,
    frameCount,
    intervalSec: analyzedDurationSec / frameCount,
  };
}

const VIDEO_CREATIVE_ANALYSIS_SYSTEM = `You analyze video advertisements for a creative intelligence platform. Raw audio transcripts from Whisper often mix PRIMARY AD MESSAGING with BACKGROUND AUDIO — you must separate them.

You may receive MULTIPLE video frames in chronological order sampled across the FULL ad timeline (not a single thumbnail). Treat them as a lightweight substitute for watching the whole video — compare every frame before judging persistence, pacing, or on-screen text frequency.

PRIMARY AD MESSAGING (analyze this as the script):
- Spoken voiceover selling the product
- Creator/influencer talking to camera
- Narrator dialogue with marketing intent
- Intentional spoken claims, offers, CTAs
- On-screen text that carries the sell (quote in onScreenText)

BACKGROUND AUDIO (NOT brand copy — do not treat as the ad script):
- Background music and song lyrics playing underneath speech
- Trending TikTok/Reels audio
- Ambient music, sound effects, beat drops
- Lyrics that continue while the creator talks over them

VISUAL / ON-SCREEN TEXT RULES (critical for accuracy):
1. Compare ALL attached frames before describing on-screen text or visual elements.
2. If the same text or visual appears in multiple frames, describe it as RECURRING or PERSISTENT throughout the ad — NEVER say it appeared "only once" or "briefly flashed" unless it is visible in exactly one frame.
3. visualTimeline: one entry per frame in order — note key visuals, on-screen text, scene changes, and whether text persists or changes.
4. onScreenTextPersistence: explicitly state which quoted text appears in which frames (e.g. "SALE 50% OFF — frames 1-6, persistent").
5. Sampling is ~every 3 seconds — small gaps may exist, but persistent overlays should appear in multiple consecutive frames.
6. Quote onScreenText exactly when visible — consolidate distinct text overlays; note recurring vs one-off.

SEPARATION RULES:
1. Ask: "What words are actually being used to SELL the product?" — not "what words exist in the audio?"
2. Speech that references the product, problem, offer, or CTA = primaryMessaging
3. Song lyrics with no marketing intent = backgroundAudioNote only
4. If creator speaks OVER music, primaryMessaging = the spoken words only; lyrics go to backgroundAudioNote
5. Lyrics ARE primary only when clearly intentional creative (lip-sync hook, lyrics synced to product reveal, text-on-screen matches lyrics as the hook) — rare; explain in separationNotes if so
6. Use audio prominence logic: foreground voice = primary; muffled/continuous under speech = background
7. META-CRITIQUE FORMAT: If on-screen text belongs to another ad/clip being shown (competitor POV, product being critiqued, stitch source) while the creator speaks over it, still quote it in onScreenText but explain in separationNotes that it is REFERENCE AD COPY — not the advertiser's sell. primaryMessaging = only the creator's spoken critique/pitch/CTA.

If no transcript provided, return empty strings for messaging fields and describe visuals only.
If transcript is only background music with no selling speech, primaryMessaging = "" and explain in backgroundAudioNote.

${VIDEO_ANALYSIS_JSON_SCHEMA}`;

let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!_openai) {
    _openai = new OpenAI({ apiKey, maxRetries: 0, timeout: 90_000 });
  }
  return _openai;
}

/**
 * Extract audio from a video blob as a compressed MP3 using ffmpeg.
 * Audio at 64 kbps is ~0.5 MB/min — a 60s ad goes from >25 MB to <1 MB.
 * Uses dynamic imports so bundlers never try to statically resolve the
 * native binary paths that @ffmpeg-installer resolves at runtime.
 * Returns null if extraction fails so we can fall back gracefully.
 */
async function extractAudioFromVideo(
  videoBlob: Blob,
  baseName: string
): Promise<{ blob: Blob; tempFiles: string[] } | null> {
  const tmpDir = os.tmpdir();
  const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const inPath = path.join(tmpDir, `iq_audio_in_${Date.now()}_${safeName}`);
  const outPath = path.join(tmpDir, `iq_audio_out_${Date.now()}.mp3`);
  const tempFiles = [inPath, outPath];

  try {
    // Dynamic imports keep these out of the static bundle graph so Turbopack
    // never tries to resolve the platform-specific binary package.json paths.
    const [{ default: FfmpegCommand }, { default: ffmpegInstaller }] = await Promise.all([
      import("fluent-ffmpeg"),
      import("@ffmpeg-installer/ffmpeg"),
    ]);

    FfmpegCommand.setFfmpegPath(ffmpegInstaller.path);

    fs.writeFileSync(inPath, Buffer.from(await videoBlob.arrayBuffer()));

    await new Promise<void>((resolve, reject) => {
      FfmpegCommand(inPath)
        .noVideo()
        .audioCodec("libmp3lame")
        .audioBitrate(64)
        .audioChannels(1)
        .audioFrequency(22050)
        .output(outPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
    });

    const audioBuffer = fs.readFileSync(outPath);
    return { blob: new Blob([audioBuffer], { type: "audio/mpeg" }), tempFiles };
  } catch {
    for (const f of tempFiles) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
    return null;
  }
}

async function getFfmpegCommand() {
  const [{ default: FfmpegCommand }, { default: ffmpegInstaller }] = await Promise.all([
    import("fluent-ffmpeg"),
    import("@ffmpeg-installer/ffmpeg"),
  ]);
  FfmpegCommand.setFfmpegPath(ffmpegInstaller.path);
  return FfmpegCommand;
}

function cleanupTempPaths(paths: string[]) {
  for (const target of paths) {
    try {
      if (!fs.existsSync(target)) continue;
      if (fs.statSync(target).isDirectory()) {
        fs.rmSync(target, { recursive: true, force: true });
      } else {
        fs.unlinkSync(target);
      }
    } catch {
      /* ignore */
    }
  }
}

function formatTimemark(seconds: number): string {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const sec = s.toFixed(2).padStart(5, "0");
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${sec}`;
  }
  return `${m}:${sec}`;
}

function buildFrameTimemarks(durationSec: number, count: number): string[] {
  const safeDuration = Math.max(durationSec, 1);
  const marks: string[] = [];
  for (let i = 0; i < count; i++) {
    const ratio = (i + 0.5) / count;
    const t = Math.max(0.1, Math.min(safeDuration - 0.05, safeDuration * ratio));
    marks.push(formatTimemark(t));
  }
  return marks;
}

async function probeVideoDurationSec(inPath: string): Promise<number | null> {
  try {
    const FfmpegCommand = await getFfmpegCommand();
    return await new Promise((resolve, reject) => {
      FfmpegCommand.ffprobe(inPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration ?? null);
      });
    });
  } catch {
    return null;
  }
}

/**
 * Trim + compress video for a single inline Gemini Vertex call (cost control).
 */
async function prepareVideoBlobForGemini(
  videoBlob: Blob,
  baseName: string
): Promise<{
  blob: Blob;
  fullDurationSec?: number;
  analyzedDurationSec: number;
  tempFiles: string[];
} | null> {
  const tmpDir = os.tmpdir();
  const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const inPath = path.join(tmpDir, `iq_gemini_in_${Date.now()}_${safeName}`);
  const outPath = path.join(tmpDir, `iq_gemini_out_${Date.now()}.mp4`);
  const tempFiles = [inPath, outPath];

  try {
    fs.writeFileSync(inPath, Buffer.from(await videoBlob.arrayBuffer()));
    const probedDuration = await probeVideoDurationSec(inPath);
    const fullDurationSec =
      probedDuration && probedDuration > 0 ? probedDuration : undefined;
    const analyzedDurationSec = fullDurationSec
      ? Math.min(fullDurationSec, MAX_ANALYSIS_DURATION_SEC)
      : MAX_ANALYSIS_DURATION_SEC;

    const compress = (scale: string, crf: number) =>
      new Promise<void>((resolve, reject) => {
        getFfmpegCommand().then((FfmpegCommand) => {
          FfmpegCommand(inPath)
            .seekInput(0)
            .duration(analyzedDurationSec)
            .outputOptions([
              "-vf",
              scale,
              "-c:v",
              "libx264",
              "-crf",
              String(crf),
              "-preset",
              "veryfast",
              "-c:a",
              "aac",
              "-b:a",
              "64k",
              "-movflags",
              "+faststart",
            ])
            .output(outPath)
            .on("end", () => resolve())
            .on("error", (err: Error) => reject(err))
            .run();
        });
      });

    await compress("scale=720:-2", 28);
    let outStat = fs.statSync(outPath);
    if (outStat.size > MAX_GEMINI_INLINE_BYTES) {
      await compress("scale=480:-2", 32);
      outStat = fs.statSync(outPath);
    }
    if (outStat.size > MAX_GEMINI_INLINE_BYTES) {
      cleanupTempPaths(tempFiles);
      return null;
    }

    const blob = new Blob([fs.readFileSync(outPath)], { type: "video/mp4" });
    return { blob, fullDurationSec, analyzedDurationSec, tempFiles };
  } catch {
    cleanupTempPaths(tempFiles);
    return null;
  }
}

/**
 * Cost-effective full-timeline visual sampling:
 * - One Haiku vision call for the entire ad (grading agents stay text-only)
 * - Evenly spaced frames across up to MAX_ANALYSIS_DURATION_SEC
 * - 480px JPEGs to minimize vision token cost
 */
async function extractVideoFrames(
  videoBlob: Blob,
  baseName: string
): Promise<{
  frames: ImageInput[];
  frameTimestamps: string[];
  durationSec?: number;
  analyzedDurationSec: number;
  tempFiles: string[];
} | null> {
  const tmpDir = os.tmpdir();
  const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const inPath = path.join(tmpDir, `iq_vid_in_${Date.now()}_${safeName}`);
  const outDir = path.join(tmpDir, `iq_frames_${Date.now()}`);
  const tempFiles = [inPath, outDir];

  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(inPath, Buffer.from(await videoBlob.arrayBuffer()));

    const probedDuration = await probeVideoDurationSec(inPath);
    const fullDurationSec =
      probedDuration && probedDuration > 0 ? probedDuration : MAX_ANALYSIS_DURATION_SEC;
    const plan = framePlan(fullDurationSec);
    const timemarks = buildFrameTimemarks(plan.analyzedDurationSec, plan.frameCount);
    const FfmpegCommand = await getFfmpegCommand();
    const scale = `${VIDEO_FRAME_WIDTH}x?`;

    await new Promise<void>((resolve, reject) => {
      FfmpegCommand(inPath)
        .seekInput(0)
        .duration(plan.analyzedDurationSec)
        .outputOptions(["-q:v", "5"])
        .screenshots({
          timemarks,
          folder: outDir,
          filename: "frame-%i.jpg",
          size: scale,
        })
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err));
    });

    const frameFiles = fs
      .readdirSync(outDir)
      .filter((f) => /^frame-\d+\.jpg$/i.test(f))
      .sort((a, b) => {
        const ai = Number(a.match(/\d+/)?.[0] ?? 0);
        const bi = Number(b.match(/\d+/)?.[0] ?? 0);
        return ai - bi;
      });

    const frames: ImageInput[] = [];
    for (const file of frameFiles) {
      const filePath = path.join(outDir, file);
      tempFiles.push(filePath);
      frames.push({
        mediaType: "image/jpeg",
        base64Data: fs.readFileSync(filePath).toString("base64"),
      });
    }

    if (frames.length === 0) {
      cleanupTempPaths(tempFiles);
      return null;
    }

    return {
      frames,
      frameTimestamps: timemarks.slice(0, frames.length),
      durationSec: fullDurationSec,
      analyzedDurationSec: plan.analyzedDurationSec,
      tempFiles,
    };
  } catch {
    cleanupTempPaths(tempFiles);
    return null;
  }
}

async function transcribeVideoAudio(
  videoBlob: Blob,
  fileName: string,
  mimeType: string
): Promise<{
  transcript: string;
  segments: Array<{ text: string; start: number; end: number }>;
  error?: string;
  extractionNote?: string;
}> {
  const openai = getOpenAIClient();

  if (!openai) {
    return {
      transcript: "",
      segments: [],
      error:
        "OPENAI_API_KEY is not configured. Set it in .env.local to enable audio transcription.",
    };
  }

  let blobToTranscribe = videoBlob;
  let nameToUse = fileName || "video.mp4";
  let typeToUse = mimeType || "video/mp4";
  let extractionNote: string | undefined;
  let tempFiles: string[] = [];

  if (videoBlob.size > WHISPER_MAX_BYTES) {
    const sizeMb = (videoBlob.size / 1024 / 1024).toFixed(1);
    const extracted = await extractAudioFromVideo(videoBlob, fileName || "video.mp4");

    if (!extracted) {
      return {
        transcript: "",
        segments: [],
        error: `Video file is ${sizeMb}MB — exceeds Whisper's 24MB limit. Audio extraction also failed. Transcription skipped.`,
      };
    }

    const audioMb = (extracted.blob.size / 1024 / 1024).toFixed(1);

    if (extracted.blob.size > WHISPER_MAX_BYTES) {
      for (const f of extracted.tempFiles) {
        try { fs.unlinkSync(f); } catch { /* ignore */ }
      }
      return {
        transcript: "",
        segments: [],
        error: `Video file is ${sizeMb}MB — even after audio extraction (${audioMb}MB) exceeds the 24MB limit. Consider uploading as a script.`,
      };
    }

    blobToTranscribe = extracted.blob;
    nameToUse = "audio.mp3";
    typeToUse = "audio/mpeg";
    tempFiles = extracted.tempFiles;
    extractionNote = `Audio extracted from ${sizeMb}MB video (${audioMb}MB MP3 @ 64kbps) — full transcript available.`;
  }

  try {
    const file = new File(
      [await blobToTranscribe.arrayBuffer()],
      nameToUse,
      { type: typeToUse }
    );

    const response = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "verbose_json",
    });

    const transcript = response.text?.trim() ?? "";
    const segments =
      "segments" in response && Array.isArray(response.segments)
        ? response.segments.map((s) => ({
            text: s.text?.trim() ?? "",
            start: s.start ?? 0,
            end: s.end ?? 0,
          }))
        : [];

    if (!transcript) {
      return {
        transcript: "",
        segments: [],
        error:
          "Whisper returned an empty transcript — video may have no spoken audio.",
        extractionNote,
      };
    }

    return { transcript, segments, extractionNote };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Transcription failed";
    return { transcript: "", segments: [], error: msg, extractionNote };
  } finally {
    for (const f of tempFiles) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
  }
}

const MARKETING_SPEECH_RE =
  /\b(i |i'|you |we |this |that |buy |get |try |shop |order |link |bio |code |use |off |free |save |%|discount|offer|product|brand|guarantee|shipping|today|now|here's|don't|can't|won't|did you|have you|if you|when you)\b/i;

function segmentLooksLikeMarketing(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  if (MARKETING_SPEECH_RE.test(t)) return true;
  if (/\?/.test(t) && t.split(/\s+/).length >= 4) return true;
  return false;
}

function segmentLooksLikeLyrics(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  if (segmentLooksLikeMarketing(t)) return false;
  const words = t.split(/\s+/);
  if (words.length >= 6 && !MARKETING_SPEECH_RE.test(t)) return true;
  return false;
}

function extractMessagingHeuristic(
  rawTranscript: string,
  segments: Array<{ text: string; start: number; end: number }>
): { primary: string; background: string } {
  if (segments.length > 0) {
    const speechParts: string[] = [];
    const musicParts: string[] = [];

    for (const seg of segments) {
      const t = seg.text.trim();
      if (!t) continue;
      if (segmentLooksLikeMarketing(t)) speechParts.push(t);
      else if (segmentLooksLikeLyrics(t)) musicParts.push(t);
    }

    if (speechParts.length > 0) {
      return {
        primary: speechParts.join(" ").replace(/\s+/g, " ").trim(),
        background: musicParts.join(" ").replace(/\s+/g, " ").trim(),
      };
    }

    if (musicParts.length > 0) {
      return { primary: "", background: musicParts.join(" ").replace(/\s+/g, " ").trim() };
    }
  }

  const trimmed = rawTranscript.trim();
  if (!trimmed) return { primary: "", background: "" };

  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 1) {
    const speech = sentences.filter(segmentLooksLikeMarketing);
    const rest = sentences.filter((s) => !segmentLooksLikeMarketing(s));
    if (speech.length > 0) {
      return {
        primary: speech.join(" ").trim(),
        background: rest.join(" ").trim(),
      };
    }
  }

  if (segmentLooksLikeMarketing(trimmed)) {
    return { primary: trimmed, background: "" };
  }

  if (segmentLooksLikeLyrics(trimmed) || !MARKETING_SPEECH_RE.test(trimmed)) {
    return { primary: "", background: trimmed };
  }

  return { primary: "", background: trimmed };
}

const CREATIVE_BUCKET = "analysis-creatives";

/** Pull object path from a Supabase storage URL (public or signed). */
function storagePathFromUrl(url: string): string | null {
  const match = url.match(/analysis-creatives\/(.+?)(?:\?|$)/);
  return match?.[1] ?? null;
}

async function blobToImageInput(blob: Blob): Promise<ImageInput> {
  const buffer = await blob.arrayBuffer();
  const mediaType: "image/jpeg" | "image/png" = blob.type.includes("png")
    ? "image/png"
    : "image/jpeg";

  return { mediaType, base64Data: Buffer.from(buffer).toString("base64") };
}

/** Prefer authenticated storage download — bucket is private. */
async function loadThumbnailImage(
  supabase: SupabaseClient,
  thumbnailUrl: string
): Promise<ImageInput | null> {
  const storagePath = storagePathFromUrl(thumbnailUrl);
  if (storagePath) {
    try {
      const { data, error } = await supabase.storage
        .from(CREATIVE_BUCKET)
        .download(storagePath);

      if (data && !error) {
        return blobToImageInput(data);
      }
    } catch {
      // Fall through to HTTP fetch for legacy public buckets.
    }
  }

  try {
    const res = await fetch(thumbnailUrl, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return blobToImageInput(await res.blob());
  } catch {
    return null;
  }
}

async function analyzeVideoLayers(
  images: ImageInput[],
  rawTranscript: string,
  frameMeta?: {
    frameTimestamps: string[];
    durationSec?: number;
    analyzedDurationSec?: number;
  }
): Promise<VideoAnalysisResult> {
  const hasTranscript = Boolean(rawTranscript.trim());
  const hasImages = images.length > 0;

  if (!hasTranscript && !hasImages) {
    return {
      visualDescription: "No visual frames or transcript available for this video.",
      primaryMessaging: "",
      backgroundAudioNote: "",
      onScreenText: "",
    };
  }

  const promptParts: string[] = [];

  if (hasTranscript) {
    promptParts.push(
      "RAW WHISPER TRANSCRIPT (may mix voiceover with background song lyrics — separate layers):",
      `"${rawTranscript}"`,
      ""
    );
  }

  if (hasImages) {
    const durationNote =
      frameMeta?.durationSec && frameMeta.durationSec > 0
        ? `Full video ~${frameMeta.durationSec.toFixed(1)}s. `
        : "";
    const analyzedNote =
      frameMeta?.analyzedDurationSec && frameMeta.analyzedDurationSec > 0
        ? `Visual sampling covers first ${frameMeta.analyzedDurationSec.toFixed(0)}s. `
        : "";
    const timestampNote =
      frameMeta?.frameTimestamps?.length === images.length
        ? `Approx capture times: ${frameMeta.frameTimestamps.join(", ")}. `
        : "";
    promptParts.push(
      `${durationNote}${analyzedNote}${timestampNote}${images.length} frames attached in chronological order — analyze ALL frames before describing on-screen text or visual persistence.`,
      "Describe visuals AND separate primary selling messaging from background audio.",
      "If the same on-screen text appears in multiple frames, report it as recurring/persistent — not one-off."
    );
  } else {
    promptParts.push(
      "No visual frames available. Separate primary selling messaging from background audio in the transcript above."
    );
  }

  try {
    const result = await callClaudeJSON<VideoAnalysisResult>({
      system: VIDEO_CREATIVE_ANALYSIS_SYSTEM,
      prompt: promptParts.join("\n"),
      images: hasImages ? images : undefined,
      maxTokens: 1200,
      temperature: 0.15,
    });

    return {
      visualDescription:
        result.visualDescription?.trim() ||
        (hasImages
          ? "Visual frame analysis could not be completed."
          : "Visual frame unavailable — audio analysis only."),
      visualTimeline: result.visualTimeline?.filter(Boolean),
      primaryMessaging: result.primaryMessaging?.trim() ?? "",
      backgroundAudioNote: result.backgroundAudioNote?.trim() ?? "",
      onScreenText: result.onScreenText?.trim() ?? "",
      onScreenTextPersistence: result.onScreenTextPersistence?.trim(),
      separationNotes: result.separationNotes?.trim(),
    };
  } catch {
    return {
      visualDescription: hasImages
        ? "Visual frame analysis could not be completed."
        : "Visual frame unavailable.",
      primaryMessaging: "",
      backgroundAudioNote: "",
      onScreenText: "",
    };
  }
}

function resolveMessagingLayers(
  rawTranscript: string,
  segments: Array<{ text: string; start: number; end: number }>,
  analysis: VideoAnalysisResult,
  messagingSourceOverride?: VideoCreativeContext["messagingSource"]
): Pick<
  VideoCreativeContext,
  "primaryMessaging" | "backgroundAudioNote" | "onScreenText" | "processingNotes" | "messagingSource"
> {
  const notes: string[] = [];
  const primaryMessaging = analysis.primaryMessaging;
  const backgroundAudioNote = analysis.backgroundAudioNote;
  const onScreenText = analysis.onScreenText;
  const messagingSource: VideoCreativeContext["messagingSource"] =
    messagingSourceOverride ?? "ai_layers";

  if (analysis.separationNotes) {
    notes.push(analysis.separationNotes);
  }
  if (analysis.onScreenTextPersistence) {
    notes.push(`On-screen text persistence: ${analysis.onScreenTextPersistence}`);
  }

  if (primaryMessaging) {
    return {
      primaryMessaging,
      backgroundAudioNote,
      onScreenText,
      processingNotes: notes,
      messagingSource,
    };
  }

  const heuristic = extractMessagingHeuristic(rawTranscript, segments);
  if (heuristic.primary) {
    notes.push(
      "Primary messaging isolated via speech heuristics — background lyrics excluded from script analysis."
    );
    return {
      primaryMessaging: heuristic.primary,
      backgroundAudioNote: heuristic.background || backgroundAudioNote,
      onScreenText,
      processingNotes: notes,
      messagingSource: "heuristic",
    };
  }

  if (rawTranscript.trim()) {
    notes.push(
      "No selling speech identified in audio — likely background music/lyrics only. Analyze on-screen text and visuals; do NOT treat song lyrics as brand copy."
    );
    return {
      primaryMessaging: "",
      backgroundAudioNote:
        backgroundAudioNote ||
        heuristic.background ||
        rawTranscript.trim(),
      onScreenText,
      processingNotes: notes,
      messagingSource: "visual_only",
    };
  }

  return {
    primaryMessaging: "",
    backgroundAudioNote,
    onScreenText,
    processingNotes: notes,
    messagingSource: "visual_only",
  };
}

/**
 * Full video creative processing:
 * 1. Downloads video from Supabase
 * 2. Whisper transcript (full audio text)
 * 3. Gemini Vertex full-video analysis when configured (preferred)
 * 4. Fallback: ffmpeg frame sampling + Claude Haiku vision
 */
export async function processVideoCreative(
  supabase: SupabaseClient,
  analysis: Analysis
): Promise<VideoCreativeContext> {
  const notes: string[] = [];
  let transcript = "";
  let whisperSegments: Array<{ text: string; start: number; end: number }> = [];
  let transcriptAvailable = false;
  let frameCount = 0;
  let frameImages: ImageInput[] = [];
  let frameTimestamps: string[] = [];
  let videoDurationSec: number | undefined;
  let analyzedDurationSec: number | undefined;
  let visualAnalysisMode: VideoCreativeContext["visualAnalysisMode"];
  let layerAnalysis: VideoAnalysisResult | null = null;
  let messagingSourceOverride: VideoCreativeContext["messagingSource"] | undefined;
  let geminiVisualContext: string | undefined;
  let geminiAnalysis: VideoAnalysisResult | undefined;

  const storagePath = analysis.creative_storage_path;
  let videoBlob: Blob | null = null;

  if (storagePath) {
    try {
      const { data, error: downloadError } = await supabase.storage
        .from("analysis-creatives")
        .download(storagePath);

      if (downloadError || !data) {
        notes.push(
          downloadError?.message
            ? `Could not download video: ${downloadError.message}`
            : "Video file not found in storage."
        );
      } else {
        videoBlob = data;
      }
    } catch (err) {
      notes.push(
        `Video download error: ${err instanceof Error ? err.message : "unknown"}`
      );
    }
  } else {
    notes.push("No video storage path on this analysis record.");
  }

  if (videoBlob) {
    const mimeType = analysis.creative_mime_type ?? "video/mp4";
    const fileName = analysis.creative_file_name ?? "video.mp4";

    const { transcript: t, segments, error: transcriptError, extractionNote } =
      await transcribeVideoAudio(videoBlob, fileName, mimeType);

    if (extractionNote) notes.push(extractionNote);
    if (transcriptError) {
      notes.push(transcriptError);
    } else {
      transcript = t;
      whisperSegments = segments;
      transcriptAvailable = true;
    }

    if (isGeminiVertexConfigured()) {
      const prepared = await prepareVideoBlobForGemini(videoBlob, fileName);
      if (prepared) {
        try {
          const gemini = await analyzeVideoWithGeminiVertex({
            videoBlob: prepared.blob,
            mimeType: "video/mp4",
            whisperTranscript: transcript || undefined,
          });
          layerAnalysis = gemini.analysis;
          geminiAnalysis = gemini.analysis;
          messagingSourceOverride = "gemini_vertex";
          visualAnalysisMode = "gemini_vertex";
          frameCount = 0;
          videoDurationSec = prepared.fullDurationSec;
          analyzedDurationSec = prepared.analyzedDurationSec;
          geminiVisualContext = formatGeminiVisualContextForGrading(
            gemini.analysis,
            {
              analyzedDurationSec: prepared.analyzedDurationSec,
              videoDurationSec: prepared.fullDurationSec,
              model: gemini.model,
            }
          );
          const mb = (gemini.compressedBytes / 1024 / 1024).toFixed(1);
          notes.push(
            `Visual analysis: Gemini Vertex full-video pass (${gemini.model}, ${mb}MB compressed, first ${Math.round(prepared.analyzedDurationSec)}s). Claude agents use Gemini visual ground truth for retention.`
          );
        } catch (err) {
          notes.push(
            `Gemini Vertex video analysis failed — falling back to frame sampling: ${
              err instanceof Error ? err.message : "unknown error"
            }`
          );
        } finally {
          cleanupTempPaths(prepared.tempFiles);
        }
      } else {
        notes.push(
          "Gemini video prep failed (trim/compress) — falling back to frame sampling."
        );
      }
    } else {
      notes.push(
        "Gemini Vertex not configured — using frame sampling fallback. Set GOOGLE_CLOUD_PROJECT + GOOGLE_SERVICE_ACCOUNT_JSON."
      );
    }
  }

  if (!layerAnalysis && videoBlob) {
    const extracted = await extractVideoFrames(
      videoBlob,
      analysis.creative_file_name ?? "video.mp4"
    );
    if (extracted) {
      frameImages = extracted.frames;
      frameTimestamps = extracted.frameTimestamps;
      frameCount = extracted.frames.length;
      videoDurationSec = extracted.durationSec;
      analyzedDurationSec = extracted.analyzedDurationSec;
      visualAnalysisMode = "timeline_sampling";
      const durationLabel = extracted.durationSec
        ? `~${extracted.durationSec.toFixed(0)}s video`
        : "full video";
      const analyzedLabel =
        extracted.durationSec &&
        extracted.analyzedDurationSec < extracted.durationSec - 1
          ? `first ${extracted.analyzedDurationSec.toFixed(0)}s`
          : "full length";
      notes.push(
        `Visual analysis fallback: ${frameCount} frames across ${analyzedLabel} of ${durationLabel} (~every ${(extracted.analyzedDurationSec / frameCount).toFixed(1)}s) via Claude Haiku.`
      );
      cleanupTempPaths(extracted.tempFiles);
    } else {
      notes.push(
        "Multi-frame extraction failed — falling back to stored thumbnail if available."
      );
    }
  }

  if (!layerAnalysis && frameImages.length === 0 && analysis.thumbnail_url) {
    const thumbnailImage = await loadThumbnailImage(supabase, analysis.thumbnail_url);
    if (thumbnailImage) {
      frameImages = [thumbnailImage];
      frameCount = 1;
      frameTimestamps = ["~0:01 (upload thumbnail only)"];
      visualAnalysisMode = "thumbnail_fallback";
      notes.push(
        "Visual analysis used upload thumbnail only — full video analysis was unavailable."
      );
    } else {
      notes.push(
        "Thumbnail frame could not be loaded from storage for visual analysis."
      );
    }
  } else if (!layerAnalysis && frameImages.length === 0) {
    notes.push("No video frames available — visual analysis skipped.");
  }

  if (!layerAnalysis) {
    layerAnalysis = await analyzeVideoLayers(frameImages, transcript, {
      frameTimestamps,
      durationSec: videoDurationSec,
      analyzedDurationSec,
    });
  }

  const messaging = resolveMessagingLayers(
    transcript,
    whisperSegments,
    layerAnalysis,
    messagingSourceOverride
  );

  return {
    transcript,
    primaryMessaging: messaging.primaryMessaging,
    backgroundAudioNote: messaging.backgroundAudioNote,
    onScreenText: messaging.onScreenText,
    messagingSource: messaging.messagingSource,
    transcriptAvailable,
    visualDescription: layerAnalysis.visualDescription,
    visualTimeline: layerAnalysis.visualTimeline,
    frameTimestamps: frameTimestamps.length > 0 ? frameTimestamps : undefined,
    frameCount,
    analyzedDurationSec,
    videoDurationSec,
    visualAnalysisMode,
    geminiAnalysis,
    geminiVisualContext,
    processingNotes: [...notes, ...messaging.processingNotes],
  };
}

/**
 * Builds the combined creative brief that all agents receive.
 * Primary messaging is the script; background audio is context only.
 */
function looksLikeMetaCritiqueFormat(ctx: VideoCreativeContext): boolean {
  if (
    ctx.processingNotes.some((n) =>
      /reference ad copy|meta-critique|teardown format/i.test(n)
    )
  ) {
    return true;
  }
  const spoken = (ctx.primaryMessaging || "").toLowerCase();
  if (!ctx.onScreenText?.trim() || !spoken) return false;
  return /\b(this ad|that ad|these ads|making a mistake|let me break|roasting|critiqu|teardown|look at this|why this|reacting to)\b/.test(
    spoken
  );
}

export function buildVideoBrief(
  ctx: VideoCreativeContext,
  fileName?: string
): { text: string; thumbnailForAgents: null } {
  const lines: string[] = [
    `AD CREATIVE — VIDEO${fileName ? ` ("${fileName}")` : ""}`,
    "",
    "VIDEO VISUAL ANALYSIS (mandatory — read before critiquing visuals or on-screen text):",
    ctx.visualAnalysisMode === "gemini_vertex"
      ? `- FULL VIDEO analyzed natively via Gemini Vertex${ctx.analyzedDurationSec ? ` (first ${Math.round(ctx.analyzedDurationSec)}s` : ""}${ctx.videoDurationSec ? ` of ~${Math.round(ctx.videoDurationSec)}s ad` : ""}${ctx.analyzedDurationSec ? ")" : ""}. Visual timeline reflects the complete watch — NOT frame sampling.`
      : ctx.visualAnalysisMode === "timeline_sampling"
        ? `- Frame-sampled coverage via ${ctx.frameCount} evenly spaced frames${ctx.analyzedDurationSec ? ` across the first ${Math.round(ctx.analyzedDurationSec)}s` : ""}${ctx.videoDurationSec ? ` of a ~${Math.round(ctx.videoDurationSec)}s ad` : ""} (~every 3s). Be conservative about timing between frames.`
        : `- Limited visual coverage (${ctx.frameCount} frame${ctx.frameCount !== 1 ? "s" : ""}) — be conservative about timing claims.`,
    "- If on-screen text is marked persistent/recurring in the visual timeline, NEVER describe it as appearing only once.",
    "- Do NOT invent timing claims (flash, brief, one-time) unless the visual timeline shows a single appearance only.",
    ctx.visualAnalysisMode === "gemini_vertex"
      ? "- Gemini watched the full video; Whisper transcript below is supplementary raw speech text."
      : "- Full Whisper transcript covers audio across the entire video; visual notes may be sampled frames only.",
    "",
    "VIDEO AUDIO LAYER RULE (mandatory):",
    "- PRIMARY AD MESSAGING = spoken voiceover, creator talking, narrator, intentional marketing dialogue, on-screen sell copy.",
    "- BACKGROUND AUDIO = music, song lyrics, trending sounds, ambient SFX — NOT brand copy unless clearly lip-synced/intentional as the hook.",
    "- Analyze, score, critique, and rewrite ONLY primary messaging + on-screen text + visuals.",
    "- NEVER quote, critique, or rewrite background song lyrics as if the brand wrote them.",
    "",
  ];

  if (ctx.primaryMessaging) {
    lines.push(
      "PRIMARY AD MESSAGING (this IS the ad script — hook, claims, CTA come from here):"
    );
    lines.push(`"${ctx.primaryMessaging}"`);
  } else if (ctx.onScreenText) {
    lines.push(
      "PRIMARY AD MESSAGING: No isolated spoken sell identified. Use ON-SCREEN TEXT below as the script. Background audio is not ad copy."
    );
  } else if (ctx.transcriptAvailable) {
    lines.push(
      "PRIMARY AD MESSAGING: No selling speech identified — audio appears to be background music/lyrics only. Analyze VISUAL CONTEXT and product presentation. Do NOT invent a script from song lyrics."
    );
  } else {
    lines.push(
      "PRIMARY AD MESSAGING: Not available — analyze on-screen text and visual context only."
    );
  }

  if (ctx.onScreenText) {
    lines.push("");
    if (looksLikeMetaCritiqueFormat(ctx)) {
      lines.push(
        "ON-SCREEN TEXT (reference ad / clip being shown or critiqued — NOT the advertiser's own hook; viewers understand this as setup for a teardown/reaction):"
      );
    } else {
      lines.push(
        "ON-SCREEN TEXT (part of the sell — analyze as script if no spoken messaging):"
      );
    }
    lines.push(`"${ctx.onScreenText}"`);
    if (ctx.geminiAnalysis?.onScreenTextPersistence) {
      lines.push(
        `Persistence: ${ctx.geminiAnalysis.onScreenTextPersistence}`
      );
    }
  }

  if (ctx.backgroundAudioNote) {
    lines.push("");
    lines.push(
      "BACKGROUND AUDIO (context only — NOT ad copy; never critique or rewrite as brand messaging):"
    );
    lines.push(`"${ctx.backgroundAudioNote}"`);
  }

  lines.push("");
  if (ctx.visualAnalysisMode === "gemini_vertex") {
    lines.push(
      `VISUAL CONTEXT (full video — Gemini Vertex${ctx.videoDurationSec ? `, ~${Math.round(ctx.videoDurationSec)}s` : ""}):`
    );
  } else {
    lines.push(
      `VISUAL CONTEXT (${ctx.frameCount} evenly spaced frame${ctx.frameCount !== 1 ? "s" : ""}${ctx.videoDurationSec ? ` across ~${Math.round(ctx.videoDurationSec)}s` : ""}):`
    );
  }
  lines.push(ctx.visualDescription);

  if (ctx.geminiAnalysis?.firstThreeSeconds) {
    lines.push("");
    lines.push("FIRST THREE SECONDS:", ctx.geminiAnalysis.firstThreeSeconds);
  }

  if (
    ctx.geminiAnalysis?.coldScrollStopScore != null ||
    ctx.geminiAnalysis?.coldScrollStopEvidence
  ) {
    lines.push("");
    lines.push(
      `COLD SCROLL-STOP (0-10): ${ctx.geminiAnalysis.coldScrollStopScore ?? "n/a"}`
    );
    if (ctx.geminiAnalysis.coldScrollStopEvidence) {
      lines.push(ctx.geminiAnalysis.coldScrollStopEvidence);
    }
  }

  if (
    ctx.geminiAnalysis?.watchThroughScore != null ||
    ctx.geminiAnalysis?.watchThroughEvidence
  ) {
    lines.push("");
    lines.push(
      `WATCH-THROUGH QUALITY (0-10): ${ctx.geminiAnalysis.watchThroughScore ?? "n/a"}`
    );
    if (ctx.geminiAnalysis.watchThroughEvidence) {
      lines.push(ctx.geminiAnalysis.watchThroughEvidence);
    }
  }

  if (ctx.geminiAnalysis?.dropOffMoments?.length) {
    lines.push("");
    lines.push("DROP-OFF MOMENTS:");
    for (const m of ctx.geminiAnalysis.dropOffMoments) {
      lines.push(`- ${m}`);
    }
  }

  if (ctx.geminiAnalysis?.productVisibility) {
    lines.push("");
    lines.push("PRODUCT VISIBILITY:", ctx.geminiAnalysis.productVisibility);
  }

  if (ctx.visualTimeline?.length) {
    lines.push("");
    lines.push(
      ctx.visualAnalysisMode === "gemini_vertex"
        ? "VISUAL TIMELINE (full video, chronological):"
        : "VISUAL TIMELINE (sampled frames, chronological):"
    );
    for (const entry of ctx.visualTimeline) {
      lines.push(`- ${entry}`);
    }
  }

  if (ctx.frameTimestamps?.length && ctx.frameCount > 1) {
    lines.push("");
    lines.push(`Frame capture times: ${ctx.frameTimestamps.join(" · ")}`);
  }

  if (ctx.processingNotes.length > 0) {
    lines.push("");
    lines.push("Processing notes: " + ctx.processingNotes.join(" | "));
  }

  return { text: lines.join("\n"), thumbnailForAgents: null };
}
