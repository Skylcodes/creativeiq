"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { recordOutcome } from "@/lib/outcomes/actions";
import {
  computeDerivedMetrics,
  goalKindForCreativeGoal,
} from "@/lib/outcomes/calculations";
import {
  OUTCOME_CURRENCIES,
  type LaunchWithOutcomes,
  type OutcomeWindowType,
  type RawOutcomeMetrics,
} from "@/lib/types/outcome";

type AddResultsModalProps = {
  launch: LaunchWithOutcomes;
  creativeGoal: string | undefined;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const fieldClass =
  "w-full rounded-2xl border border-border-strong bg-white/[0.88] px-4 py-3 text-sm text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-accent/[0.45] focus:bg-white focus:ring-4 focus:ring-accent/[0.12]";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted";

const WINDOWS: Array<{ id: OutcomeWindowType; label: string }> = [
  { id: "3d", label: "First 3 days" },
  { id: "7d", label: "First 7 days" },
  { id: "14d", label: "First 14 days" },
];

function toNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function AddResultsModal({
  launch,
  creativeGoal,
  open,
  onClose,
  onSaved,
}: AddResultsModalProps) {
  const goalKind = goalKindForCreativeGoal(creativeGoal);
  const [windowType, setWindowType] = useState<OutcomeWindowType>("7d");
  const [currency, setCurrency] = useState("USD");
  const [spend, setSpend] = useState("");
  const [impressions, setImpressions] = useState("");
  const [clicks, setClicks] = useState("");
  const [conversions, setConversions] = useState("");
  const [revenue, setRevenue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const metrics: RawOutcomeMetrics = useMemo(
    () => ({
      spend: toNumber(spend),
      impressions: toNumber(impressions),
      clicks: toNumber(clicks),
      purchases: goalKind === "purchases" ? toNumber(conversions) : null,
      leads: goalKind === "leads" ? toNumber(conversions) : null,
      revenue: toNumber(revenue),
    }),
    [spend, impressions, clicks, conversions, revenue, goalKind]
  );

  const derived = useMemo(
    () => computeDerivedMetrics(metrics, goalKind),
    [metrics, goalKind]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await recordOutcome({
        launchId: launch.id,
        windowType,
        currency,
        metrics,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      onSaved();
      onClose();
    });
  }

  const previewItems: Array<[string, number | null, (v: number) => string]> = [
    ["CTR", derived.ctr, (v) => `${(v * 100).toFixed(2)}%`],
    ["CPC", derived.cpc, (v) => `${currency} ${v.toFixed(2)}`],
    ["CPA", derived.cpa, (v) => `${currency} ${v.toFixed(2)}`],
    ["ROAS", derived.roas, (v) => `${v.toFixed(2)}×`],
    ["Conv. rate", derived.conversionRate, (v) => `${(v * 100).toFixed(2)}%`],
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[rgba(8,7,17,0.42)] backdrop-blur-[6px]"
            onClick={pending ? undefined : onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="premium-card premium-card-elevated fixed left-1/2 top-1/2 z-50 flex max-h-[min(90vh,720px)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-results-title"
          >
            <div className="shrink-0 border-b border-white/65 px-6 py-5">
              <h2
                id="add-results-title"
                className="font-display text-xl font-semibold text-text-primary"
              >
                Add Results
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Enter raw totals from Ads Manager. Rates are computed for you.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="result-window" className={labelClass}>
                      Window
                    </label>
                    <select
                      id="result-window"
                      value={windowType}
                      onChange={(e) =>
                        setWindowType(e.target.value as OutcomeWindowType)
                      }
                      className={fieldClass}
                    >
                      {WINDOWS.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="result-currency" className={labelClass}>
                      Currency
                    </label>
                    <select
                      id="result-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={fieldClass}
                    >
                      {OUTCOME_CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="result-spend" className={labelClass}>
                      Spend
                    </label>
                    <input
                      id="result-spend"
                      type="number"
                      min="0"
                      step="0.01"
                      value={spend}
                      onChange={(e) => setSpend(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="result-impressions" className={labelClass}>
                      Impressions
                    </label>
                    <input
                      id="result-impressions"
                      type="number"
                      min="0"
                      step="1"
                      value={impressions}
                      onChange={(e) => setImpressions(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="result-clicks" className={labelClass}>
                      Clicks
                    </label>
                    <input
                      id="result-clicks"
                      type="number"
                      min="0"
                      step="1"
                      value={clicks}
                      onChange={(e) => setClicks(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="result-conversions" className={labelClass}>
                      {goalKind === "leads" ? "Leads" : "Purchases"}
                    </label>
                    <input
                      id="result-conversions"
                      type="number"
                      min="0"
                      step="1"
                      value={conversions}
                      onChange={(e) => setConversions(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="result-revenue" className={labelClass}>
                      Revenue
                    </label>
                    <input
                      id="result-revenue"
                      type="number"
                      min="0"
                      step="0.01"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border-strong bg-white/[0.5] px-4 py-3">
                  <p className={labelClass}>Computed preview</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-secondary">
                    {previewItems.map(([label, value, format]) => (
                      <span key={label}>
                        {label}:{" "}
                        <span className="font-medium text-text-primary">
                          {value == null ? "—" : format(value)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-[#ef4444]" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-white/65 px-6 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={pending}
                  className="btn-ghost text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-premium text-sm"
                >
                  {pending ? "Saving…" : "Save results"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
