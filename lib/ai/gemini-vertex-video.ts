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
   3–4 WEAK: some pause, most thumbs keep moving — boring, slow, static, repetitive, or hard to watch belongs HERE, not 5-6
   5–6 AVERAGE: functional open, forgettable; mixed stop rate
   7–8 GOOD: a cold stranger would actually stop — pattern interrupt, tension, or visual stakes in 0–1s. Must cite the exact interrupt.
   9–10 EXCEPTIONAL: immediate "wait what" — rare. Do not give 9 because the video is "nice."
   If the opening is boring, slow, static, predictable, or you would personally scroll away, score 2–4 — do NOT default to 5-6 just because a person or product is visible.
   Evidence must name the exact visual/audio interrupt. Do NOT score 7+ for unused-style reasons, and do NOT suppress a 7+ that is earned.
7. watchThroughScore (0-10) — same calibration. 7+ only if most viewers would reach the payoff. "Could use more cuts" is NOT a low score unless they would actually drop.
   Boring holds, repetition, dead time, or lack of curiosity → 2–4. Do NOT give 5-6 to a video that is genuinely difficult to sit through.
   Empty dropOffMoments + 5/10 is a contradiction — if they stay, score like they stay; if you list drop-offs, the score cannot be 8+.
   CONCEPT VS. EXECUTION — the most common scoring mistake: a video can have a clever premise (a reveal, a twist, a "report card," a before/after) while still failing to actually hold attention when watched. Having an interesting IDEA is not the same as being interesting to WATCH. Score the lived, moment-to-moment viewing experience, not the cleverness of the format. Concretely treat these as NEGATIVE signals that pull the score down, even in an otherwise well-structured video:
   - Dense on-screen text/UI the viewer must actively stop and read (a scrolling report, a wall of captions, a list of bullet points) — reading is friction, not engagement. If a viewer would need to pause to read it, that is a drop-off risk, not a payoff.
   - Flat, monotone, robotic, or low-energy vocal delivery (including AI-generated or scripted-sounding voiceover) — energy and tone drive watch-through as much as content does.
   - A screen-recording/tutorial/dashboard-demo aesthetic that resembles software documentation more than short-form entertainment — familiarity with the format does not equal enjoyment of it.
   - Long unbroken stretches (3+ seconds) where nothing new happens on screen even if audio is still talking.
   A video can legitimately score 7+ ONLY if, after weighing these friction points, a real cold viewer would still watch through — not merely because it has a beginning/middle/end structure.
8. dropOffMoments: timestamps where a cold viewer would realistically swipe — empty array if retention holds. Do not invent drop-offs for theoretical polish. If you list 2+ drop-offs, watchThroughScore must be ≤6. If ANY dropOffMoment is caused by dense text/reading burden (a viewer has to stop and read instead of watch), watchThroughScore must be ≤5 — reading-burden drop-offs are a harder stop than generic pacing complaints because the viewer disengages from the video entirely to read.
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

function parseAnalysisJson(raw: string, finishReason?: string): VideoAnalysisResult {
  try {
    return parseJsonObject<VideoAnalysisResult>(raw);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown parse error";
    if (finishReason === "MAX_TOKENS") {
      throw new Error(
        `Gemini video analysis JSON was truncated (MAX_TOKENS). Increase GOOGLE_VERTEX_VIDEO_MAX_TOKENS — ${detail}`
      );
    }
    throw new Error(`Could not parse Gemini video analysis JSON — ${detail}`);
  }
}

/** Matches dropOffMoments text describing reading burden — a harder stop than generic pacing complaints. */
const READING_BURDEN_PATTERN =
  /\b(read|reading|text[- ]heavy|dense text|wall of text|scroll(ing)? (text|report)|pause to read|stop(s)? to read|require[sd]? (active )?reading)\b/i;

