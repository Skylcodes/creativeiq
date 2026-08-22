import "server-only";
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { parseJsonObject } from "@/lib/ai/parse-json";
import {
  VIDEO_ANALYSIS_JSON_SCHEMA,
  type VideoAnalysisResult,
} from "@/lib/ai/video-analysis-types";

const DEFAULT_VERTEX_MODEL = "gemini-2.5-flash";
/** Vertex inline payload safety margin after ffmpeg compress/trim. */
const MAX_INLINE_VIDEO_BYTES = 18 * 1024 * 1024;

let cachedClient: GoogleGenAI | null = null;

const GEMINI_VIDEO_ANALYSIS_INSTRUCTIONS = `You analyze short-form video advertisements for a creative intelligence platform.

You are watching the FULL attached video (visual + audio continuous timeline) — NOT a thumbnail and NOT sparse frames.

PRIMARY AD MESSAGING (this IS the script):
- Spoken voiceover selling the product
- Creator/influencer talking to camera
- Narrator dialogue with marketing intent
- Intentional spoken claims, offers, CTAs
- On-screen text that carries the sell

BACKGROUND AUDIO (NOT brand copy):
- Background music and song lyrics underneath speech
- Trending TikTok/Reels audio, ambient SFX, beat drops
- Do NOT treat song lyrics as brand copy unless clearly intentional (lip-sync hook synced to product reveal)

VISUAL ACCURACY RULES (critical — grading depends on this):
1. Watch the entire attached video before judging persistence, pacing, or on-screen text.
2. If the same text/visual recurs across moments, call it RECURRING/PERSISTENT — never "only once" or "brief flash" unless it truly appears once.
3. visualTimeline must be chronological with approximate timestamps (~0:00, ~0:04, …) covering opening → mid → close.
4. onScreenTextPersistence must state which quoted text persists vs changes, with time ranges.
5. firstThreeSeconds must describe the actual opening beat a cold feed viewer sees/hears.
6. coldScrollStopScore (0-10) — CALIBRATED. Most ads are 3–6. A talking head, on-screen text, or a visible product is TABLE STAKES (5–6), not a 7.
   0–2 POOR: almost everyone keeps scrolling (logo open, dead first frame, no reason to stop)
   3–4 WEAK: some pause, most thumbs keep moving
   5–6 AVERAGE: functional open, forgettable; mixed stop rate
   7–8 GOOD: a cold stranger would actually stop — pattern interrupt, tension, or visual stakes in 0–1s. Must cite the exact interrupt.
   9–10 EXCEPTIONAL: immediate "wait what" — rare. Do not give 9 because the video is "nice."
   Evidence must name the exact visual/audio interrupt. Do NOT score 7+ for unused-style reasons, and do NOT suppress a 7+ that is earned.
7. watchThroughScore (0-10) — same calibration. 7+ only if most viewers would reach the payoff. "Could use more cuts" is NOT a low score unless they would actually drop. Empty dropOffMoments + 5/10 is a contradiction — if they stay, score like they stay; if you list drop-offs, the score cannot be 8+.
8. dropOffMoments: timestamps where a cold viewer would realistically swipe — empty array if retention holds. Do not invent drop-offs for theoretical polish. If you list 2+ drop-offs, watchThroughScore must be ≤6.
9. Quote onScreenText exactly when visible. Consolidate distinct overlays.
10. META-CRITIQUE: if on-screen text belongs to a reference/competitor clip being shown while the creator speaks over it, still quote it in onScreenText but explain in separationNotes that it is REFERENCE AD COPY — not the advertiser's sell. primaryMessaging = only the creator's spoken critique/pitch/CTA.

SEPARATION RULES:
- Ask: "What words are actually used to SELL?" — not "what words exist in the audio?"
- Creator speaking OVER music → primaryMessaging = spoken words only; lyrics → backgroundAudioNote
- If WHISPER TRANSCRIPT is provided, use it to improve speech accuracy, but TRUST THE VIDEO for visuals, timing, on-screen text, and retention judgments

${VIDEO_ANALYSIS_JSON_SCHEMA}`;

