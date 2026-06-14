"use client";

import { AnimatePresence, motion } from "framer-motion";

type DeleteAnalysisModalProps = {
  open: boolean;
  title: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteAnalysisModal({
  open,
  title,
  deleting,
  onConfirm,
  onCancel,
}: DeleteAnalysisModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={deleting ? undefined : onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-analysis-title"
          >
            <h3
              id="delete-analysis-title"
              className="font-display text-lg font-semibold text-text-primary"
            >
              Delete this analysis?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              <span className="font-medium text-text-primary">{title}</span> will
              be permanently removed, including its report and uploaded creative.
              This can&apos;t be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={deleting}
                className="btn-secondary flex-1 text-sm disabled:opacity-60"
              >
                Keep analysis
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={deleting}
                className="flex-1 rounded-full bg-[#ef4444] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#dc2626] disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete analysis"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
