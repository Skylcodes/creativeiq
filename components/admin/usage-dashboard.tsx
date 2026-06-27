"use client";

import { useState } from "react";

type AccountStat = {
  account_id: string;
  account_label: string;
  workspace_count: number;
  subscription_tier_key: string;
  usage: Record<string, number>;
  limits: Record<string, number>;
};

type Props = {
  tiers: { id: string; key: string; display_name: string }[];
  tierCounts: Record<string, number>;
  accountStats: AccountStat[];
  featureLabels: Record<string, string>;
};

export function UsageDashboard({ tiers, tierCounts, accountStats, featureLabels }: Props) {
  const [filterTier, setFilterTier] = useState<string>("all");

  const filtered =
    filterTier === "all"
      ? accountStats
      : accountStats.filter((a) => a.subscription_tier_key === filterTier);

  const featureKeys = Object.keys(featureLabels);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Usage Dashboard</h1>
        <p className="mt-1 text-sm text-white/40">
          Account-wide usage (pooled across all brand workspaces). Limits reset monthly or daily per feature.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiers.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilterTier(filterTier === t.key ? "all" : t.key)}
            className={[
              "rounded-2xl border p-4 text-left transition-all",
              filterTier === t.key
                ? "border-white/20 bg-white/[0.08]"
                : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]",
            ].join(" ")}
          >
            <p className="text-2xl font-semibold text-white">
              {tierCounts[t.key] ?? 0}
            </p>
            <p className="mt-1 text-xs text-white/40">{t.display_name} subscribers</p>
          </button>
        ))}
        <button
          onClick={() => setFilterTier("all")}
          className={[
            "rounded-2xl border p-4 text-left transition-all",
            filterTier === "all"
              ? "border-white/20 bg-white/[0.08]"
              : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]",
          ].join(" ")}
        >
          <p className="text-2xl font-semibold text-white">{accountStats.length}</p>
          <p className="mt-1 text-xs text-white/40">Active accounts (usage)</p>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] py-16 text-center text-sm text-white/30">
          No usage this period.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((account) => (
            <AccountUsageCard
              key={account.account_id}
              account={account}
              featureKeys={featureKeys}
              featureLabels={featureLabels}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountUsageCard({
  account,
  featureKeys,
  featureLabels,
}: {
  account: AccountStat;
  featureKeys: string[];
  featureLabels: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasAlert = featureKeys.some((k) => {
    const limit = account.limits[k];
    const used = account.usage[k] ?? 0;
    if (!limit || limit === -1) return false;
    return used / limit >= 0.8;
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <button
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02]"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-white/80">{account.account_label}</span>
          <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-xs text-white/30">
            {account.subscription_tier_key}
          </span>
          {account.workspace_count > 1 && (
            <span className="text-xs text-white/30">
              {account.workspace_count} workspaces
            </span>
          )}
          {hasAlert && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
              Near limit
            </span>
          )}
        </div>
        <svg
          className={[
            "h-4 w-4 text-white/20 transition-transform",
            expanded ? "rotate-180" : "",
          ].join(" ")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.04] px-5 pb-5 pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featureKeys.map((k) => {
              const limit = account.limits[k];
              const used = account.usage[k] ?? 0;
              const unlimited = limit === -1;
              const pct = unlimited || !limit ? 0 : Math.min(100, (used / limit) * 100);
              const isHigh = pct >= 80;

              return (
                <div key={k} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">{featureLabels[k] ?? k}</span>
                    <span className="text-xs font-medium text-white/60">
                      {used}
                      {unlimited ? (
                        <span className="ml-1 text-green-400">/ ∞</span>
                      ) : (
                        <span className="ml-1 text-white/30">/ {limit ?? "—"}</span>
                      )}
                    </span>
                  </div>
                  {!unlimited && limit ? (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={[
                          "h-full rounded-full transition-all",
                          isHigh ? "bg-amber-400" : "bg-accent",
                        ].join(" ")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  ) : (
                    <div className="h-1.5 w-full rounded-full bg-green-500/20" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
