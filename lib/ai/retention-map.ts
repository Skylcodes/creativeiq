/**
 * Gemini 0-10 watch signals → 0-100 retention. Non-linear so the common 5–8
 * range spreads across the founder bands instead of compressing into 70–80:
 * 4→35, 5→48, 6→60, 7→72, 8→84, 9→93, 10→100 (weighted 40% hook / 60% hold).
 */
export function mapGeminiToRetention(cold: number, watch: number): number {
  const points: Array<[number, number]> = [
    [0, 0], [2, 12], [3, 22], [4, 35], [5, 48], [6, 60], [7, 72], [8, 84], [9, 93], [10, 100],
  ];
  const x = Math.max(0, Math.min(10, cold * 0.4 + watch * 0.6));
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (x <= x1) return Math.round(y0 + ((x - x0) / (x1 - x0)) * (y1 - y0));
  }
  return 100;
}
