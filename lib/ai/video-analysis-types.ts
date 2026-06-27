export type VideoAnalysisResult = {
  visualDescription: string;
  visualTimeline?: string[];
  primaryMessaging: string;
  backgroundAudioNote: string;
  onScreenText: string;
  onScreenTextPersistence?: string;
  separationNotes?: string;
};

export type VisualAnalysisMode =
  | "gemini_vertex"
  | "timeline_sampling"
  | "thumbnail_fallback";

export const VIDEO_ANALYSIS_JSON_SCHEMA = `Return ONLY JSON:
{
  "visualDescription": "150-250 word analytical description across the FULL video: who/what on screen, style, mood, product, pacing, scene changes",
  "visualTimeline": ["~0:01 opening: ...", "~0:08 mid: ..."],
  "primaryMessaging": "only the actual selling speech/copy — empty string if none identified",
  "backgroundAudioNote": "music/lyrics/SFX identified as non-marketing, or empty if none",
  "onScreenText": "quoted on-screen copy consolidated — note recurring text",
  "onScreenTextPersistence": "which text appears when and whether it persists (use timestamps)",
  "separationNotes": "one sentence on how layers were separated, or empty"
}`;
