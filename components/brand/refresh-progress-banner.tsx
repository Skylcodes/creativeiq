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
      className={`rounded-xl px-5 py-4 ${
        error
          ? "border border-red-400/25 bg-red-400/[0.08]"
          : "dash-card"
      }`}
    >
      {error ? (
        <p className="text-sm font-medium text-red-300">{error}</p>
      ) : (
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.p
              key={message}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-sm font-medium text-white"
            >
              {message}
            </motion.p>
          </AnimatePresence>
          <div className="mt-3 h-1 overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full bg-accent"
              animate={{ width: `${Math.max(progress, 8)}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
