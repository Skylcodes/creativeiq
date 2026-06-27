"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { NewAnalysisCta } from "@/components/dashboard/new-analysis-cta";
import { Sparkline } from "./sparkline";

const PLACEHOLDER_SCORES = [52, 58, 61, 68, 72, 75, 78, 82];

export function PerformanceEmptyState() {
  return (
    <div className="relative mx-auto max-w-3xl py-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-white">
          Your performance story starts here
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/55">
          Run at least 2 analyses to unlock score tracking, trend charts, and
          coaching insights. Every analysis builds a picture of how your creative
          quality improves over time.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="relative mx-auto mt-10 overflow-hidden dash-card p-8"
      >
        <div className="pointer-events-none select-none blur-[6px] opacity-50">
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {["Avg 72", "Best 85", "+14 pts", "8 runs"].map((l) => (
              <div
                key={l}
                className="app-inset rounded-xl py-4 text-sm font-semibold text-white/40"
              >
                {l}
              </div>
            ))}
          </div>
          <Sparkline
            values={PLACEHOLDER_SCORES}
            width={600}
            height={120}
            stroke="#6947ff"
            fill="rgba(94, 80, 235,0.1)"
            animate={false}
            className="mx-auto w-full max-w-xl"
          />
        </div>

        <div className="absolute inset-0 flex items-center justify-center bg-[#080711]/50 backdrop-blur-sm">
          <div className="dash-card px-8 py-6">
            <p className="text-sm font-medium text-white">
              Preview of your performance dashboard
            </p>
            <p className="mt-1 text-xs text-white/45">
              One more analysis unlocks the full view
            </p>
            <div className="mt-5 flex justify-center">
              <NewAnalysisCta label="Run Your Next Analysis" />
            </div>
          </div>
        </div>
      </motion.div>

      <Link
        href="/analyses"
        className="mt-6 inline-block text-sm font-medium text-accent hover:text-accent-hover"
      >
        View past analyses →
      </Link>
    </div>
  );
}
