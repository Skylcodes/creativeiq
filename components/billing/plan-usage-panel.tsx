"use client";

import Link from "next/link";
import type { AccountUsageSummary, UsageFeatureRow } from "@/lib/billing/usage-summary-types";

type PlanUsagePanelProps = {
  summary: AccountUsageSummary;
  compact?: boolean;
};

function resetHint(period: UsageFeatureRow["resetPeriod"]): string {
  if (period === "daily") return "Resets daily";
  if (period === "lifetime") return "Account limit";
  return "Resets monthly";
}

function UsageMeter({ row }: { row: UsageFeatureRow }) {
  const { used, limit, unlimited, label, resetPeriod } = row;

  if (unlimited) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/55">{label}</p>
          <p className="text-sm font-semibold text-white">
            {used}
            <span className="font-medium text-white/40"> / ∞</span>
          </p>
        </div>
        <p className="mt-1 text-[11px] text-white/40">{resetHint(resetPeriod)}</p>
      </div>
    );
  }

  const safeLimit = limit > 0 ? limit : 1;
  const pct =
    limit > 0 ? Math.min(100, Math.round((used / safeLimit) * 100)) : 0;
  const atLimit = limit > 0 && used >= limit;
  const nearLimit = !atLimit && limit > 0 && used / limit >= 0.8;

  const barColor = atLimit
    ? "bg-red-400"
    : nearLimit
      ? "bg-amber-400"
      : "bg-accent";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white/55">{label}</p>
        <p className="text-sm font-semibold text-white">
          {used}
          {limit === 0 ? (
            <span className="font-medium text-white/40"> — upgrade</span>
          ) : (
            <span className="font-medium text-white/40"> / {limit}</span>
          )}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.06]">
        {limit > 0 && (
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <p className="mt-1 text-[11px] text-white/40">{resetHint(resetPeriod)}</p>
    </div>
  );
}

export function PlanUsagePanel({ summary, compact = false }: PlanUsagePanelProps) {
  const aiFeatures = summary.features.filter((f) => f.key !== "workspaces");
  const workspaceRow = summary.features.find((f) => f.key === "workspaces");

  const priceLabel =
    summary.planPriceMonthly != null
      ? `$${summary.planPriceMonthly}/mo`
      : null;

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-white/40">
            Current plan
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-white">
            {summary.planDisplayName}
            {priceLabel && (
              <span className="ml-2 text-sm font-medium text-white/45">
                {priceLabel}
              </span>
            )}
          </p>
          {!compact && (
            <p className="mt-1 text-sm text-white/55">
              Usage is shared across all{" "}
              {summary.workspaceCount === 1
                ? "your workspace"
                : `${summary.workspaceCount} workspaces`}
              .
            </p>
          )}
        </div>
        {summary.accountStatus !== "active" && !summary.isAdmin && (
          <Link
            href="/pricing"
            className="text-sm font-semibold text-accent-tertiary hover:text-accent"
          >
            Upgrade
          </Link>
        )}
      </div>

      {workspaceRow && (
        <div className="app-inset rounded-xl px-4 py-3">
          <UsageMeter row={workspaceRow} />
        </div>
      )}

      <div
        className={
          compact
            ? "space-y-4"
            : "grid gap-4 sm:grid-cols-2"
        }
      >
        {aiFeatures.map((row) => (
          <UsageMeter key={row.key} row={row} />
        ))}
      </div>
    </div>
  );
}
