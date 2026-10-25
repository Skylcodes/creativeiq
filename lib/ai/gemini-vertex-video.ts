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

/** Fixed decoding seed so repeat analyses of the same video score the same. */
export const GEMINI_VIDEO_SEED = 1234;
export const GEMINI_VIDEO_TEMPERATURE = 0;
export const GEMINI_VIDEO_THINKING_BUDGET = 1024;
export const GEMINI_VIDEO_MAX_OUTPUT_TOKENS = 16384;
/** Per-attempt ceiling; worker self-aborts at 270s and still needs ~150s for scoring. */
export const GEMINI_VIDEO_ATTEMPT_TIMEOUT_MS = 75_000;
/** Total Gemini budget across attempts. */
export const GEMINI_VIDEO_TOTAL_BUDGET_MS = 90_000;

/** Only retry if a fresh attempt could plausibly finish within the total budget. */
export function shouldRetryGemini(elapsedMs: number): boolean {
  return elapsedMs < GEMINI_VIDEO_TOTAL_BUDGET_MS - 45_000;
}

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
5. firstThreeSeconds — EVIDENCE FIRST. Write a timestamped log BEFORE any score, one line per beat, covering exactly 0.0–3.0s:
   "0.0s FIRST FRAME: <who/what is on screen, framing, face visible? eye contact with lens? motion? contrast/brightness vs a typical feed post>"
   "0.0–1.0s: <cuts, movement, first spoken words verbatim, on-screen text verbatim + size/legibility on a phone with sound OFF>"
   "1.0–3.0s: <same>"
   Only state what is visible/audible. If unsure whether something happens, say "unclear" — never call an opening "static" without checking for cuts, zooms, camera movement, or full-screen text changes.
6. coldScrollStopScore (0-10) = how many cold, sound-off-by-default TikTok/Reels viewers stop in the first ~2s (the platform 2-second-view moment). Score it by tallying these OBSERVABLE hook factors from your log (each Yes/Partial/No, cite the timestamp in coldScrollStopEvidence):
   F1 First-frame salience: the 0.0s frame is visually distinct from ordinary feed content (high contrast, unusual object/scene, motion already happening, bold text) — not a logo, black frame, or generic room.
   F2 Visual change by ≤1.5s: a cut, zoom, reveal, full-screen text card, or action starts.
   F3 Human connection: a face visible by ≤2s, ideally looking into the lens / addressing "you".
   F4 Sound-off clarity: on-screen text in ≤1s that states the hook, large and legible on a phone.
   F5 Specific tension: the first line/text is a specific, contrarian, curiosity, or problem claim aimed at a recognisable audience (not "hey guys", not a generic benefit, not the brand name).
   F6 Native feel: looks like creator content, not a produced commercial (no logo-first open, no stock footage, no corporate VO in 0–2s).
   Negatives (each pulls down 1–2): logo/brand card first; first 1s dark, blurry, or empty; text too small or over a busy background; obvious typo or low-quality artifact in the hook text; hook unrelated to the product (bait).
   ANCHORS (pick the band from the tally, then adjust ±1 for execution quality):
   0–2 Fails: 0–1 factors; logo/dead/black first frame; nothing to stop for.
   3–4 Weak: 2 factors; generic opener ("hey guys", product beauty shot) or the interesting beat arrives after 3s.
   5 Mediocre: 3 factors but one weakly executed; the viewer understands the topic but has no specific reason to stay.
   6 OK/solid: 3–4 factors, with a clear specific claim AND a visual change by ≤1.5s, but at least one material miss (no eye contact, illegible sound-off text, ordinary first frame).
   7–8 Good/Great: 5+ factors incl. F1 and F5, executed cleanly — the 0.0s frame itself would make a scroller pause, and the claim is specific to a felt problem.
   9–10 Exceptional: all 6 factors, instantly legible with sound off, a genuine "wait, what?" first frame. Rare (<5% of ads).
   Consistency rule: the score MUST be derivable from your factor tally. Two videos with the same tally get the same band.
