"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisReport } from "@/lib/types/report";
import type { HookLibraryEntry } from "@/lib/types/hook";
import { agentsForReport } from "@/lib/report/agents";
import { getAgentDisplaySummary } from "@/lib/report/utils";
import { AgentIcon } from "../shared/agent-icon";
import { CopyButton } from "../shared/copy-button";
import { HookRowActions, matchHookInLibrary } from "@/components/hooks/hook-row-actions";
import { PremiumCard } from "@/components/ui/premium-card";

type CreativeIntelligenceTabProps = {
  report: AnalysisReport;
  hookLookup?: Map<string, HookLibraryEntry>;
};

function IntelligenceSources({ report }: { report: AnalysisReport }) {
  const [open, setOpen] = useState(false);
  const brief = report.intelligenceBrief;
  if (!brief) return null;

  const { sources, category, platforms, competitorAds, gatheredAt } = brief;

  const summaryParts: string[] = [];
  if (competitorAds.length > 0) {
    summaryParts.push(`Analyzed ${competitorAds.length} competitor ad${competitorAds.length !== 1 ? "s" : ""} running on Meta`);
  }
  if (sources.searchesRun > 0) {
    summaryParts.push(`ran ${sources.searchesRun} targeted searches for the ${category} category`);
  }
  if (brief.audienceContent) {
    summaryParts.push("audience viewing patterns");
  }
  if (brief.winningScriptPatterns) {
    summaryParts.push("winning hook research");
  }

  const ageLabel = new Date(gatheredAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <PremiumCard padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="8" cy="8" r="5.5" stroke="#6e3aff" strokeWidth="1.2" />
            <circle cx="8" cy="8" r="2" fill="#6e3aff" fillOpacity="0.4" stroke="#6e3aff" strokeWidth="1" />
            <path d="M8 2V3.5M8 12.5V14M2 8H3.5M12.5 8H14" stroke="#6e3aff" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">Intelligence Sources</p>
          <p className="mt-0.5 text-xs text-text-muted">
            {summaryParts.join(" · ")} · {ageLabel}
          </p>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 16 16" fill="none"
          className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-black/[0.04] bg-[#fafaf9] px-5 py-4 space-y-4">
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full bg-accent/10 px-2.5 py-1 font-medium text-accent">
                  {category}
                </span>
                {platforms.map((p) => (
                  <span key={p} className="rounded-full bg-black/[0.05] px-2.5 py-1 font-medium text-text-secondary">
                    {p}
                  </span>
                ))}
                {sources.metaEnabled && (
                  <span className="rounded-full bg-[#1877f2]/10 px-2.5 py-1 font-medium text-[#1877f2]">
                    Meta Ad Library
                  </span>
                )}
                {sources.tavilyEnabled && (
                  <span className="rounded-full bg-[#0d9488]/10 px-2.5 py-1 font-medium text-[#0d9488]">
                    Web Search
                  </span>
                )}
              </div>

              {competitorAds.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Active competitor ads ({competitorAds.length})
                  </p>
                  <div className="space-y-2">
                    {competitorAds.slice(0, 5).map((ad, i) => (
                      <div key={i} className="rounded-xl border border-black/[0.04] bg-white px-3.5 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-text-primary">{ad.advertiser}</p>
                          <div className="flex items-center gap-2 text-[10px] text-text-muted">
                            {ad.runningDays != null && (
                              <span>{ad.runningDays}d running</span>
                            )}
                            {ad.cta && (
                              <span className="rounded-full bg-black/[0.05] px-2 py-0.5 font-medium">
                                {ad.cta.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                        </div>
                        {ad.copySnippet && (
                          <p className="mt-1.5 text-xs leading-relaxed text-text-secondary line-clamp-2">
                            &ldquo;{ad.copySnippet}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(brief.audienceContent || brief.winningScriptPatterns || brief.nicheSophistication) && (
                <div className="space-y-3">
                  {brief.audienceContent && (
                    <div className="rounded-xl border border-black/[0.04] bg-white px-3.5 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        Audience content behavior
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-text-secondary line-clamp-4">
                        {brief.audienceContent}
                      </p>
                    </div>
                  )}
                  {brief.winningScriptPatterns && (
                    <div className="rounded-xl border border-black/[0.04] bg-white px-3.5 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        Winning hooks & scripts in niche
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-text-secondary line-clamp-4">
                        {brief.winningScriptPatterns}
                      </p>
                    </div>
                  )}
                  {brief.nicheSophistication && (
                    <div className="rounded-xl border border-black/[0.04] bg-white px-3.5 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        Buyer psychology & market sophistication
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-text-secondary line-clamp-4">
                        {brief.nicheSophistication}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[10px] text-text-muted">
                Intelligence refreshes every 24 hours per category. Gathered {ageLabel}.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PremiumCard>
  );
}

export function CreativeIntelligenceTab({ report, hookLookup }: CreativeIntelligenceTabProps) {
  const [openAgent, setOpenAgent] = useState<string | null>(null);

  const angles = [...report.angleRecommendations].sort((a, b) => a.rank - b.rank);
  const hooks = [...report.hookVariants].sort((a, b) => a.rank - b.rank);

  const rankLabels = ["Launch First", "Test Next", "Alternative Opportunity"];

  return (
    <div className="space-y-6">
      <IntelligenceSources report={report} />

      <section>
        <h2 className="font-display text-xl font-semibold text-text-primary">
          Agent Panel
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Expert agents debated your creative — key takeaways at a glance.
        </p>

        <div className="mt-5 space-y-3">
          {agentsForReport(report).map((agent) => {
            const finding = report.agentFindings.find((f) => f.agentId === agent.id);
            const raw = report.rawAgents?.[agent.id];
            const hidesRawTranscript =
              agent.id === "skeptical_buyer" || agent.id === "direct_response";
            const hasExpandableContent =
              (finding?.keyFindings?.length ?? 0) > 0 ||
              Boolean(raw && !hidesRawTranscript);
            const isOpen = openAgent === agent.id;
            const isFeatured = agent.featured;

            const cardHeader = (
              <>
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    isFeatured ? "bg-accent/15" : "bg-accent/8"
                  }`}
                >
                  <AgentIcon icon={agent.icon} size={22} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${isFeatured ? "text-accent" : "text-text-primary"}`}>
                        {agent.name}
                      </p>
                      {isFeatured && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                          Final Verdict
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">{agent.subtitle}</p>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      {getAgentDisplaySummary(agent.id, finding, report.rawAgents)}
                    </p>
                  </div>
                {hasExpandableContent && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className={`mt-1 shrink-0 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </>
            );

            return (
              <PremiumCard
                key={agent.id}
                layout
                padding="none"
                variant={isFeatured ? "accent" : "default"}
                className={`overflow-hidden ${isFeatured ? "shadow-[0_12px_40px_rgba(110,58,255,0.12)]" : ""}`}
              >
                {hasExpandableContent ? (
                  <button
                    type="button"
                    onClick={() => setOpenAgent(isOpen ? null : agent.id)}
                    className="flex w-full items-start gap-4 p-5 text-left"
                  >
                    {cardHeader}
                  </button>
                ) : (
                  <div className="flex w-full items-start gap-4 p-5">{cardHeader}</div>
                )}

                <AnimatePresence>
                  {isOpen && hasExpandableContent && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-black/[0.05] px-5 pb-5 pt-4">
                        {(finding?.keyFindings?.length ?? 0) > 0 && (
                          <ul className="mb-4 space-y-2">
                            {finding!.keyFindings.map((item, i) => (
                              <li key={i} className="flex gap-2.5 text-sm text-text-primary">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                                <span className="leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {raw && !hidesRawTranscript && (
                          <div className="rounded-xl bg-black/[0.02] p-4">
                            <p className="whitespace-pre-wrap text-sm leading-[1.75] text-text-secondary">
                              {raw}
                            </p>
                          </div>
                        )}
                        {!finding?.keyFindings?.length && (!raw || hidesRawTranscript) && (
                          <p className="text-sm text-text-muted">Full analysis not available.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </PremiumCard>
            );
          })}
        </div>
      </section>

      {angles.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-text-primary">
            Ranked Angle Recommendations
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Which positioning to launch first — and what to test next.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {angles.slice(0, 3).map((angle, i) => (
              <PremiumCard key={angle.rank} padding="md">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
                  Angle {angle.rank} — {rankLabels[i] ?? "Consider"}
                </span>
                <h3 className="mt-2 font-display text-lg font-semibold text-text-primary">
                  {angle.angle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {angle.rationale}
                </p>
              </PremiumCard>
            ))}
          </div>
        </section>
      )}

      {hooks.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-text-primary">
            Hook Rewrites
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Ready-to-test opening lines ranked by predicted performance.
          </p>
          <div className="mt-5 space-y-3">
            {hooks.map((hook) => {
              const entry = hookLookup
                ? matchHookInLibrary(hook.hook, hookLookup)
                : undefined;
              return (
              <PremiumCard
                key={hook.rank}
                padding="md"
                className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Hook #{hook.rank}
                  </p>
                  <p className="mt-1.5 text-base font-medium leading-relaxed text-text-primary">
                    &ldquo;{hook.hook}&rdquo;
                  </p>
                  {hook.rationale && (
                    <p className="mt-2 text-sm text-text-secondary">{hook.rationale}</p>
                  )}
                </div>
                <HookRowActions hookText={hook.hook} hookEntry={entry} />
              </PremiumCard>
            );
            })}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-text-primary">
              Full Script Rewrite
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              A complete deliverable incorporating the top recommendations.
            </p>
          </div>
          {report.scriptRewrite ? (
            <CopyButton text={report.scriptRewrite} label="Copy script" />
          ) : null}
        </div>
        {report.scriptRewrite ? (
          <PremiumCard padding="lg" className="mt-5">
            <p className="whitespace-pre-wrap text-[15px] leading-[1.85] text-text-primary">
              {report.scriptRewrite}
            </p>
          </PremiumCard>
        ) : (
          <p className="mt-5 text-sm text-text-muted">
            Full script rewrite was not generated for this report. Re-run the analysis, or use the hook rewrites above as starting points.
          </p>
        )}
      </section>
    </div>
  );
}
