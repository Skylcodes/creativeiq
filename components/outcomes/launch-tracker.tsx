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
  /** Inline card (legacy) or slide-over panel */
  variant?: "card" | "panel";
  open?: boolean;
  onClose?: () => void;
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

function LaunchTrackerBody({
  analysis,
  launches,
  onLog,
  onResults,
}: {
  analysis: Analysis;
  launches: LaunchWithOutcomes[];
  onLog: () => void;
  onResults: (launch: LaunchWithOutcomes) => void;
}) {
  const variants = (analysis.variants ?? []) as StoredAnalysisVariant[];

  function variantLabel(variantId: string | null): string | null {
    if (!variantId) return null;
    return variants.find((v) => v.id === variantId)?.label ?? "Variant";
  }

  return (
    <>
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
        <button type="button" onClick={onLog} className="btn-ghost text-xs">
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
                onClick={() => onResults(launch)}
                className="btn-ghost text-xs"
              >
                {launch.outcomes.length > 0 ? "Update results" : "Add results"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function LaunchTracker({
  analysis,
  launches,
  variant = "card",
  open = false,
  onClose,
}: LaunchTrackerProps) {
  const router = useRouter();
  const [logOpen, setLogOpen] = useState(false);
  const [resultsFor, setResultsFor] = useState<LaunchWithOutcomes | null>(null);

  const modals = (
    <>
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
    </>
  );

  if (variant === "panel") {
    if (!open) return modals;
    return (
      <>
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close launch tracking"
            className="absolute inset-0 bg-black/55"
            onClick={onClose}
          />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/[0.1] bg-[#0c0a14] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <p className="font-semibold text-white">Track launch</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-sm text-white/55 hover:bg-white/[0.06] hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <LaunchTrackerBody
                analysis={analysis}
                launches={launches}
                onLog={() => setLogOpen(true)}
                onResults={setResultsFor}
              />
            </div>
          </aside>
        </div>
        {modals}
      </>
    );
  }

  return (
    <div className="dash-card mt-4 px-4 py-4 md:px-6">
      <LaunchTrackerBody
        analysis={analysis}
        launches={launches}
        onLog={() => setLogOpen(true)}
        onResults={setResultsFor}
      />
      {modals}
    </div>
  );
}
