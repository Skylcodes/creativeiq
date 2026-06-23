"use client";

import { motion } from "framer-motion";

export function EmptyDashboardVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[380px] lg:max-w-[420px]">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="premium-card premium-card-elevated relative overflow-hidden rounded-2xl"
      >
        <div className="flex items-center gap-2 border-b border-black/[0.04] px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
            <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
            <span className="h-2 w-2 rounded-full bg-[#28c840]" />
          </div>
          <span className="mx-auto text-[11px] text-text-muted">
            Funnel Intelligence
          </span>
        </div>

        <div className="space-y-2.5 p-4">
          <div className="flex gap-2.5">
            <div className="flex-1 rounded-xl bg-black/[0.03] p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Brand
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                yourbrand.com
              </p>
            </div>
            <div className="flex-1 rounded-xl bg-accent/8 p-2.5 ring-1 ring-accent/10">
              <p className="text-[10px] font-medium uppercase tracking-wider text-accent">
                Creative
              </p>
              <div className="mt-1.5 flex h-12 items-center justify-center rounded-lg border border-black/[0.08] bg-surface-muted">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 14 14"
                  fill="white"
                  fillOpacity="0.8"
                  aria-hidden
                >
                  <path d="M3 2L11 7L3 12V2Z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-black/[0.02] p-2.5">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Agent debate
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Buyer", color: "#ef4444" },
                { label: "Critic", color: "#f59e0b" },
                { label: "Rival", color: "#8b5cf6" },
                { label: "Verdict", color: "#6947ff" },
              ].map((agent, i) => (
                <motion.span
                  key={agent.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.12 }}
                  className="rounded-full px-2.5 py-1 text-[10px] font-medium text-white"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.label}
                </motion.span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-accent/10 bg-accent/[0.03] p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-wider text-accent">
                Funnel Score
              </p>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="font-display text-xl font-bold text-accent"
              >
                78
              </motion.span>
            </div>
            {[
              { label: "Hook", w: "82%" },
              { label: "Landing", w: "65%" },
              { label: "ICP Match", w: "74%" },
            ].map((bar, i) => (
              <motion.div
                key={bar.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="mb-2 last:mb-0"
              >
                <div className="mb-1 flex justify-between text-[10px] text-text-muted">
                  <span>{bar.label}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.05]">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: bar.w }}
                    transition={{
                      delay: 1 + i * 0.15,
                      duration: 0.6,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
