"use client";

import { motion } from "framer-motion";
import { AnimatedSection } from "./animated-section";

const traditional = [
  "Create ad based on gut feel",
  "Launch and start spending",
  "Hope the creative converts",
  "Analyze results 3–5 days later",
  "Burn budget on losers",
  "Repeat until something sticks",
];

const advara = [
  "Input URL + upload creative",
  "7 agents stress-test the full funnel",
  "Identify weaknesses before spend",
  "Get rewrite suggestions + action plan",
  "Launch with validated confidence",
  "Scale winners, kill losers early",
];

export function Comparison() {
  return (
    <AnimatedSection
      id="comparison"
      className="landing-section-comparison relative overflow-x-clip py-0"
    >
      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative grid min-h-[680px] md:grid-cols-2">
        {/* VS badge */}
        <div className="absolute left-1/2 top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 md:block">
          <div className="landing-comparison-panel flex h-16 w-16 items-center justify-center rounded-full border-white/15 bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <span className="font-display text-sm font-bold text-white/90">VS</span>
          </div>
        </div>

        {/* Guessing — dark red side */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="landing-comparison-negative flex flex-col justify-center px-6 py-16 md:px-12 md:py-20 lg:px-16"
        >
          <div className="mx-auto w-full max-w-md">
            <span className="landing-comparison-panel inline-flex rounded-full border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-400">
              The old way
            </span>
            <h2 className="font-display mt-4 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
              Guessing
            </h2>
            <p className="mt-3 text-base text-white/55">
              The process most brands still use — and why creative budgets disappear.
            </p>

            <ul className="mt-10 space-y-3">
              {traditional.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="landing-comparison-panel flex items-start gap-3 rounded-xl px-3.5 py-3"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400 ring-1 ring-red-500/25">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                      <path
                        d="M2 2L8 8M8 2L2 8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <span className="text-sm leading-relaxed text-white/60">{item}</span>
                </motion.li>
              ))}
            </ul>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
              className="landing-comparison-stat-bad mt-10 rounded-2xl px-5 py-4"
            >
              <p className="font-display text-2xl font-bold tabular-nums text-red-400">$1,000+</p>
              <p className="mt-1 text-sm font-medium text-red-300/70">
                wasted per failed creative
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Mobile VS divider */}
        <div className="col-span-full flex items-center justify-center border-y border-white/8 bg-white/5 py-3 md:hidden">
          <span className="landing-comparison-panel rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white/50">
            VS
          </span>
        </div>

        {/* Knowing — dark violet side */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="landing-comparison-positive flex flex-col justify-center px-6 py-16 md:px-12 md:py-20 lg:px-16"
        >
          <div className="mx-auto w-full max-w-md">
            <span className="landing-comparison-panel inline-flex rounded-full border-accent/25 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-tertiary">
              With Advara
            </span>
            <h2 className="font-display mt-4 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
              Knowing
            </h2>
            <p className="mt-3 text-base text-white/55">
              The difference between brands that scale profitably and brands that burn through
              budgets.
            </p>

            <ul className="mt-10 space-y-3">
              {advara.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="landing-comparison-panel flex items-start gap-3 rounded-xl px-3.5 py-3"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-tertiary ring-1 ring-accent/30">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                      <path
                        d="M2 5L4 7L8 3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="text-sm font-medium leading-relaxed text-white/80">{item}</span>
                </motion.li>
              ))}
            </ul>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
              className="landing-comparison-stat-good mt-10 rounded-2xl px-5 py-4"
            >
              <p className="font-display text-lg font-bold text-accent-tertiary">
                Launch with confidence
              </p>
              <p className="mt-1 text-sm text-white/55">
                Kill losers before they scale. Scale winners with proof.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AnimatedSection>
  );
}
