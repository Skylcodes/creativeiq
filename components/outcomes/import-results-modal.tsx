"use client";

import { useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  confirmCsvImport,
  previewCsvImport,
} from "@/lib/outcomes/actions";
import type {
  ImportPreviewResult,
  ImportRowStatus,
} from "@/lib/types/outcome";

type ImportResultsModalProps = {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

type ConfirmSummary = {
  importId: string;
  createdLaunches: number;
  createdOutcomes: number;
  updatedOutcomes: number;
  skipped: number;
  invalid: number;
};

const STATUS_CHIP: Record<
  ImportRowStatus,
  { label: string; className: string }
> = {
  matched: {
    label: "matched",
    className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  },
  create_launch: {
    label: "create launch",
    className: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  },
  unmatched: {
    label: "skip",
    className: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  },
  invalid: {
    label: "invalid",
    className: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  },
  duplicate: {
    label: "duplicate",
    className: "bg-white/10 text-white/60 ring-white/15",
  },
};

export function ImportResultsModal({
  workspaceId,
  open,
  onClose,
  onImported,
}: ImportResultsModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [summary, setSummary] = useState<ConfirmSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetState() {
    setFilename(null);
    setCsvText(null);
    setPreview(null);
    setSummary(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    if (pending) return;
    resetState();
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSummary(null);
    setPreview(null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setFilename(file.name);
      setCsvText(text);
      startTransition(async () => {
        const res = await previewCsvImport({
          workspaceId,
          filename: file.name,
          csvText: text,
        });
        if (!res.success) {
          setError(res.error);
          return;
        }
        setPreview(res.preview);
      });
    };
    reader.onerror = () => {
      setError("Could not read that file. Try again.");
    };
    reader.readAsText(file);
  }

  function handleConfirm() {
    if (!filename || !csvText || !preview) return;
    if (preview.counts.importable === 0) return;

    setError(null);
    startTransition(async () => {
      const res = await confirmCsvImport({
        workspaceId,
        filename,
        csvText,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSummary(res.summary);
      onImported();
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
            onClick={pending ? undefined : handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="modal-panel relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-xl flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-results-title"
          >
            <div className="shrink-0 border-b border-white/10 px-6 py-5">
              <h2
                id="import-results-title"
                className="font-display text-xl font-semibold text-text-primary"
              >
                Import results
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                Upload an Advara template or Meta Ads Manager CSV. Preview first
                — nothing is written until you confirm.
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                {!summary && (
                  <div>
                    <label htmlFor="import-csv-file">CSV file</label>
                    <input
                      ref={fileRef}
                      id="import-csv-file"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileChange}
                      disabled={pending}
                    />
                    {filename && (
                      <p className="mt-2 text-xs text-text-muted">
                        Selected: {filename}
                        {preview ? ` · detected ${preview.format}` : ""}
                      </p>
                    )}
                  </div>
                )}

                {preview && !summary && (
                  <>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <CountPill
                        label="Importable"
                        value={preview.counts.importable}
                      />
                      <CountPill
                        label="Matched"
                        value={preview.counts.matched}
                      />
                      <CountPill
                        label="Create launch"
                        value={preview.counts.createLaunch}
                      />
                      <CountPill
                        label="Skip"
                        value={preview.counts.unmatched}
                      />
                      <CountPill
                        label="Invalid"
                        value={preview.counts.invalid}
                      />
                      <CountPill
                        label="Duplicate"
                        value={preview.counts.duplicate}
                      />
                    </div>

                    {preview.unknownColumns.length > 0 && (
                      <p className="text-xs text-text-muted">
                        Ignored columns: {preview.unknownColumns.join(", ")}
                      </p>
                    )}

                    <ul className="divide-y divide-white/[0.06] rounded-lg border border-white/10">
                      {preview.rows.map((row) => {
                        const chip = STATUS_CHIP[row.status];
                        return (
                          <li
                            key={row.rowIndex}
                            className="flex items-start gap-3 px-3 py-2.5 text-sm"
                          >
                            <span className="shrink-0 tabular-nums text-text-muted">
                              #{row.rowIndex}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${chip.className}`}
                            >
                              {chip.label}
                            </span>
                            <span className="min-w-0 flex-1 text-text-secondary">
                              {row.reason ??
                                rowLabel(row.normalized.externalAdId, row.normalized.analysisId)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}

                {summary && (
                  <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-4">
                    <p className="text-sm font-medium text-text-primary">
                      Import complete
                    </p>
                    <ul className="space-y-1.5 text-sm text-text-secondary">
                      <li>Created launches: {summary.createdLaunches}</li>
                      <li>Created outcomes: {summary.createdOutcomes}</li>
                      <li>Updated outcomes: {summary.updatedOutcomes}</li>
                      <li>Skipped: {summary.skipped}</li>
                      <li>Invalid: {summary.invalid}</li>
                    </ul>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-[#f87171]" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 px-6 py-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={pending}
                  className="btn-ghost text-sm"
                >
                  {summary ? "Close" : "Cancel"}
                </button>
                {!summary && (
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={
                      pending ||
                      !preview ||
                      preview.counts.importable === 0
                    }
                    className="btn-premium text-sm disabled:opacity-40"
                  >
                    {pending && preview
                      ? "Importing…"
                      : pending
                        ? "Previewing…"
                        : "Confirm import"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-text-secondary ring-1 ring-inset ring-white/10">
      {label}:{" "}
      <span className="font-medium text-text-primary tabular-nums">{value}</span>
    </span>
  );
}

function rowLabel(
  externalAdId: string | null,
  analysisId: string | null
): string {
  if (externalAdId) return `Ad ${externalAdId}`;
  if (analysisId) return `Analysis ${analysisId.slice(0, 8)}…`;
  return "Row ready";
}