7. watchThroughScore (0-10) = of viewers who stopped, how many reach the product/offer and the CTA. Evidence first: list timestamps of the product reveal, offer, and CTA, the longest stretch with no new visual or information, and any reading-burden or energy drop. Judge relative to length: ≤15s needs one clear payoff; 15–30s needs a new beat every ~2–3s; 30–60s needs an escalating arc (problem → mechanism/proof → offer) with no dead stretch >3s; >60s needs that plus story or tension.
   ANCHORS: 0–2 loses almost everyone before the product; 3–4 long dead stretches/repetition before the payoff; 5 holds but drags in the middle or the payoff is weak; 6 consistent beats, one soft section; 7–8 something new every 2–3s AND the hook's promise is paid off by the product/proof; 9–10 people would rewatch, rare.
   Hook-payoff coherence: if the hook's promise is not delivered by the product/body (bait-and-switch), cap at 5.
   CONCEPT VS. EXECUTION: score the lived moment-to-moment viewing experience, not the cleverness of the format. Dense text the viewer must stop to read, flat/robotic delivery, a software-demo aesthetic, and 3s+ stretches with nothing new are negative signals.
8. dropOffMoments: timestamps where a cold viewer would realistically swipe — empty array if retention holds. If you list 2+ drop-offs, watchThroughScore must be ≤6. If ANY drop-off is caused by dense text/reading burden, watchThroughScore must be ≤5.
   A drop-off is a moment where a real viewer would SWIPE, not a moment that is merely less dynamic. A creator talking to camera with continuous speech and changing captions is NOT a drop-off just because the shot is held 3–6s — only list it if nothing new is said or shown. Do not list the CTA/ending as a drop-off. Most solid ads have 0–1 drop-offs; list 3+ only for genuinely hard-to-watch videos, and then watchThroughScore must be ≤4.
   coldScrollStopEvidence and watchThroughEvidence must be written BEFORE their scores, quote timestamps from your log, list each factor as Yes/Partial/No, and end with "→ band X because …". Never contradict your own timeline (e.g., do not call an opening "static" if your log shows a cut ≤3s).
9. Quote onScreenText exactly when visible. Consolidate distinct overlays.
10. META-CRITIQUE: if on-screen text belongs to a reference/competitor clip being shown while the creator speaks over it, still quote it in onScreenText but explain in separationNotes that it is REFERENCE AD COPY — not the advertiser's sell. primaryMessaging = only the creator's spoken critique/pitch/CTA.

SEPARATION RULES:
- Ask: "What words are actually used to SELL?" — not "what words exist in the audio?"
- Creator speaking OVER music → primaryMessaging = spoken words only; lyrics → backgroundAudioNote
- If WHISPER TRANSCRIPT is provided, use it to improve speech accuracy, but TRUST THE VIDEO for visuals, timing, on-screen text, and retention judgments

