"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisReport } from "@/lib/types/report";
import { buildBuyerPersonas } from "@/lib/report/normalize";
import { StrategicBreakdown, hasStrategicBreakdown } from "../shared/strategic-breakdown";

type IcpSimulationTabProps = {
  report: AnalysisReport;
};

function likelihoodStyle(l: string) {
  switch (l) {
    case "High":
      return "bg-[#0d9488]/10 text-[#0d9488]";
    case "Medium":
      return "bg-[#d97706]/10 text-[#d97706]";
    default:
      return "bg-[#ef4444]/10 text-[#ef4444]";
  }
}

export function IcpSimulationTab({ report }: IcpSimulationTabProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const personas = buildBuyerPersonas(report);
  const blockers = report.topBlockers ?? [];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display text-xl font-semibold text-text-primary">
          Buyer Journey Simulation
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          How different awareness levels experience your funnel — written as customer narratives, not AI output.
        </p>

        <div className="mt-5 space-y-4">
          {personas.map((persona) => {
            const isOpen = openId === persona.id;
            return (
              <motion.div
                key={persona.id}
                layout
                className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : persona.id)}
                  className="flex w-full items-start gap-4 p-5 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-semibold text-text-primary">
                        {persona.title}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${likelihoodStyle(persona.likelihood)}`}
                      >
                        {persona.likelihood} likelihood
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      {persona.summary}
                    </p>
                  </div>
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
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-black/[0.04] bg-[#fafaf9] px-6 py-6">
                        <p className="whitespace-pre-wrap font-serif text-[15px] leading-[1.9] text-text-primary">
                          {persona.narrative}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </section>

      {blockers.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-text-primary">
            Top 5 Conversion Blockers
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            The highest-friction points stopping buyers from converting.
          </p>
          <div className="mt-5 space-y-3">
            {blockers.map((blocker, i) => (
              <div
                key={i}
                className="rounded-2xl border border-black/[0.05] bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ef4444]/10 font-display text-sm font-bold text-[#ef4444]">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-text-primary">{blocker.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                      {blocker.detail}
                    </p>
                    {hasStrategicBreakdown(blocker) ? (
                      <StrategicBreakdown breakdown={blocker} />
                    ) : blocker.strategicFix ? (
                      <p className="mt-2 text-sm text-accent">
                        <span className="font-semibold">Strategic fix:</span> {blocker.strategicFix}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
