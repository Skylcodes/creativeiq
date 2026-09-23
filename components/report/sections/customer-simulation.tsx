"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisReport } from "@/lib/types/report";
import { buildBuyerPersonas } from "@/lib/report/normalize";
import {
  StrategicBreakdown,
  hasStrategicBreakdown,
} from "../shared/strategic-breakdown";

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

type CustomerSimulationSectionProps = {
  report: AnalysisReport;
};

export function CustomerSimulationSection({
  report,
}: CustomerSimulationSectionProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const personas = buildBuyerPersonas(report);
  const blockers = report.topBlockers ?? [];

  return (
    <section id="section-customers" className="scroll-mt-24 space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-white md:text-2xl">
          Customer Simulation
        </h2>
        <p className="mt-1 text-sm text-white/55">
          How different awareness levels experience this creative and funnel.
        </p>
      </div>

      <div className="space-y-4">
        {personas.map((persona) => {
          const isOpen = openId === persona.id;
          return (
            <div key={persona.id} className="overflow-hidden dashboard-panel">
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold text-text-primary">
                    {persona.title}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${likelihoodStyle(
                      persona.likelihood
                    )}`}
                  >
                    {persona.likelihood} likelihood
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {persona.summary}
                </p>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : persona.id)}
                  className="mt-3 text-sm font-semibold text-accent-tertiary hover:text-accent"
                >
                  {isOpen ? "Hide full simulation" : "Read full simulation →"}
                </button>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-[rgba(55,41,111,0.07)] bg-accent/[0.025] px-6 py-6">
                      <p className="whitespace-pre-wrap font-serif text-[15px] leading-[1.9] text-text-primary">
                        {persona.narrative}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {blockers.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-semibold text-white">
            Top Conversion Blockers
          </h3>
          <p className="mt-1 text-sm text-white/55">
            The highest-friction points stopping buyers from converting.
          </p>
          <div className="mt-5 space-y-3">
            {blockers.map((blocker, i) => (
              <div key={i} className="dashboard-panel p-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ef4444]/10 font-display text-sm font-bold text-[#ef4444]">
                    {i + 1}
                  </span>
                  <div>
                    <h4 className="font-semibold text-text-primary">{blocker.title}</h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                      {blocker.detail}
                    </p>
                    {hasStrategicBreakdown(blocker) ? (
                      <StrategicBreakdown breakdown={blocker} />
                    ) : blocker.strategicFix ? (
                      <p className="mt-2 text-sm text-accent">
                        <span className="font-semibold">Strategic fix:</span>{" "}
                        {blocker.strategicFix}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
