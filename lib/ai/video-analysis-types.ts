export type VideoAnalysisResult = {
  visualDescription: string;
  visualTimeline?: string[];
  primaryMessaging: string;
  backgroundAudioNote: string;
  onScreenText: string;
  onScreenTextPersistence?: string;
  separationNotes?: string;
  /** First 0–1s thumb-stop quality with concrete visual evidence (0–10) */
  coldScrollStopScore?: number;
  coldScrollStopEvidence?: string;
  /** Watch-through / pacing quality across the full watched length (0–10) */
  watchThroughScore?: number;
  watchThroughEvidence?: string;
  /** Exact opening beat (first ~3 seconds) */
  firstThreeSeconds?: string;
  /** Where a cold viewer would swipe away, with timestamps */
  dropOffMoments?: string[];
  /** When/how the product is shown */
  productVisibility?: string;
  /** Execution style classification: raw UGC, polished UGC, talking head, product demo, cinematic, motion graphics, mixed, other */
  visualStyle?: string;
  /** Observable emotional/attention characteristics the execution communicates (not guaranteed viewer reactions) */
  emotionalCharacteristics?: string[];
  /** Final sequence: last frame, CTA, offer, spoken closing */
  endingDescription?: string;
};

export type VisualAnalysisMode =
  | "gemini_vertex"
  | "timeline_sampling"
  | "thumbnail_fallback";

export const VIDEO_ANALYSIS_JSON_SCHEMA = `Return ONLY JSON:
{
  "visualDescription": "180-280 word analytical description of the FULL watched video: who/what on screen, style, mood, product, composition, pacing, scene changes, and how the sell is carried visually",
  "visualTimeline": ["~0:00 opening: ...", "~0:04 beat: ...", "~0:12 mid: ...", "~0:20 close: ..."],
  "primaryMessaging": "only the actual selling speech/copy — empty string if none identified",
  "backgroundAudioNote": "music/lyrics/SFX identified as non-marketing, or empty if none",
  "onScreenText": "quoted on-screen copy consolidated — mark recurring vs one-off",
  "onScreenTextPersistence": "which text appears when and whether it persists (use timestamps)",
  "separationNotes": "one sentence on how speech vs lyrics were separated, or empty",
  "coldScrollStopScore": 0,
  "coldScrollStopEvidence": "exact opening visual/audio that would or would not stop a thumb in 0-1s",
  "watchThroughScore": 0,
  "watchThroughEvidence": "pacing/cuts/payoff that hold or lose attention after the stop",
  "firstThreeSeconds": "moment-by-moment description of the first ~3 seconds",
  "dropOffMoments": ["~0:06 dull hold with no new info", "..."],
  "productVisibility": "when the product appears and how clearly it is shown",
  "visualStyle": "one of: raw UGC, polished UGC, talking head, product demo, cinematic, motion graphics, mixed, other — describe the actual execution, not a quality judgment",
  "emotionalCharacteristics": ["observable attention/emotional characteristics the execution communicates, e.g. curiosity, urgency, skepticism-inducing — not guaranteed viewer reactions"],
  "endingDescription": "final sequence: last frame, CTA, offer, spoken closing"
}

coldScrollStopScore and watchThroughScore are integers 0-10. Be evidence-based — quote what is on screen/audio.
Scale (most ads are 3–6; 7+ must be earned by actual stop/hold, not by having a person, text, or product on screen):
0–2 poor skip, 3–4 weak, 5–6 average/table-stakes, 7–8 good (stranger would stop and stay), 9–10 exceptional/rare.
Do not invent beats. Do not depress an earned 8 for unused conventions. If dropOffMoments has 2+ items, watchThroughScore must be 6 or below.`;
