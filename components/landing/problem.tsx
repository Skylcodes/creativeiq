"use client";

import { motion } from "framer-motion";
import {
  AnimatedSection,
  StaggerContainer,
  staggerItem,
} from "./animated-section";

const painPoints = [
  {
    stat: "$4,200",
    label: "avg. wasted per failed creative test",
    description:
      "Most DTC brands burn 3–5 creatives before finding a winner. Each miss costs real money — and momentum.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M10 2V18M6 6C6 4 8 2 10 2C12 2 14 4 14 6C14 10 6 10 6 14C6 16 8 18 10 18C12 18 14 16 14 14" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    accent: "#fef2f2",
    border: "rgba(239,68,68,0.15)",
  },
  {
    stat: "72 hrs",
    label: "before you know if creative failed",
    description:
      "By the time Meta tells you ROAS is underwater, you've already scaled the wrong angle for days.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="8" stroke="#f59e0b" strokeWidth="1.5" />
        <path d="M10 6V10L13 12" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    accent: "#fffbeb",
    border: "rgba(245,158,11,0.15)",
  },
  {
    stat: "0 tools",
    label: "analyze ad + landing page together",
    description:
      "Creative tools review ads. CRO tools review pages. Nobody stress-tests the full funnel as one system.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M4 10H16M10 4V16" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="10" r="8" stroke="#71717a" strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    ),
    accent: "#f4f4f5",
    border: "rgba(0,0,0,0.08)",
  },
];

const audiences = ["DTC Founders", "Media Buyers", "Creative Strategists"];

export function Problem() {
  return (
    <AnimatedSection id="problem" className="section-padding relative overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-red-50/30 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-red-500/80">
            The cost of guessing
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-text-primary md:text-5xl">
            Every launch without validation is a{" "}
            <span className="text-red-500/90">bet you can&apos;t afford</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-text-secondary">
            You&apos;re not bad at ads. Your process is broken — because no tool
            connects creative performance to landing page conversion before you
            spend.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {audiences.map((a) => (
              <span
                key={a}
                className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary"
              >
                {a}
              </span>
            ))}
          </div>
        </div>

        {/* Before state visualization */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto mt-14 max-w-4xl"
        >
          <div className="relative overflow-hidden rounded-2xl border border-red-100 bg-white p-6 shadow-[0_8px_40px_rgba(239,68,68,0.06)] md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
                The traditional launch cycle
              </p>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                High risk
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 md:flex-row md:justify-between">
              {[
                { step: "Create ad", sub: "Gut feel" },
                { step: "Launch", sub: "$2k/day spend" },
                { step: "Wait", sub: "3–5 days" },
                { step: "Analyze", sub: "Too late" },
                { step: "Repeat", sub: "Burn budget" },
              ].map((item, i, arr) => (
                <div key={item.step} className="flex items-center gap-2">
                  <div className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-center">
                    <p className="text-sm font-semibold text-text-primary">{item.step}</p>
                    <p className="text-[11px] text-red-400">{item.sub}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <svg className="hidden h-4 w-4 shrink-0 text-red-200 md:block" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M3 8H13M10 5L13 8L10 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm italic text-text-muted">
              &ldquo;We spent $18k on a creative that looked great in the boardroom but
              died on the landing page.&rdquo;
            </p>
          </div>
        </motion.div>

        <StaggerContainer className="mt-12 grid gap-5 md:grid-cols-3">
          {painPoints.map((point) => (
            <motion.div
              key={point.label}
              variants={staggerItem}
              className="card-hover rounded-2xl border p-6"
              style={{
                backgroundColor: point.accent,
                borderColor: point.border,
              }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft">
                {point.icon}
              </div>
              <p className="font-display text-3xl font-bold tracking-tight text-text-primary">
                {point.stat}
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">{point.label}</p>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {point.description}
              </p>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </AnimatedSection>
  );
}