/** Vertex structured-output schema — prevents malformed JSON in long string fields. */
const VIDEO_ANALYSIS_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    visualDescription: {
      type: Type.STRING,
      description:
        "180-280 word analytical description of the full watched video.",
    },
    visualTimeline: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Chronological beats with approximate timestamps.",
    },
    primaryMessaging: {
      type: Type.STRING,
      description: "Only the actual selling speech/copy.",
    },
    backgroundAudioNote: {
      type: Type.STRING,
      description: "Non-marketing music/lyrics/SFX, or empty string.",
    },
    onScreenText: {
      type: Type.STRING,
      description: "Quoted on-screen copy consolidated.",
    },
    onScreenTextPersistence: { type: Type.STRING },
    separationNotes: { type: Type.STRING },
    coldScrollStopScore: { type: Type.INTEGER },
    coldScrollStopEvidence: { type: Type.STRING },
    watchThroughScore: { type: Type.INTEGER },
    watchThroughEvidence: { type: Type.STRING },
    firstThreeSeconds: { type: Type.STRING },
    dropOffMoments: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    productVisibility: { type: Type.STRING },
    visualStyle: { type: Type.STRING },
    emotionalCharacteristics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    endingDescription: { type: Type.STRING },
  },
  required: [
    "visualDescription",
    "primaryMessaging",
    "backgroundAudioNote",
    "onScreenText",
    "coldScrollStopScore",
    "coldScrollStopEvidence",
    "watchThroughScore",
    "watchThroughEvidence",
    "firstThreeSeconds",
  ],
};

function readEnvInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function clampScore(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(10, Math.round(value)));
}

export function isGeminiVertexConfigured(): boolean {
  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  if (!project) return false;
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim());
}

function getVertexGenAI(): GoogleGenAI {
  if (cachedClient) return cachedClient;

  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  const location = process.env.GOOGLE_CLOUD_LOCATION?.trim() || "us-central1";
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!project || !raw) {
    throw new Error("Gemini Vertex is not configured.");
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }

  cachedClient = new GoogleGenAI({
    vertexai: true,
    project,
    location,
    googleAuthOptions: { credentials },
  });
  return cachedClient;
}

export function vertexVideoModelLabel(): string {
  return process.env.GOOGLE_VERTEX_VIDEO_MODEL?.trim() || DEFAULT_VERTEX_MODEL;
}

function parseAnalysisJson(raw: string): VideoAnalysisResult {
  return parseJsonObject<VideoAnalysisResult>(raw);
}

function normalizeAnalysis(analysis: VideoAnalysisResult): VideoAnalysisResult {
  return {
    visualDescription: analysis.visualDescription?.trim() ?? "",
    visualTimeline: analysis.visualTimeline?.filter(Boolean),
    primaryMessaging: analysis.primaryMessaging?.trim() ?? "",
    backgroundAudioNote: analysis.backgroundAudioNote?.trim() ?? "",
    onScreenText: analysis.onScreenText?.trim() ?? "",
    onScreenTextPersistence: analysis.onScreenTextPersistence?.trim(),
    separationNotes: analysis.separationNotes?.trim(),
    coldScrollStopScore: clampScore(analysis.coldScrollStopScore),
    coldScrollStopEvidence: analysis.coldScrollStopEvidence?.trim(),
    watchThroughScore: clampScore(analysis.watchThroughScore),
    watchThroughEvidence: analysis.watchThroughEvidence?.trim(),
    firstThreeSeconds: analysis.firstThreeSeconds?.trim(),
    dropOffMoments: analysis.dropOffMoments?.filter(Boolean),
    productVisibility: analysis.productVisibility?.trim(),
    visualStyle: analysis.visualStyle?.trim(),
    emotionalCharacteristics: analysis.emotionalCharacteristics?.filter(Boolean),
    endingDescription: analysis.endingDescription?.trim(),
  };
}

export type GeminiVideoAnalysisInput = {
  videoBlob: Blob;
  mimeType?: string;
  /** Optional Whisper transcript — improves speech separation, not required */
  whisperTranscript?: string;
};

export type GeminiVideoAnalysisOutput = {
  analysis: VideoAnalysisResult;
  compressedBytes: number;
  model: string;
};

/**
 * Full-video understanding via Gemini on Vertex AI (one Flash call).
 * Caller should compress/trim the blob first when possible.
 */
export async function analyzeVideoWithGeminiVertex(
  input: GeminiVideoAnalysisInput
): Promise<GeminiVideoAnalysisOutput> {
  if (!isGeminiVertexConfigured()) {
    throw new Error("Gemini Vertex is not configured.");
  }

  const buffer = Buffer.from(await input.videoBlob.arrayBuffer());
  if (buffer.byteLength === 0) {
    throw new Error("Empty video blob.");
  }
  if (buffer.byteLength > MAX_INLINE_VIDEO_BYTES) {
    throw new Error(
      `Video too large for inline Vertex upload (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB > ${Math.round(MAX_INLINE_VIDEO_BYTES / 1024 / 1024)}MB).`
    );
  }

  const mimeType = input.mimeType?.trim() || "video/mp4";
  const base64Video = buffer.toString("base64");
  const model = vertexVideoModelLabel();

  const promptParts: string[] = [
    "Analyze this video advertisement end-to-end. Output structured JSON only.",
    GEMINI_VIDEO_ANALYSIS_INSTRUCTIONS,
  ];

  if (input.whisperTranscript?.trim()) {
    promptParts.push(
      "",
      "WHISPER TRANSCRIPT (may mix voiceover with background lyrics — use for speech accuracy only):",
      `"${input.whisperTranscript.trim()}"`
    );
  }

  const ai = getVertexGenAI();
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Video,
            },
          },
          { text: promptParts.join("\n") },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      maxOutputTokens: readEnvInt("GOOGLE_VERTEX_VIDEO_MAX_TOKENS", 4096, 512, 8192),
      responseMimeType: "application/json",
      responseSchema: VIDEO_ANALYSIS_RESPONSE_SCHEMA,
    },
  });

  const rawText = response.text?.trim();
  if (!rawText) {
    throw new Error("Gemini Vertex returned an empty video analysis response.");
  }

  return {
    analysis: normalizeAnalysis(parseAnalysisJson(rawText)),
    compressedBytes: buffer.byteLength,
    model,
  };
}

