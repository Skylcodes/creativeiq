"use client";

import { motion, AnimatePresence } from "framer-motion";

type CancelModalProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CancelModal({ open, onConfirm, onCancel }: CancelModalProps) {
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
          >
            <h3 className="font-display text-lg font-semibold text-text-primary">
              Cancel analysis?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Your progress will be lost. Are you sure you want to return to the
              dashboard?
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={onCancel} className="btn-secondary flex-1 text-sm">
                Keep editing
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-full bg-[#ef4444] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#dc2626]"
              >
                Yes, cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
