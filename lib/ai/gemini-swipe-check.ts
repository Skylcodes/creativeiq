import "server-only";
import { Type, type Schema } from "@google/genai";
import { getVertexGenAI, isGeminiVertexConfigured, vertexVideoModelLabel } from "@/lib/ai/gemini-vertex-video";
import { parseJsonObject } from "@/lib/ai/parse-json";

/**
 * Cheap first-3-seconds "would a cold viewer swipe before 2s?" check.
 * Validated offline (Oct 23, 2026) on 43 TikTok Creative Center ads with public
 * per-second retention: AUC 0.96 for separating weak hooks (<20% still watching
 * at 2s) — the full-video coldScrollStopScore alone reached 0.87.
 * Input is a ≤3s clip, so cost is ~10% of the full-video call.
 */
export type SwipeCheckResult = {
  observedOpening: string;
  mainReason: string;
  swipeBefore2s: boolean;
  estStillWatching2sPct: number;
};

export const SWIPE_CHECK_PROMPT = `You are judging ONLY the first 3 seconds of a short-form video ad (attached clip) as it appears in a TikTok/Reels feed to a COLD viewer who has never heard of the brand, sound on but distracted.
Most ads lose the majority of viewers by 2 seconds — typical "still watching at 2s" is 20-45%; above 60% is top-tier; below 15% is a failing hook.
First, describe exactly what is on screen and heard at 0.0s, 1.0s and 2.0s (no interpretation).
Then answer: would a typical cold viewer SWIPE AWAY before the 2-second mark? Be honest — "yes" is the common answer. Reasons a viewer swipes: it looks like an ad (product/logo/brand card first, polished commercial look, generic beauty shot), nothing happens, no person speaking to them, no reason to care in the first line.
Reasons a viewer stays: a person speaking directly to them with a specific, surprising or relatable line; something unexpected/visually arresting; an obvious story or tension starting.
Finally estimate the percent of cold viewers still watching at 2s (integer 0-100).`;

const SWIPE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    observedOpening: { type: Type.STRING },
    mainReason: { type: Type.STRING },
    swipeBefore2s: { type: Type.BOOLEAN },
    estStillWatching2sPct: { type: Type.INTEGER },
  },
  propertyOrdering: ["observedOpening", "mainReason", "swipeBefore2s", "estStillWatching2sPct"],
  required: ["observedOpening", "mainReason", "swipeBefore2s", "estStillWatching2sPct"],
};

export function isSwipeCheckEnabled(): boolean {
  const flagged =
    process.env.GEMINI_SWIPE_CHECK?.trim() === "1" || process.env.VERCEL_ENV === "preview";
  return flagged && isGeminiVertexConfigured();
}

export async function runSwipeCheck(clip: Blob): Promise<SwipeCheckResult> {
  const data = Buffer.from(await clip.arrayBuffer()).toString("base64");
  const response = await getVertexGenAI().models.generateContent({
    model: vertexVideoModelLabel(),
    contents: [{ role: "user", parts: [{ inlineData: { mimeType: "video/mp4", data } }, { text: SWIPE_CHECK_PROMPT }] }],
    config: { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: "application/json", responseSchema: SWIPE_SCHEMA },
  });
  const parsed = parseJsonObject<SwipeCheckResult>(response.text?.trim() ?? "");
  if (typeof parsed.swipeBefore2s !== "boolean" || typeof parsed.estStillWatching2sPct !== "number") {
    throw new Error("Swipe check returned incomplete JSON.");
  }
  return {
    observedOpening: String(parsed.observedOpening ?? "").trim(),
    mainReason: String(parsed.mainReason ?? "").trim(),
    swipeBefore2s: parsed.swipeBefore2s,
    estStillWatching2sPct: Math.max(0, Math.min(100, Math.round(parsed.estStillWatching2sPct))),
  };
}
