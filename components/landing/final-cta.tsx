"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedSection } from "./animated-section";

export function FinalCTA() {
  const reduced = useReducedMotion();

  return (
    <AnimatedSection id="final-cta" className="section-padding relative overflow-x-clip">
      <div className="relative mx-auto max-w-4xl px-5 md:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-accent/10 bg-linear-to-br from-[#faf5ff] via-white to-[#ecfdf5] p-10 text-center shadow-elevated md:p-16">
          {!reduced && (
            <>
              <motion.div
                className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-accent/10 blur-3xl"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 8, repeat: Infinity }}
              />
              <motion.div
                className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-accent-secondary/10 blur-3xl"
                animate={{ scale: [1.1, 1, 1.1] }}
                transition={{ duration: 10, repeat: Infinity }}
              />
            </>
          )}

          <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Stop launching blind
          </p>
          <h2 className="relative mt-4 font-display text-3xl font-semibold tracking-tight text-text-primary md:text-5xl">
            If you&apos;re spending on Meta and TikTok ads,{" "}
            <span className="text-gradient-accent">you should be using this</span>
          </h2>
          <p className="relative mx-auto mt-5 max-w-xl text-lg leading-relaxed text-text-secondary">
            Every day you launch without funnel validation is budget you&apos;ll
            never get back. Stress-test your next creative in under 5 minutes —
            before it costs you thousands.
          </p>

          <div className="relative mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="/sign-up" className="btn-primary w-full sm:w-auto text-base !px-8 !py-4">
              Get your free Funnel Report
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path d="M3 9H15M15 9L10 4M15 9L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>

          <p className="relative mt-4 text-xs text-text-muted">
            Free analysis · No credit card · Full report in minutes
          </p>

          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M2 7L5.5 10.5L12 3.5" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              5-agent analysis
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M2 7L5.5 10.5L12 3.5" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Full funnel report
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M2 7L5.5 10.5L12 3.5" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Action plan included
            </span>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
