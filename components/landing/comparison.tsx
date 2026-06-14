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

const creativeiq = [
  "Input URL + upload creative",
  "5 agents stress-test the full funnel",
  "Identify weaknesses before spend",
  "Get rewrite suggestions + action plan",
  "Launch with validated confidence",
  "Scale winners, kill losers early",
];

export function Comparison() {
  return (
    <AnimatedSection id="comparison" className="section-padding relative overflow-x-clip">
      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            The shift
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-text-primary md:text-5xl">
            Guessing vs. knowing
          </h2>
          <p className="mt-5 text-lg text-text-secondary">
            The difference between brands that scale profitably and brands that
            burn through creative budgets.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {/* Traditional */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-2xl border border-red-100 bg-white p-8"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-red-200 to-red-300" />
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-text-primary">
                Traditional Process
              </h3>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-500">
                Reactive
              </span>
            </div>
            <ul className="space-y-4">
              {traditional.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-400">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                      <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="text-sm text-text-secondary">{item}</span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-8 rounded-xl bg-red-50/60 px-4 py-3">
              <p className="text-xs font-medium text-red-600">
                Result: $4,200+ wasted per failed creative, on average
              </p>
            </div>
          </motion.div>

          {/* CreativeIQ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-2xl border border-accent/15 bg-white p-8 shadow-elevated"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-accent to-accent-secondary" />
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-text-primary">
                With CreativeIQ
              </h3>
              <span className="rounded-full bg-accent-light px-3 py-1 text-xs font-medium text-accent">
                Proactive
              </span>
            </div>
            <ul className="space-y-4">
              {creativeiq.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-light text-accent">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                      <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-sm text-text-primary">{item}</span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-8 rounded-xl bg-accent-light/60 px-4 py-3">
              <p className="text-xs font-medium text-accent">
                Result: Launch with confidence. Kill losers before they scale.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatedSection>
  );
}
