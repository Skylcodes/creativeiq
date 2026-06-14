import { ANALYSIS_PLATFORMS } from "@/lib/analyses/constants";
import { extractAgentSummary } from "@/lib/report/enrich-report";
import type { Analysis } from "@/lib/types/analysis";
import type {
  AnalysisReport,
  ConversionCategory,
  PriorityAction,
} from "@/lib/types/report";

/** Report score bands per product spec */
export function getReportScoreColor(score: number): string {
  if (score >= 85) return "#0d9488";
  if (score >= 60) return "#d97706";
  return "#ef4444";
}

export function getReportScoreLabel(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 60) return "Needs Work";
  return "Critical";
}

export function getReportScoreBg(score: number): string {
  if (score >= 85) return "rgba(13, 148, 136, 0.08)";
  if (score >= 60) return "rgba(217, 119, 6, 0.08)";
  return "rgba(239, 68, 68, 0.08)";
}

export function formatReportDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPlatforms(analysis: Analysis): string {
  const labels = analysis.platforms.map((id) => {
    if (id === "other" && analysis.platform_other) return analysis.platform_other;
    return ANALYSIS_PLATFORMS.find((p) => p.id === id)?.label ?? id;
  });
  return labels.length ? labels.join(" · ") : "—";
}

export function formatCreativeType(type: Analysis["creative_type"]): string {
  switch (type) {
    case "image":
      return "Image Ad";
    case "video":
      return "Video Ad";
    case "script":
      return "Script";
    default:
      return "Creative";
  }
}

export function effortLabel(effort: PriorityAction["effort"]): string {
  switch (effort) {
    case "low":
      return "Quick Win";
    case "high":
      return "Major Change";
    default:
      return "Medium Effort";
  }
}

export function impactLabel(impact: PriorityAction["impact"]): string {
  return impact.charAt(0).toUpperCase() + impact.slice(1);
}

export function categoryPercent(cat: ConversionCategory): number {
  if (!cat.maxScore) return 0;
  return Math.round((cat.score / cat.maxScore) * 100);
}

export function shortReportId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

const AUDIO_FLAG_NOTE =
  /audio|transcript|transcri|whisper|background music|spoken dialogue|foreground voiceover|competing audio|lyrics|visual frames?|selling speech|speech heuristic|separation notes?/i;

/** Hide video/audio processing notes from the report header — not useful to end users. */
export function filterReportFlagNotes(notes: string[]): string[] {
  return notes.filter((note) => !AUDIO_FLAG_NOTE.test(note));
}

export type ActionCategory = "Creative" | "Landing Page" | "Funnel";

export function getAgentDisplaySummary(
  agentId: string,
  finding: { summary?: string } | undefined,
  rawAgents: Record<string, string> | undefined
): string {
  if (finding?.summary?.trim()) return finding.summary.trim();

  const raw = rawAgents?.[agentId]?.trim();
  if (raw) return extractAgentSummary(raw);

  return "No summary available for this agent.";
}

export function inferActionCategory(action: string): ActionCategory {
  const lower = action.toLowerCase();
  if (
    /hook|script|creative|angle|headline|visual|ad copy|opening|video|image/.test(
      lower
    )
  ) {
    return "Creative";
  }
  if (
    /landing|page|offer|social proof|testimonial|cta|above the fold|hero/.test(
      lower
    )
  ) {
    return "Landing Page";
  }
  return "Funnel";
}

export function getFunnelContinuity(report: AnalysisReport): {
  aligned: boolean;
  message: string;
  detail: string;
} {
  const continuity = report.conversionScore?.categories?.find(
    (c) => c.key === "funnel_continuity"
  );
  const messageMatch = report.conversionScore?.categories?.find(
    (c) => c.key === "message_match"
  );

  const continuityPct = continuity ? categoryPercent(continuity) : 0;
  const matchPct = messageMatch ? categoryPercent(messageMatch) : 0;
  const aligned = continuityPct >= 65 && matchPct >= 65;

  if (aligned) {
    return {
      aligned: true,
      message: "Ad and landing page are aligned",
      detail:
        continuity?.verdict ||
        messageMatch?.verdict ||
        "Your ad promise and landing page experience tell a consistent story.",
    };
  }

  const weakPoints: string[] = [];
  if (matchPct < 65 && messageMatch?.verdict) {
    weakPoints.push(messageMatch.verdict);
  }
  if (continuityPct < 65 && continuity?.verdict) {
    weakPoints.push(continuity.verdict);
  }

  return {
    aligned: false,
    message: "Ad and landing page are misaligned",
    detail:
      weakPoints.join(" ") ||
      report.headline ||
      "The ad hook and landing page are telling different stories — visitors will feel a disconnect.",
  };
}

export function getNextAnalysisHint(report: AnalysisReport): string {
  const weakest = [...(report.conversionScore?.categories ?? [])].sort(
    (a, b) => categoryPercent(a) - categoryPercent(b)
  )[0];

  if (weakest && categoryPercent(weakest) < 60) {
    return `Your highest-leverage next test is a new creative angle paired with a landing page fix focused on ${weakest.label.toLowerCase()}.`;
  }

  const topAngle = report.angleRecommendations?.find((a) => a.rank === 2);
  if (topAngle) {
    return `Your highest-leverage next test is the "${topAngle.angle}" angle against your current landing page.`;
  }

  return "Your highest-leverage next test is a new hook variant on the same landing page to isolate creative performance.";
}
