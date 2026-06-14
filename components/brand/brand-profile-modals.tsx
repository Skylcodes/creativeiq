"use client";

import { AnimatePresence, motion } from "framer-motion";

type RefreshConfirmModalProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function RefreshConfirmModal({
  open,
  onConfirm,
  onCancel,
}: RefreshConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04]"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="font-display text-lg font-semibold text-text-primary">
              Refresh from website?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Your current brand profile will be replaced with a freshly scraped
              version from your website URL. Any unsaved manual edits will be lost.
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={onCancel} className="btn-secondary flex-1 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-full bg-linear-to-r from-accent to-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(110,58,255,0.25)]"
              >
                Refresh profile
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

type UnsavedChangesModalProps = {
  open: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export function UnsavedChangesModal({
  open,
  saving,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={saving ? undefined : onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04]"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="font-display text-lg font-semibold text-text-primary">
              Save changes before leaving?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              You have unsaved edits to your brand profile. Save them before
              navigating away, or discard your changes.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="btn-secondary flex-1 text-sm disabled:opacity-60"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={onDiscard}
                disabled={saving}
                className="flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-text-secondary ring-1 ring-black/[0.08] transition-colors hover:bg-black/[0.03] disabled:opacity-60"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="flex-1 rounded-full bg-linear-to-r from-accent to-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
