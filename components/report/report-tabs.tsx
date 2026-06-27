"use client";

import { useState } from "react";
import type { AnalysisReport } from "@/lib/types/report";
import type { HookLibraryEntry } from "@/lib/types/hook";
import { CreativeIntelligenceTab } from "./tabs/creative-intelligence-tab";
import { LandingPageTab } from "./tabs/landing-page-tab";
import { IcpSimulationTab } from "./tabs/icp-simulation-tab";
import { ActionPlanTab } from "./tabs/action-plan-tab";
import type { HookSaveContext } from "@/components/hooks/hook-row-actions";

const TABS = [
  { id: "creative", label: "Creative Intelligence", short: "Creative" },
  { id: "landing", label: "Landing Page Report", short: "Landing" },
  { id: "icp", label: "ICP Simulation", short: "ICP" },
  { id: "action", label: "Action Plan", short: "Action" },
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
    <div className="mt-6 md:mt-8">
      <div className="sticky top-0 z-10 -mx-1 border-b border-white/[0.08] bg-[#080711]/90 px-1 py-2 backdrop-blur-md">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
                  isActive
                    ? "bg-white/[0.08] text-white"
                    : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 min-h-[320px]">
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
      </div>
    </div>
  );
}