/**
 * Builds the grading ground-truth block Claude agents must follow for retention/visuals.
 */
export function formatGeminiVisualContextForGrading(
  analysis: VideoAnalysisResult,
  meta?: {
    analyzedDurationSec?: number;
    videoDurationSec?: number;
    model?: string;
  }
): string {
  const lines: string[] = [
    "=== VIDEO VISUAL ANALYSIS (Gemini full-video watch — GROUND TRUTH) ===",
    "Claude grading agents have NOT watched the video. Treat the findings below as authoritative for visuals, pacing, on-screen text persistence, and retentionScore inputs. Do not invent timing claims that contradict this section.",
  ];

  if (meta?.analyzedDurationSec || meta?.videoDurationSec) {
    lines.push(
      `Coverage: ${meta.analyzedDurationSec ? `first ~${Math.round(meta.analyzedDurationSec)}s` : "analyzed segment"}${meta.videoDurationSec ? ` of ~${Math.round(meta.videoDurationSec)}s ad` : ""}${meta.model ? ` via ${meta.model}` : ""}.`
    );
  }

  lines.push("", "VISUAL DESCRIPTION:", analysis.visualDescription || "(none)");

  if (analysis.firstThreeSeconds) {
    lines.push("", "FIRST THREE SECONDS:", analysis.firstThreeSeconds);
  }

  if (analysis.coldScrollStopScore != null || analysis.coldScrollStopEvidence) {
    lines.push(
      "",
      `COLD SCROLL-STOP (0-10): ${analysis.coldScrollStopScore ?? "n/a"}`,
      analysis.coldScrollStopEvidence ?? ""
    );
  }

  if (analysis.watchThroughScore != null || analysis.watchThroughEvidence) {
    lines.push(
      "",
      `WATCH-THROUGH QUALITY (0-10): ${analysis.watchThroughScore ?? "n/a"}`,
      analysis.watchThroughEvidence ?? ""
    );
  }

  if (analysis.dropOffMoments?.length) {
    lines.push("", "DROP-OFF MOMENTS:");
    for (const m of analysis.dropOffMoments) lines.push(`- ${m}`);
  }

  if (analysis.productVisibility) {
    lines.push("", "PRODUCT VISIBILITY:", analysis.productVisibility);
  }

  if (analysis.visualStyle) {
    lines.push("", "VISUAL STYLE:", analysis.visualStyle);
  }

  if (analysis.emotionalCharacteristics?.length) {
    lines.push(
      "",
      "OBSERVABLE EMOTIONAL/ATTENTION CHARACTERISTICS (execution properties, not guaranteed viewer reactions):",
      analysis.emotionalCharacteristics.join(", ")
    );
  }

  if (analysis.endingDescription) {
    lines.push("", "ENDING:", analysis.endingDescription);
  }

  if (analysis.onScreenText) {
    lines.push("", "ON-SCREEN TEXT:", `"${analysis.onScreenText}"`);
  }
  if (analysis.onScreenTextPersistence) {
    lines.push("ON-SCREEN TEXT PERSISTENCE:", analysis.onScreenTextPersistence);
  }

  if (analysis.visualTimeline?.length) {
    lines.push("", "VISUAL TIMELINE:");
    for (const entry of analysis.visualTimeline) lines.push(`- ${entry}`);
  }

  lines.push(
    "",
    "RETENTION SCORING CONTRACT (retentionScore only):",
    "- You did NOT watch this video. retentionScore must follow these Gemini watch signals — never copy quality, CTA strength, or offer clarity.",
    "- Map coldScrollStopScore/watchThroughScore (0-10) to retention: ~3/10 → ~30 retention, ~5/10 → ~50, ~7/10 → ~70, ~9/10 → ~90. Table-stakes talking head/text alone is NOT 7+.",
    "- If dropOffMoments lists 2+ timestamps, retentionScore should not exceed ~55 unless evidence strongly contradicts.",
    "- Quote specific opening/pacing/timeline beats when scoring retention — generic strategy praise is invalid."
  );

  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}
