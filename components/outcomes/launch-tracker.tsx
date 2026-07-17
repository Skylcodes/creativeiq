"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Analysis } from "@/lib/types/analysis";
import type { LaunchOutcome, LaunchWithOutcomes } from "@/lib/types/outcome";
import type { StoredAnalysisVariant } from "@/lib/types/comparison";
import {
  computeDerivedMetrics,
  goalKindForCreativeGoal,
} from "@/lib/outcomes/calculations";
import { LogLaunchModal } from "./log-launch-modal";
import { AddResultsModal } from "./add-results-modal";

type LaunchTrackerProps = {
  analysis: Analysis;
  launches: LaunchWithOutcomes[];
};

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta",
  tiktok: "TikTok",
  other: "Other",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function outcomeSummary(
  outcome: LaunchOutcome,
  goal: string | undefined
): string {
  const derived = computeDerivedMetrics(
    outcome,
    goalKindForCreativeGoal(goal)
  );
  const parts: string[] = [];
  if (outcome.spend != null)
    parts.push(`${outcome.currency} ${outcome.spend.toLocaleString()} spent`);
  if (derived.roas != null) parts.push(`${derived.roas.toFixed(2)}× ROAS`);
  if (derived.cpa != null)
    parts.push(`${outcome.currency} ${derived.cpa.toFixed(2)} CPA`);
  if (derived.ctr != null)
    parts.push(`${(derived.ctr * 100).toFixed(2)}% CTR`);
  return parts.length > 0 ? parts.join(" · ") : "No metrics recorded";
}

export function LaunchTracker({ analysis, launches }: LaunchTrackerProps) {
  const router = useRouter();
  const [logOpen, setLogOpen] = useState(false);
  const [resultsFor, setResultsFor] = useState<LaunchWithOutcomes | null>(null);
  const variants = (analysis.variants ?? []) as StoredAnalysisVariant[];

  function variantLabel(variantId: string | null): string | null {
    if (!variantId) return null;
    return variants.find((v) => v.id === variantId)?.label ?? "Variant";
  }

  return (
    <div className="dash-card mt-4 px-4 py-4 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
            Launch tracking
          </p>
          <p className="mt-1 text-sm text-white/70">
            {launches.length === 0
              ? "Ran this creative? Log the launch, then add real results after 3–7 days."
              : `${launches.length} launch${launches.length === 1 ? "" : "es"} tracked · results are user-reported`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLogOpen(true)}
          className="btn-ghost text-xs"
        >
          Log launch
        </button>
      </div>

      {launches.length > 0 && (
        <ul className="mt-4 space-y-2">
          {launches.map((launch) => (
            <li
              key={launch.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white/80">
                  <span className="font-medium">
                    {PLATFORM_LABELS[launch.platform] ?? launch.platform}
                  </span>
                  {variantLabel(launch.variant_id) && (
                    <span className="text-white/55">
                      {" "}
                      · {variantLabel(launch.variant_id)}
                    </span>
                  )}
                  <span className="text-white/55">
                    {" "}
                    · launched {formatDate(launch.launched_at)}
                  </span>
                  <span className="text-white/40">
                    {" "}
                    · {launch.outcomes.length} result
                    {launch.outcomes.length === 1 ? "" : "s"}
                  </span>
                </div>
                {launch.outcomes.length > 0 && (
                  <div className="w-full space-y-0.5 pt-1 text-xs text-white/55">
                    {launch.outcomes.map((o) => (
                      <p key={o.id}>
                        <span className="font-medium text-white/70">
                          {o.window_type}
                        </span>{" "}
                        · {outcomeSummary(o, analysis.creative_goal)} · source:{" "}
                        {o.source}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setResultsFor(launch)}
                className="btn-ghost text-xs"
              >
                {launch.outcomes.length > 0 ? "Update results" : "Add results"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <LogLaunchModal
        analysis={analysis}
        open={logOpen}
        onClose={() => setLogOpen(false)}
        onLogged={() => router.refresh()}
      />

      {resultsFor && (
        <AddResultsModal
          launch={resultsFor}
          creativeGoal={analysis.creative_goal}
          open={resultsFor !== null}
          onClose={() => setResultsFor(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
