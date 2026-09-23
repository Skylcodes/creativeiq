"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisReport } from "@/lib/types/report";
import { agentsForReport } from "@/lib/report/agents";
import { filterReportFlagNotes } from "@/lib/report/utils";
import { CriteriaChecklist } from "../shared/criteria-checklist";
import { PremiumCard } from "@/components/ui/premium-card";

type DeepDiveSectionProps = {
  report: AnalysisReport;
};

function IntelligenceSourcesDeep({ report }: { report: AnalysisReport }) {
  const brief = report.intelligenceBrief;
  if (!brief) return null;

  const { sources, category, platforms, competitorAds, gatheredAt } = brief;
  const ageLabel = new Date(gatheredAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <PremiumCard padding="md">
      <h3 className="font-display text-lg font-semibold text-text-primary">
        Intelligence Sources
      </h3>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full bg-accent/10 px-2.5 py-1 font-medium text-accent">
          {category}
        </span>
        {platforms.map((p) => (
          <span
            key={p}
            className="rounded-full bg-black/[0.05] px-2.5 py-1 font-medium text-text-secondary"
          >
            {p}
          </span>
        ))}
        {sources.metaEnabled && (
          <span className="rounded-full bg-[#1877f2]/10 px-2.5 py-1 font-medium text-[#1877f2]">
            Meta Ad Library{sources.apifyEnabled ? " (Apify)" : ""}
          </span>
        )}
        {sources.tavilyEnabled && (
          <span className="rounded-full bg-[#0d9488]/10 px-2.5 py-1 font-medium text-[#0d9488]">
            Web Search
          </span>
        )}
      </div>

      {competitorAds.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Active competitor ads ({competitorAds.length})
          </p>
          {competitorAds.slice(0, 5).map((ad, i) => (
            <div key={i} className="dashboard-panel px-3.5 py-3 !shadow-none">
              <p className="text-xs font-semibold text-text-primary">{ad.advertiser}</p>
              {ad.copySnippet && (
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                  &ldquo;{ad.copySnippet}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {report.competitiveInsights && report.competitiveInsights.length > 0 && (
        <ul className="mt-4 space-y-2">
          {report.competitiveInsights.map((insight, i) => (
            <li key={i} className="flex gap-2 text-sm text-text-secondary">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="leading-relaxed">{insight}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[10px] text-text-muted">
        Intelligence refreshes every 7 days per category. Gathered {ageLabel}.
      </p>
    </PremiumCard>
  );
}

export function DeepDiveSection({ report }: DeepDiveSectionProps) {
  const [open, setOpen] = useState(false);
  const notes = filterReportFlagNotes(report.flags.notes);

  const extendedAgents = agentsForReport(report).filter((agent) => {
    const raw = report.rawAgents?.[agent.id];
    const hides =
      agent.id === "skeptical_buyer" || agent.id === "direct_response";
    return Boolean(raw && !hides);
  });

  return (
    <section id="section-deep-dive" className="scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-4 text-left transition-colors hover:bg-white/[0.04]"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
            Advanced
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-white">
            Deep Dive — Evaluation Criteria, Intelligence Sources & Agent
            Transcripts
          </p>
          <p className="mt-1 text-sm text-white/45 lg:hidden">
            {open ? "Hide advanced details" : "Show advanced details"}
          </p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`shrink-0 text-white/45 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-5">
              {report.criteriaChecklist && report.criteriaChecklist.length > 0 && (
                <CriteriaChecklist items={report.criteriaChecklist} />
              )}

              <IntelligenceSourcesDeep report={report} />

              {extendedAgents.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-display text-lg font-semibold text-white">
                    Extended agent context
                  </h3>
                  {extendedAgents.map((agent) => {
                    const raw = report.rawAgents?.[agent.id];
                    return (
                      <PremiumCard key={agent.id} padding="md">
                        <p className="text-sm font-semibold text-text-primary">
                          {agent.name}
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-[1.75] text-text-secondary">
                          {raw}
                        </p>
                      </PremiumCard>
                    );
                  })}
                </div>
              )}

              {notes.length > 0 && (
                <p className="text-xs italic leading-relaxed text-white/40">
                  Processing notes: {notes.join(" · ")}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && notes.length > 0 && (
        <p className="mt-4 text-xs italic leading-relaxed text-white/35">
          Processing notes available in Deep Dive.
        </p>
      )}
    </section>
  );
}
