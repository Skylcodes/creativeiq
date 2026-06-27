import "server-only";
import fs from "fs";
import os from "os";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";
import {
  VIDEO_ANALYSIS_JSON_SCHEMA,
  type VideoAnalysisResult,
} from "@/lib/ai/video-analysis-types";

const DEFAULT_VERTEX_MODEL = "gemini-2.5-flash";
/** Vertex inline payload safety margin (ads are compressed before upload). */
const MAX_INLINE_VIDEO_BYTES = 18 * 1024 * 1024;

let cachedClient: GoogleGenAI | null = null;

const GEMINI_VIDEO_ANALYSIS_INSTRUCTIONS = `You analyze short-form video advertisements for a creative intelligence platform.

You are watching the FULL attached video (visual + audio) — not a single frame.

PRIMARY AD MESSAGING (the script):
- Spoken voiceover selling the product
- Creator/influencer talking to camera
- Intentional marketing dialogue, claims, offers, CTAs
- On-screen text that carries the sell

BACKGROUND AUDIO (NOT brand copy):
- Background music and song lyrics underneath speech
- Trending TikTok/Reels audio, ambient SFX
- Do NOT treat song lyrics as brand copy unless clearly intentional (lip-sync hook)

VISUAL / ON-SCREEN TEXT RULES (critical):
1. Watch the entire video before judging on-screen text or visual persistence.
2. If the same text appears across multiple moments, describe it as RECURRING/PERSISTENT — never "only once" or "brief flash" unless it truly appears once.
3. visualTimeline: chronological entries with approximate timestamps (~0:03, ~0:12).
4. onScreenTextPersistence: which text persists vs changes, with time ranges.
5. Quote onScreenText exactly when visible.

SEPARATION RULES:
- primaryMessaging = words used to SELL — not background lyrics
- If creator speaks over music, primaryMessaging = spoken sell only
- META-CRITIQUE: on-screen text from a reference ad being critiqued is setup — note in separationNotes

If a WHISPER TRANSCRIPT is provided, use it to improve speech accuracy but TRUST THE VIDEO for visuals and timing.

${VIDEO_ANALYSIS_JSON_SCHEMA}`;

function readEnvInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function setupServiceAccountFromEnv(): void {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) return;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return;
  const tmpPath = path.join(os.tmpdir(), `gcp-credentials-${process.pid}.json`);
  fs.writeFileSync(tmpPath, raw, { encoding: "utf8" });
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
}

export function isGeminiVertexConfigured(): boolean {
  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  if (!project) return false;
  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  );
}

function getVertexGenAI(): GoogleGenAI {
  if (cachedClient) return cachedClient;
  setupServiceAccountFromEnv();
  const project = process.env.GOOGLE_CLOUD_PROJECT!.trim();
  const location = process.env.GOOGLE_CLOUD_LOCATION?.trim() || "us-central1";
  cachedClient = new GoogleGenAI({ vertexai: true, project, location });
  return cachedClient;
}

function vertexVideoModel(): string {
  return process.env.GOOGLE_VERTEX_VIDEO_MODEL?.trim() || DEFAULT_VERTEX_MODEL;
}

function parseAnalysisJson(raw: string): VideoAnalysisResult {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  const candidates = [text, jsonrepair(text)];
  let lastError: Error | null = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as VideoAnalysisResult;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw new Error(
    lastError
      ? `Gemini video JSON parse failed: ${lastError.message}`
      : "Gemini video JSON parse failed."
  );
}

export type GeminiVideoAnalysisInput = {
  videoBlob: Blob;
  mimeType?: string;
  /** Optional Whisper transcript — improves speech separation, not required */
  whisperTranscript?: string;
  maxAnalysisDurationSec?: number;
};

export type GeminiVideoAnalysisOutput = {
  analysis: VideoAnalysisResult;
  analyzedDurationSec?: number;
  videoDurationSec?: number;
  compressedBytes: number;
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

  const promptParts: string[] = [
    "Analyze this video advertisement. Output structured JSON only.",
    GEMINI_VIDEO_ANALYSIS_INSTRUCTIONS,
  ];

  if (input.whisperTranscript?.trim()) {
    promptParts.push(
      "",
      "WHISPER TRANSCRIPT (may mix voiceover with background lyrics — use for speech accuracy):",
      `"${input.whisperTranscript.trim()}"`
    );
  }

  const ai = getVertexGenAI();
  const response = await ai.models.generateContent({
    model: vertexVideoModel(),
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
      temperature: 0.15,
      maxOutputTokens: readEnvInt("GOOGLE_VERTEX_VIDEO_MAX_TOKENS", 2048, 512, 4096),
      responseMimeType: "application/json",
    },
  });

  const rawText = response.text?.trim();
  if (!rawText) {
    throw new Error("Gemini Vertex returned an empty video analysis response.");
  }

  const analysis = parseAnalysisJson(rawText);

  return {
    analysis: {
      visualDescription: analysis.visualDescription?.trim() ?? "",
      visualTimeline: analysis.visualTimeline?.filter(Boolean),
      primaryMessaging: analysis.primaryMessaging?.trim() ?? "",
      backgroundAudioNote: analysis.backgroundAudioNote?.trim() ?? "",
      onScreenText: analysis.onScreenText?.trim() ?? "",
      onScreenTextPersistence: analysis.onScreenTextPersistence?.trim(),
      separationNotes: analysis.separationNotes?.trim(),
    },
    compressedBytes: buffer.byteLength,
  };
}
