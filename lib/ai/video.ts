import "server-only";
import fs from "fs";
import os from "os";
import path from "path";
import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaudeJSON, type ImageInput } from "@/lib/ai/client";
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
  /** On-screen text/captions quoted from the frame */
  onScreenText: string;
  /** How primary vs background layers were separated */
  messagingSource: "ai_layers" | "heuristic" | "speech_only" | "visual_only";
  transcriptAvailable: boolean;
  visualDescription: string;
  frameCount: number;
  processingNotes: string[];
};

type VideoAnalysisResult = {
  visualDescription: string;
  primaryMessaging: string;
  backgroundAudioNote: string;
  onScreenText: string;
  separationNotes?: string;
};

const VIDEO_CREATIVE_ANALYSIS_SYSTEM = `You analyze video advertisements for a creative intelligence platform. Raw audio transcripts from Whisper often mix PRIMARY AD MESSAGING with BACKGROUND AUDIO — you must separate them.

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

SEPARATION RULES:
1. Ask: "What words are actually being used to SELL the product?" — not "what words exist in the audio?"
2. Speech that references the product, problem, offer, or CTA = primaryMessaging
3. Song lyrics with no marketing intent = backgroundAudioNote only
4. If creator speaks OVER music, primaryMessaging = the spoken words only; lyrics go to backgroundAudioNote
5. Lyrics ARE primary only when clearly intentional creative (lip-sync hook, lyrics synced to product reveal, text-on-screen matches lyrics as the hook) — rare; explain in separationNotes if so
6. Use audio prominence logic: foreground voice = primary; muffled/continuous under speech = background
7. Quote onScreenText exactly from the frame when visible

If no transcript provided, return empty strings for messaging fields and describe visuals only.
If transcript is only background music with no selling speech, primaryMessaging = "" and explain in backgroundAudioNote.

Return ONLY JSON:
{
  "visualDescription": "150-200 word analytical description: who/what on screen, style, mood, product, composition",
  "primaryMessaging": "only the actual selling speech/copy — empty string if none identified",
  "backgroundAudioNote": "music/lyrics/SFX identified as non-marketing, or empty if none",
  "onScreenText": "quoted on-screen copy or empty string",
  "separationNotes": "one sentence on how layers were separated, or empty"
}`;

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
  image: ImageInput | null,
  rawTranscript: string
): Promise<VideoAnalysisResult> {
  const hasTranscript = Boolean(rawTranscript.trim());
  const hasImage = Boolean(image);

  if (!hasTranscript && !hasImage) {
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

  if (hasImage) {
    promptParts.push(
      "Analyze the attached thumbnail frame plus the transcript above.",
      "Describe visuals AND separate primary selling messaging from background audio."
    );
  } else {
    promptParts.push(
      "No visual frame available. Separate primary selling messaging from background audio in the transcript above."
    );
  }

  try {
    const result = await callClaudeJSON<VideoAnalysisResult>({
      system: VIDEO_CREATIVE_ANALYSIS_SYSTEM,
      prompt: promptParts.join("\n"),
      image: image ?? undefined,
      maxTokens: 900,
      temperature: 0.15,
    });

    return {
      visualDescription:
        result.visualDescription?.trim() ||
        (hasImage
          ? "Visual frame analysis could not be completed."
          : "Visual frame unavailable — audio analysis only."),
      primaryMessaging: result.primaryMessaging?.trim() ?? "",
      backgroundAudioNote: result.backgroundAudioNote?.trim() ?? "",
      onScreenText: result.onScreenText?.trim() ?? "",
      separationNotes: result.separationNotes?.trim(),
    };
  } catch {
    return {
      visualDescription: hasImage
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
  analysis: VideoAnalysisResult
): Pick<
  VideoCreativeContext,
  "primaryMessaging" | "backgroundAudioNote" | "onScreenText" | "processingNotes" | "messagingSource"
> {
  const notes: string[] = [];
  const primaryMessaging = analysis.primaryMessaging;
  const backgroundAudioNote = analysis.backgroundAudioNote;
  const onScreenText = analysis.onScreenText;
  const messagingSource: VideoCreativeContext["messagingSource"] = "ai_layers";

  if (analysis.separationNotes) {
    notes.push(analysis.separationNotes);
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
 * 1. Downloads video from Supabase and transcribes audio via Whisper
 * 2. Fetches stored thumbnail and separates messaging layers via Claude (Haiku)
 * 3. Returns structured context used to build the agent brief
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
  let thumbnailImage: ImageInput | null = null;

  const storagePath = analysis.creative_storage_path;

  if (storagePath) {
    try {
      const { data: videoBlob, error: downloadError } = await supabase.storage
        .from("analysis-creatives")
        .download(storagePath);

      if (downloadError || !videoBlob) {
        notes.push(
          downloadError?.message
            ? `Could not download video: ${downloadError.message}`
            : "Video file not found in storage."
        );
      } else {
        const { transcript: t, segments, error: transcriptError, extractionNote } =
          await transcribeVideoAudio(
            videoBlob,
            analysis.creative_file_name ?? "video.mp4",
            analysis.creative_mime_type ?? "video/mp4"
          );

        if (extractionNote) {
          notes.push(extractionNote);
        }
        if (transcriptError) {
          notes.push(transcriptError);
        } else {
          transcript = t;
          whisperSegments = segments;
          transcriptAvailable = true;
        }
      }
    } catch (err) {
      notes.push(
        `Video download error: ${err instanceof Error ? err.message : "unknown"}`
      );
    }
  } else {
    notes.push("No video storage path on this analysis record.");
  }

  if (analysis.thumbnail_url) {
    thumbnailImage = await loadThumbnailImage(supabase, analysis.thumbnail_url);
    if (thumbnailImage) {
      frameCount = 1;
    } else {
      notes.push(
        "Thumbnail frame could not be loaded from storage for visual analysis."
      );
    }
  } else {
    notes.push("No thumbnail available — visual frame analysis skipped.");
  }

  const layerAnalysis = await analyzeVideoLayers(thumbnailImage, transcript);
  const messaging = resolveMessagingLayers(
    transcript,
    whisperSegments,
    layerAnalysis
  );

  return {
    transcript,
    primaryMessaging: messaging.primaryMessaging,
    backgroundAudioNote: messaging.backgroundAudioNote,
    onScreenText: messaging.onScreenText,
    messagingSource: messaging.messagingSource,
    transcriptAvailable,
    visualDescription: layerAnalysis.visualDescription,
    frameCount,
    processingNotes: [...notes, ...messaging.processingNotes],
  };
}

/**
 * Builds the combined creative brief that all agents receive.
 * Primary messaging is the script; background audio is context only.
 */
export function buildVideoBrief(
  ctx: VideoCreativeContext,
  fileName?: string
): { text: string; thumbnailForAgents: null } {
  const lines: string[] = [
    `AD CREATIVE — VIDEO${fileName ? ` ("${fileName}")` : ""}`,
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
    lines.push("ON-SCREEN TEXT (part of the sell — analyze as script if no spoken messaging):");
    lines.push(`"${ctx.onScreenText}"`);
  }

  if (ctx.backgroundAudioNote) {
    lines.push("");
    lines.push(
      "BACKGROUND AUDIO (context only — NOT ad copy; never critique or rewrite as brand messaging):"
    );
    lines.push(`"${ctx.backgroundAudioNote}"`);
  }

  lines.push("");
  lines.push(
    `VISUAL CONTEXT (${ctx.frameCount} frame${ctx.frameCount !== 1 ? "s" : ""} analyzed via thumbnail):`
  );
  lines.push(ctx.visualDescription);

  if (ctx.processingNotes.length > 0) {
    lines.push("");
    lines.push("Processing notes: " + ctx.processingNotes.join(" | "));
  }

  return { text: lines.join("\n"), thumbnailForAgents: null };
}
