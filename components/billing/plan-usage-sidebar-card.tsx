"use client";

import Link from "next/link";
import type { AccountUsageSummary } from "@/lib/billing/usage-summary-types";

type PlanUsageSidebarCardProps = {
  summary: AccountUsageSummary;
  collapsed?: boolean;
};

function headlineUsage(summary: AccountUsageSummary): {
  label: string;
  used: number;
  limit: number;
  unlimited: boolean;
} | null {
  const analyses = summary.features.find((f) => f.key === "funnel_analyses");
  if (analyses) {
    return {
      label: "Analyses",
      used: analyses.used,
      limit: analyses.limit,
      unlimited: analyses.unlimited,
    };
  }
  return null;
}

export function PlanUsageSidebarCard({
  summary,
  collapsed = false,
}: PlanUsageSidebarCardProps) {
  if (collapsed) return null;

  const headline = headlineUsage(summary);
  const pct =
    headline && !headline.unlimited && headline.limit > 0
      ? Math.min(100, Math.round((headline.used / headline.limit) * 100))
      : 0;

  return (
    <Link
      href="/settings#billing"
      className="mb-2 block rounded-xl border border-accent/25 bg-accent/[0.08] px-3 py-3 backdrop-blur-sm transition-all duration-300 hover:border-accent/35 hover:bg-accent/[0.12] hover:shadow-[0_0_32px_rgba(105,71,255,0.15)]"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
          Plan
        </p>
        <span className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-accent-tertiary">
          {summary.planDisplayName}
        </span>
      </div>
      {headline && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[11px] text-white/55">
            <span>{headline.label} this month</span>
            <span className="font-semibold text-white/88">
              {headline.used}
              {headline.unlimited ? (
                <span className="font-medium text-white/40"> / ∞</span>
              ) : (
                <span className="font-medium text-white/40"> / {headline.limit}</span>
              )}
            </span>
          </div>
          {!headline.unlimited && headline.limit > 0 && (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-linear-to-r from-accent to-accent-tertiary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      )}
      <p className="mt-2 text-[10px] text-white/38">View all usage →</p>
    </Link>
  );
}
