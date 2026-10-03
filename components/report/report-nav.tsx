"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalysisReport } from "@/lib/types/report";
import { getReportScoreColor } from "@/lib/report/utils";

export type ReportNavSection = {
  id: string;
  label: string;
  meta?: string;
  score?: number | null;
  status?: "ok" | "warn" | "critical" | "neutral";
};

type ReportNavProps = {
  sections: ReportNavSection[];
};

function statusDot(section: ReportNavSection): string {
  if (section.status === "ok") return "#4ade80";
  if (section.status === "warn") return "#d97706";
  if (section.status === "critical") return "#ef4444";
  if (typeof section.score === "number") {
    return getReportScoreColor(section.score);
  }
  return "rgba(255,255,255,0.35)";
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function buildReportNavSections(report: AnalysisReport): ReportNavSection[] {
  const actions = report.priorityActions ?? [];
  const angles = report.angleRecommendations ?? [];
  const funnel = report.overallFunnelScore ?? 0;
  const creative = report.creativeStrengthScore ?? 0;
  const conversion = report.conversionScore?.total ?? 0;

  return [
    {
      id: "section-verdict",
      label: "Verdict",
      score: funnel,
      meta: `${funnel}`,
    },
    {
      id: "section-actions",
      label: "Priority Actions",
      meta: `${actions.length}`,
      status: actions.length === 0 ? "ok" : actions[0]?.impact === "high" ? "critical" : "warn",
    },
    {
      id: "section-creative",
      label: "Creative Analysis",
      score: creative,
      meta: `${creative}`,
    },
    {
      id: "section-funnel",
      label: "Funnel Check",
      score: conversion,
      meta: `${conversion}`,
    },
    {
      id: "section-test-next",
      label: "What To Test Next",
      meta: angles.length ? `${angles.length}` : undefined,
      status: "neutral",
    },
  ];
}

export function ReportNav({ sections }: ReportNavProps) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const ids = useMemo(() => sections.map((s) => s.id), [sections]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visible = new Map<string, number>();

    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            visible.set(id, entry.intersectionRatio);
          }
          let bestId = ids[0];
          let bestRatio = -1;
          for (const sid of ids) {
            const r = visible.get(sid) ?? 0;
            if (r > bestRatio) {
              bestRatio = r;
              bestId = sid;
            }
          }
          if (bestRatio > 0) setActive(bestId);
        },
        { rootMargin: "-15% 0px -55% 0px", threshold: [0, 0.15, 0.35, 0.55, 0.75] }
      );
      obs.observe(el);
      observers.push(obs);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [ids]);

  return (
    <nav aria-label="Report sections" className="sticky top-0 z-20 mb-8 pt-2">
      <div className="rounded-2xl border border-white/20 bg-white/[0.07] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <ul className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((s) => {
            const isActive = active === s.id;
            return (
              <li key={s.id} className="shrink-0">
                <button
                  type="button"
                  aria-current={isActive ? "location" : undefined}
                  onClick={() => {
                    setActive(s.id);
                    scrollToSection(s.id);
                  }}
                  className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3.5 py-2 text-left transition-colors ${
                    isActive
                      ? "bg-accent text-white shadow-[0_6px_18px_-8px_rgba(105,71,255,0.9)]"
                      : "text-white/75 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-black/20"
                    style={{ backgroundColor: statusDot(s) }}
                    aria-hidden
                  />
                  <span className="whitespace-nowrap text-sm font-semibold">{s.label}</span>
                  {s.meta != null && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                        isActive ? "bg-black/25 text-white" : "bg-white/[0.08] text-white/80"
                      }`}
                    >
                      {s.meta}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
