"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { logLaunch } from "@/lib/outcomes/actions";
import type { Analysis } from "@/lib/types/analysis";
import type { LaunchPlatform } from "@/lib/types/outcome";
import type { StoredAnalysisVariant } from "@/lib/types/comparison";

type LogLaunchModalProps = {
  analysis: Analysis;
  open: boolean;
  onClose: () => void;
  onLogged: () => void;
};

const fieldClass =
  "w-full rounded-2xl border border-border-strong bg-white/[0.88] px-4 py-3 text-sm text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-accent/[0.45] focus:bg-white focus:ring-4 focus:ring-accent/[0.12]";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted";

const PLATFORM_OPTIONS: Array<{ id: LaunchPlatform; label: string }> = [
  { id: "meta", label: "Meta" },
  { id: "tiktok", label: "TikTok" },
  { id: "other", label: "Other" },
];

export function LogLaunchModal({
  analysis,
  open,
  onClose,
  onLogged,
}: LogLaunchModalProps) {
  const variants = (analysis.variants ?? []) as StoredAnalysisVariant[];
  const isComparison = analysis.analysis_mode === "comparison";

  const [platform, setPlatform] = useState<LaunchPlatform>("meta");
  const [launchedAt, setLaunchedAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [externalAdId, setExternalAdId] = useState("");
  const [externalCampaignId, setExternalCampaignId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await logLaunch({
        workspaceId: analysis.workspace_id,
        analysisId: analysis.id,
        variantId: isComparison ? variantId : null,
        platform,
        launchedAt,
        externalAdId: externalAdId || undefined,
        externalCampaignId: externalCampaignId || undefined,
        notes: notes || undefined,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      onLogged();
      onClose();
    });
  }

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
            className="premium-card premium-card-elevated fixed left-1/2 top-1/2 z-50 flex max-h-[min(90vh,680px)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-launch-title"
          >
            <div className="shrink-0 border-b border-white/65 px-6 py-5">
              <h2
                id="log-launch-title"
                className="font-display text-xl font-semibold text-text-primary"
              >
                Log Launch
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Track this creative in market so you can compare Advara&apos;s
                grade against real results.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                <div>
                  <label htmlFor="launch-platform" className={labelClass}>
                    Platform
                  </label>
                  <select
                    id="launch-platform"
                    value={platform}
                    onChange={(e) =>
                      setPlatform(e.target.value as LaunchPlatform)
                    }
                    className={fieldClass}
                  >
                    {PLATFORM_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {isComparison && variants.length > 0 && (
                  <div>
                    <label htmlFor="launch-variant" className={labelClass}>
                      Variant launched
                    </label>
                    <select
                      id="launch-variant"
                      value={variantId}
                      onChange={(e) => setVariantId(e.target.value)}
                      className={fieldClass}
                    >
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="launch-date" className={labelClass}>
                    Launch date
                  </label>
                  <input
                    id="launch-date"
                    type="date"
                    value={launchedAt}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setLaunchedAt(e.target.value)}
                    className={fieldClass}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="launch-ad-id" className={labelClass}>
                      Ad ID (optional)
                    </label>
                    <input
                      id="launch-ad-id"
                      value={externalAdId}
                      onChange={(e) => setExternalAdId(e.target.value)}
                      className={fieldClass}
                      placeholder="From Ads Manager"
                    />
                  </div>
                  <div>
                    <label htmlFor="launch-campaign-id" className={labelClass}>
                      Campaign ID (optional)
                    </label>
                    <input
                      id="launch-campaign-id"
                      value={externalCampaignId}
                      onChange={(e) => setExternalCampaignId(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="launch-notes" className={labelClass}>
                    Notes (optional)
                  </label>
                  <textarea
                    id="launch-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className={fieldClass}
                  />
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
                  {pending ? "Saving…" : "Log launch"}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