/** Exported for unit testing — enforces internal consistency on raw Gemini output. */
export function normalizeAnalysis(analysis: VideoAnalysisResult): VideoAnalysisResult {
  let coldScrollStopScore = clampScore(analysis.coldScrollStopScore);
  let watchThroughScore = clampScore(analysis.watchThroughScore);
  const dropOffMoments = analysis.dropOffMoments?.filter(Boolean);
  const dropCount = dropOffMoments?.length ?? 0;
  const hasReadingBurdenDropOff = dropOffMoments?.some((m) => READING_BURDEN_PATTERN.test(m)) ?? false;

  // Enforce internal consistency — Gemini sometimes lists drop-offs but still
  // returns table-stakes 5-6 scores, which then fail to cap bad ads downstream.
  if (dropCount >= 2) {
    if (watchThroughScore != null) watchThroughScore = Math.min(watchThroughScore, 6);
    if (coldScrollStopScore != null) coldScrollStopScore = Math.min(coldScrollStopScore, 5);
  } else if (dropCount === 1) {
    if (watchThroughScore != null) watchThroughScore = Math.min(watchThroughScore, 7);
  }
  // Reading-burden drop-offs (dense on-screen text/report a viewer must stop and read)
  // are a harder disengagement than generic pacing complaints — the model sometimes
  // lists these but still scores watch-through as if the viewer stayed. Enforce the
  // stricter cap the prompt asks for regardless of what the model actually returned.
  if (hasReadingBurdenDropOff && watchThroughScore != null) {
    watchThroughScore = Math.min(watchThroughScore, 5);
  }

  return {
    visualDescription: analysis.visualDescription?.trim() ?? "",
    visualTimeline: analysis.visualTimeline?.filter(Boolean),
    primaryMessaging: analysis.primaryMessaging?.trim() ?? "",
    backgroundAudioNote: analysis.backgroundAudioNote?.trim() ?? "",
    onScreenText: analysis.onScreenText?.trim() ?? "",
    onScreenTextPersistence: analysis.onScreenTextPersistence?.trim(),
    separationNotes: analysis.separationNotes?.trim(),
    coldScrollStopScore,
    coldScrollStopEvidence: analysis.coldScrollStopEvidence?.trim(),
    watchThroughScore,
    watchThroughEvidence: analysis.watchThroughEvidence?.trim(),
    firstThreeSeconds: analysis.firstThreeSeconds?.trim(),
    dropOffMoments,
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
      maxOutputTokens: readEnvInt("GOOGLE_VERTEX_VIDEO_MAX_TOKENS", 8192, 1024, 8192),
      responseMimeType: "application/json",
      responseSchema: VIDEO_ANALYSIS_RESPONSE_SCHEMA,
    },
  });

  const rawText = response.text?.trim();
  if (!rawText) {
    throw new Error("Gemini Vertex returned an empty video analysis response.");
  }

  const finishReason = response.candidates?.[0]?.finishReason;

  return {
    analysis: normalizeAnalysis(parseAnalysisJson(rawText, finishReason)),
    compressedBytes: buffer.byteLength,
    model,
  };
}

/**
 * Retention-only calibration contract derived from this specific video's Gemini
 * watch signals. Kept separate (and short) from the full visual ground-truth
 * block so it can be appended cheaply next to the coldScrollStop/watchThrough
 * evidence already in the brief without duplicating the visual description,
 * timeline, or other fields that are emitted elsewhere.
 */
export function buildRetentionScoringContract(analysis: VideoAnalysisResult): string {
  const cold = analysis.coldScrollStopScore ?? 5;
  const watch = analysis.watchThroughScore ?? 5;
  const retentionTarget = Math.round(cold * 4 + watch * 6);
  const lines: string[] = [
    "RETENTION SCORING CONTRACT (retentionScore only — derived from THIS video's Gemini watch signals above):",
    "- retentionScore must follow coldScrollStopScore/watchThroughScore, never copy quality, CTA strength, or offer clarity.",
    `- For THIS video Gemini reported cold=${cold}/10, watch=${watch}/10 → retentionScore should center near ~${retentionTarget} (not higher unless signals above are wrong).`,
    "- Map 0-10 → retentionScore: ~3/10 → ~30, ~5/10 → ~50, ~7/10 → ~70, ~9/10 → ~90.",
  ];
  if (cold >= 8 && watch >= 8) {
    lines.push(
      "- Strong watch signals (8+/10): do not suppress a high retentionScore if the footage earned it — even if CTA/offer are weak."
    );
  } else if (cold <= 6 || watch <= 6) {
    lines.push(
      "- Weak/average watch signals (≤6/10): retentionScore must NOT exceed the mapped target — marketing polish does not increase watch time."
    );
  }
  const dropCount = analysis.dropOffMoments?.filter(Boolean).length ?? 0;
  if (dropCount >= 2) {
    lines.push(
      `- ${dropCount} drop-off moment(s) were identified above — retentionScore should not exceed ~55.`
    );
  } else if (dropCount === 1) {
    lines.push("- 1 drop-off moment was identified — retentionScore should reflect meaningful viewer loss.");
  }
  return lines.join("\n");
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
    const durationSec = meta.videoDurationSec ?? meta.analyzedDurationSec;
    lines.push(
      `Coverage: COMPLETE video, ~${Math.round(durationSec ?? 0)}s, no trimming${meta.model ? ` (via ${meta.model})` : ""}.`
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

  lines.push("", buildRetentionScoringContract(analysis));

  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}
