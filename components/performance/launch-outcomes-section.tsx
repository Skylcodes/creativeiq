"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImportResultsModal } from "@/components/outcomes/import-results-modal";
import { buildAdvaraTemplateCsv } from "@/lib/outcomes/csv/template";
import {
  computeDerivedMetrics,
  goalKindForCreativeGoal,
} from "@/lib/outcomes/calculations";
import type { LaunchWithOutcomes, OutcomeSource } from "@/lib/types/outcome";

type LaunchOutcomesSectionProps = {
  workspaceId: string;
  launches: LaunchWithOutcomes[];
  /** analysis_id → { title, creativeGoal } for labels; built by the page. */
  analysisMeta: Record<string, { title: string; creativeGoal?: string }>;
};

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta",
  tiktok: "TikTok",
  other: "Other",
};

const SOURCE_BADGE: Record<
  OutcomeSource,
  { label: string; className: string }
> = {
  manual: {
    label: "manual",
    className: "bg-white/10 text-white/65 ring-white/15",
  },
  csv: {
    label: "csv",
    className: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  },
  api: {
    label: "api",
    className: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  },
};

function fmt(value: number | null, format: (v: number) => string): string {
  return value == null ? "—" : format(value);
}

function downloadTemplate() {
  const csv = buildAdvaraTemplateCsv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "advara-outcomes-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function LaunchOutcomesSection({
  workspaceId,
  launches,
  analysisMeta,
}: LaunchOutcomesSectionProps) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);

  const rows = launches.flatMap((launch) =>
    launch.outcomes.map((outcome) => {
      const meta = analysisMeta[launch.analysis_id];
      const derived = computeDerivedMetrics(
        outcome,
        goalKindForCreativeGoal(meta?.creativeGoal)
      );
      return { launch, outcome, derived, title: meta?.title ?? "Analysis" };
    })
  );

  return (
    <section className="dash-card mt-6 px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">
            Launch outcomes
          </h2>
          <p className="mt-0.5 text-xs text-white/50">
            Real results you&apos;ve logged or imported — separate from
            Advara&apos;s predicted scores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="btn-ghost text-sm"
          >
            Download template
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="btn-premium text-sm"
          >
            Import results
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-white/55">
          Log a launch from any completed report, or import a CSV to track real
          ad results here.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                <th className="pb-2 pr-4">Creative</th>
                <th className="pb-2 pr-4">Platform</th>
                <th className="pb-2 pr-4">Window</th>
                <th className="pb-2 pr-4">Spend</th>
                <th className="pb-2 pr-4">CTR</th>
                <th className="pb-2 pr-4">CPA</th>
                <th className="pb-2 pr-4">ROAS</th>
                <th className="pb-2 pr-4">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ launch, outcome, derived, title }) => {
                const badge =
                  SOURCE_BADGE[outcome.source] ?? SOURCE_BADGE.manual;
                return (
                  <tr
                    key={outcome.id}
                    className="border-t border-white/[0.06] text-white/75"
                  >
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/report/${launch.analysis_id}`}
                        className="hover:text-white"
                      >
                        {title}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">
                      {PLATFORM_LABELS[launch.platform] ?? launch.platform}
                    </td>
                    <td className="py-2.5 pr-4">{outcome.window_type}</td>
                    <td className="py-2.5 pr-4">
                      {outcome.spend == null
                        ? "—"
                        : `${outcome.currency} ${outcome.spend.toLocaleString()}`}
                    </td>
                    <td className="py-2.5 pr-4">
                      {fmt(derived.ctr, (v) => `${(v * 100).toFixed(2)}%`)}
                    </td>
                    <td className="py-2.5 pr-4">
                      {fmt(
                        derived.cpa,
                        (v) => `${outcome.currency} ${v.toFixed(2)}`
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      {fmt(derived.roas, (v) => `${v.toFixed(2)}×`)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ImportResultsModal
        workspaceId={workspaceId}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => router.refresh()}
      />
    </section>
  );
}
