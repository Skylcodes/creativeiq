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
  if (section.status === "ok") return "#0d9488";
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
    <>
      {/* Mobile sticky jump bar */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-white/[0.08] bg-[#080711]/95 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <label className="sr-only" htmlFor="report-jump">
          Jump to section
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
            Jump to
          </span>
          <select
            id="report-jump"
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              scrollToSection(e.target.value);
            }}
            className="min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm font-medium text-white outline-none"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#120f1e] text-white">
                {s.label}
                {s.meta ? ` · ${s.meta}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop sticky left rail */}
      <nav
        aria-label="Report sections"
        className="sticky top-6 hidden w-[200px] shrink-0 self-start lg:block"
      >
        <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
          On this report
        </p>
        <ul className="space-y-0.5">
          {sections.map((s) => {
            const isActive = active === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActive(s.id);
                    scrollToSection(s.id);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                    isActive
                      ? "bg-white/[0.08] text-white"
                      : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: statusDot(s) }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                    {s.label}
                  </span>
                  {s.meta != null && (
                    <span
                      className={`shrink-0 text-[11px] font-semibold tabular-nums ${
                        isActive ? "text-white/70" : "text-white/35"
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
      </nav>
    </>
  );
}
