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
        <div className="modal-overlay flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={pending ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="modal-panel relative z-10 flex max-h-[min(90vh,680px)] w-full max-w-lg flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-launch-title"
          >
            <div className="shrink-0 border-b border-white/10 px-6 py-5">
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
                  <label htmlFor="launch-platform">Platform</label>
                  <select
                    id="launch-platform"
                    value={platform}
                    onChange={(e) =>
                      setPlatform(e.target.value as LaunchPlatform)
                    }
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
                    <label htmlFor="launch-variant">Variant launched</label>
                    <select
                      id="launch-variant"
                      value={variantId}
                      onChange={(e) => setVariantId(e.target.value)}
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
                  <label htmlFor="launch-date">Launch date</label>
                  <input
                    id="launch-date"
                    type="date"
                    value={launchedAt}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setLaunchedAt(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="launch-ad-id">Ad ID (optional)</label>
                    <input
                      id="launch-ad-id"
                      value={externalAdId}
                      onChange={(e) => setExternalAdId(e.target.value)}
                      placeholder="From Ads Manager"
                    />
                  </div>
                  <div>
                    <label htmlFor="launch-campaign-id">
                      Campaign ID (optional)
                    </label>
                    <input
                      id="launch-campaign-id"
                      value={externalCampaignId}
                      onChange={(e) => setExternalCampaignId(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="launch-notes">Notes (optional)</label>
                  <textarea
                    id="launch-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                {error && (
                  <p className="text-sm text-[#f87171]" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 px-6 py-4">
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
        </div>
      )}
    </AnimatePresence>
  );
}