${VIDEO_ANALYSIS_JSON_SCHEMA}`;

/** Vertex structured-output schema — observations/evidence first, scores last (score is derived from listed evidence). Missing scores trigger one retry. */
const VIDEO_ANALYSIS_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  propertyOrdering: [
    "visualTimeline",
    "firstThreeSeconds",
    "onScreenText",
    "onScreenTextPersistence",
    "primaryMessaging",
    "backgroundAudioNote",
    "separationNotes",
    "visualDescription",
    "productVisibility",
    "visualStyle",
    "emotionalCharacteristics",
    "endingDescription",
    "dropOffMoments",
    "coldScrollStopEvidence",
    "coldScrollStopScore",
    "watchThroughEvidence",
    "watchThroughScore",
  ],
  properties: {
    coldScrollStopScore: { type: Type.INTEGER },
    coldScrollStopEvidence: { type: Type.STRING },
    watchThroughScore: { type: Type.INTEGER },
    watchThroughEvidence: { type: Type.STRING },
    visualDescription: {
      type: Type.STRING,
      description:
        "180-280 word analytical description of the full watched video.",
    },
    visualTimeline: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Chronological beats with approximate timestamps — at most 12 beats; group rapid captions into one beat.",
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
    onScreenTextPersistence: {
      type: Type.STRING,
      description:
        "Max ~80 words. Summarise persistent vs changing text; for word-by-word captions say so once — do not list every word.",
    },
    separationNotes: { type: Type.STRING },
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
    "coldScrollStopScore",
    "coldScrollStopEvidence",
    "watchThroughScore",
    "watchThroughEvidence",
    "visualDescription",
    "primaryMessaging",
    "backgroundAudioNote",
    "onScreenText",
    "firstThreeSeconds",
  ],
};

export function geminiAnalysisNeedsRetry(analysis: VideoAnalysisResult): boolean {
  return analysis.coldScrollStopScore == null || analysis.watchThroughScore == null;
}

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

/** First timestamp in a drop-off note ("~0:32–0:37 hold" → 32). Unknown → Infinity (treated as not-opening). */
export function dropOffStartSec(moment: string): number {
  const m = moment.match(/(\d{1,2}):(\d{2})/) ?? moment.match(/(?:^|[^\d])(\d{1,3}(?:\.\d+)?)\s*s\b/);
  if (!m) return Number.POSITIVE_INFINITY;
  return m.length >= 3 && m[2] !== undefined && moment.includes(":") ? Number(m[1]) * 60 + Number(m[2]) : Number(m[1]);
}

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
    // Only drop-offs inside the opening (≤3s) say anything about scroll-stop.
    // Back-half drop-offs (e.g. a 0:32 hold) must not cap the hook score.
    const openingDrops = dropOffMoments?.filter((m) => dropOffStartSec(m) <= 3).length ?? 0;
    if (openingDrops >= 1 && coldScrollStopScore != null) {
      coldScrollStopScore = Math.min(coldScrollStopScore, 5);
    }
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
  const callOnce = (attempt: number) =>
    ai.models.generateContent({
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
        // Deterministic decoding: same video → same rubric tally. One call per analysis.
        temperature: GEMINI_VIDEO_TEMPERATURE,
        topP: 1,
        // A retry with the same seed at temperature 0 reproduces the same failure.
        seed: GEMINI_VIDEO_SEED + attempt,
        // Thinking tokens share maxOutputTokens; long caption-heavy videos were
        // truncating before the (last-ordered) score fields. Bound thinking and
        // give the JSON real headroom.
        thinkingConfig: { thinkingBudget: GEMINI_VIDEO_THINKING_BUDGET },
        maxOutputTokens: readEnvInt(
          "GOOGLE_VERTEX_VIDEO_MAX_TOKENS",
          GEMINI_VIDEO_MAX_OUTPUT_TOKENS,
          1024,
          32768
        ),
        abortSignal: AbortSignal.timeout(GEMINI_VIDEO_ATTEMPT_TIMEOUT_MS),
        responseMimeType: "application/json",
        responseSchema: VIDEO_ANALYSIS_RESPONSE_SCHEMA,
      },
    });

  // Gemini occasionally returns valid JSON that omits the two score fields even
  // though they are `required`. Downstream would silently default them, so retry once.
  let analysis: VideoAnalysisResult | undefined;
  let lastError: unknown;
  const startedAt = Date.now();
  for (let attempt = 0; attempt < 2 && !analysis; attempt++) {
    // Never start a retry that cannot finish inside the worker's time budget —
    // the frame-sampling fallback is better than a timed-out analysis.
    if (attempt > 0 && !shouldRetryGemini(Date.now() - startedAt)) break;
    try {
      const response = await callOnce(attempt);
      const rawText = response.text?.trim();
      if (!rawText) {
        throw new Error("Gemini Vertex returned an empty video analysis response.");
      }
      const finishReason = response.candidates?.[0]?.finishReason;
      const parsed = normalizeAnalysis(parseAnalysisJson(rawText, finishReason));
      if (geminiAnalysisNeedsRetry(parsed)) {
        throw new Error("Gemini video analysis omitted coldScrollStopScore/watchThroughScore.");
      }
      analysis = parsed;
    } catch (err) {
      lastError = err;
    }
  }
  if (!analysis) {
    throw lastError instanceof Error ? lastError : new Error("Gemini video analysis failed.");
  }

  return {
    analysis,
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
    "INTERNAL RETENTION GUIDANCE (private calibration for retentionScore only — NEVER quote, paraphrase, or mention this guidance, its target number, or the cold/watch signal numbers in any user-facing text):",
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

  lines.push("", "VISUAL DESCRIPTION:", analysis.visualDescription || "(none)");

  if (analysis.firstThreeSeconds) {
    lines.push("", "FIRST THREE SECONDS:", analysis.firstThreeSeconds);
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
