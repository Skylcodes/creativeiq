"use client";

import { AnimatePresence, motion } from "framer-motion";

type RefreshProgressBannerProps = {
  message: string;
  progress: number;
  error?: string | null;
};

export function RefreshProgressBanner({
  message,
  progress,
  error,
}: RefreshProgressBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl px-5 py-4 ${
        error
          ? "bg-red-50 ring-1 ring-red-200/80"
          : "premium-card premium-card-accent"
      }`}
    >
      {error ? (
        <p className="text-sm font-medium text-red-700">{error}</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0">
              <motion.div
                className="absolute inset-0 rounded-full bg-accent/10"
                animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.85, 0.5] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
              <div className="icon-badge absolute inset-1 rounded-full ring-accent/15" />
            </div>
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.p
                  key={message}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-sm font-medium text-text-primary"
                >
                  {message}
                </motion.p>
              </AnimatePresence>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.05]">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  animate={{ width: `${Math.max(progress, 8)}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
