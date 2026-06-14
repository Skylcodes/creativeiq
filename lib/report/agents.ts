export type ReportAgentId =
  | "skeptical_buyer"
  | "competing_brand"
  | "direct_response"
  | "contrarian"
  | "verdict";

export type ReportAgentMeta = {
  id: ReportAgentId;
  name: string;
  subtitle: string;
  icon: "buyer" | "rival" | "critic" | "contrarian" | "verdict";
  featured?: boolean;
};

/** Primary agents for new funnel analyses (cost-optimized pipeline). */
export const REPORT_AGENTS: ReportAgentMeta[] = [
  {
    id: "skeptical_buyer",
    name: "The Skeptical Buyer",
    subtitle: "Simulates real purchase hesitation",
    icon: "buyer",
  },
  {
    id: "direct_response",
    name: "The Direct Response Critic",
    subtitle: "Scores hook, CTA, and scroll-stopping power",
    icon: "critic",
  },
  {
    id: "verdict",
    name: "The Verdict Agent",
    subtitle: "Final synthesis and launch recommendation",
    icon: "verdict",
    featured: true,
  },
];

/** Legacy agents from pre-optimization reports — shown when transcripts exist. */
export const LEGACY_REPORT_AGENTS: ReportAgentMeta[] = [
  {
    id: "competing_brand",
    name: "The Competing Brand",
    subtitle: "Argues why a rival would win the auction",
    icon: "rival",
  },
  {
    id: "contrarian",
    name: "The Contrarian Strategist",
    subtitle: "Finds the angle nobody else is running",
    icon: "contrarian",
  },
];

const DISPLAY_ORDER: ReportAgentId[] = [
  "skeptical_buyer",
  "competing_brand",
  "direct_response",
  "contrarian",
  "verdict",
];

type ReportWithAgents = {
  rawAgents?: Record<string, string>;
  agentFindings?: Array<{ agentId: string }>;
};

/** Agents to render for a report — includes legacy personas when present. */
export function agentsForReport(report: ReportWithAgents): ReportAgentMeta[] {
  const pool = [...REPORT_AGENTS.slice(0, 2), ...LEGACY_REPORT_AGENTS, REPORT_AGENTS[2]];
  const hasData = (id: ReportAgentId) =>
    Boolean(report.rawAgents?.[id]) ||
    report.agentFindings?.some((f) => f.agentId === id);

  return DISPLAY_ORDER.map((id) => pool.find((a) => a.id === id))
    .filter((a): a is ReportAgentMeta => Boolean(a))
    .filter((a) => a.id === "verdict" || hasData(a.id));
}
