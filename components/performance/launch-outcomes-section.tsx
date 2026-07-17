import Link from "next/link";
import {
  computeDerivedMetrics,
  goalKindForCreativeGoal,
} from "@/lib/outcomes/calculations";
import type { LaunchWithOutcomes } from "@/lib/types/outcome";

type LaunchOutcomesSectionProps = {
  launches: LaunchWithOutcomes[];
  /** analysis_id → { title, creativeGoal } for labels; built by the page. */
  analysisMeta: Record<string, { title: string; creativeGoal?: string }>;
};

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta",
  tiktok: "TikTok",
  other: "Other",
};

function fmt(value: number | null, format: (v: number) => string): string {
  return value == null ? "—" : format(value);
}

export function LaunchOutcomesSection({
  launches,
  analysisMeta,
}: LaunchOutcomesSectionProps) {
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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">
            Launch outcomes
          </h2>
          <p className="mt-0.5 text-xs text-white/50">
            Real results you&apos;ve logged — separate from Advara&apos;s
            predicted scores. Source: manual entry.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-white/55">
          Log a launch from any completed report to track real ad results here.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                <th className="pb-2 pr-4">Creative</th>
                <th className="pb-2 pr-4">Platform</th>
                <th className="pb-2 pr-4">Window</th>
                <th className="pb-2 pr-4">Spend</th>
                <th className="pb-2 pr-4">CTR</th>
                <th className="pb-2 pr-4">CPA</th>
                <th className="pb-2 pr-4">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ launch, outcome, derived, title }) => (
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
                    {fmt(derived.cpa, (v) => `${outcome.currency} ${v.toFixed(2)}`)}
                  </td>
                  <td className="py-2.5 pr-4">
                    {fmt(derived.roas, (v) => `${v.toFixed(2)}×`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
