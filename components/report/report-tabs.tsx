"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisReport } from "@/lib/types/report";
import type { HookLibraryEntry } from "@/lib/types/hook";
import { CreativeIntelligenceTab } from "./tabs/creative-intelligence-tab";
import { LandingPageTab } from "./tabs/landing-page-tab";
import { IcpSimulationTab } from "./tabs/icp-simulation-tab";
import { ActionPlanTab } from "./tabs/action-plan-tab";
import type { HookSaveContext } from "@/components/hooks/hook-row-actions";

const TABS = [
  {
    id: "creative",
    label: "Creative Intelligence",
    short: "Creative",
    icon: "✦",
  },
  { id: "landing", label: "Landing Page Report", short: "Landing", icon: "◈" },
  { id: "icp", label: "ICP Simulation", short: "ICP", icon: "◎" },
  { id: "action", label: "Action Plan", short: "Action", icon: "→" },
] as const;

export type ReportTabId = (typeof TABS)[number]["id"];

type ReportTabsProps = {
  report: AnalysisReport;
  hookLookup?: Map<string, HookLibraryEntry>;
  hookSaveBase?: HookSaveContext;
  onHookSaved?: (hook: HookLibraryEntry) => void;
};

export function ReportTabs({
  report,
  hookLookup,
  hookSaveBase,
  onHookSaved,
}: ReportTabsProps) {
  const [active, setActive] = useState<ReportTabId>("creative");

  return (
    <div className="mt-8">
      <div className="premium-card-glass sticky top-0 z-10 -mx-1 rounded-2xl px-1 py-3">
        <div className="premium-tabs overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                className={`premium-tab ${isActive ? "premium-tab-active" : ""}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="report-tab-bg"
                    className="premium-tab-indicator"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative hidden items-center gap-1.5 sm:inline-flex">
                  <span className="text-[10px] opacity-50">{tab.icon}</span>
                  {tab.label}
                </span>
                <span className="relative sm:hidden">{tab.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {active === "creative" && (
              <CreativeIntelligenceTab
                report={report}
                hookLookup={hookLookup}
                hookSaveBase={hookSaveBase}
                onHookSaved={onHookSaved}
              />
            )}
            {active === "landing" && <LandingPageTab report={report} />}
            {active === "icp" && <IcpSimulationTab report={report} />}
            {active === "action" && <ActionPlanTab report={report} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
