"use client";

import { motion, useReducedMotion } from "framer-motion";

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="landing-section-hero relative overflow-x-clip pb-16 pt-28 md:pb-24 md:pt-36">
      {!reduced && (
        <>
          <motion.div
            className="pointer-events-none absolute left-1/2 top-10 h-[30rem] w-[44rem] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
            animate={{ opacity: [0.5, 0.75, 0.5], scale: [1, 1.03, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -right-28 top-44 h-80 w-80 rounded-full bg-accent-tertiary/15 blur-3xl"
            animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.04, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-[2.65rem] font-semibold leading-[0.98] tracking-[-0.06em] text-white md:text-[4.2rem]"
          >
            Know If Your Ad Will Work{" "}
            <span className="text-gradient-accent">Before You Launch Them</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-[1.65] text-white/55 md:text-xl"
          >
            Advara runs your ad creative and landing page through a structured
            multi-agentic process — stress testing your full funnel from every
            angle that matters.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <a href="/sign-up" className="btn-primary w-full sm:w-auto">
              Analyze my funnel free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="#how-it-works" className="btn-secondary landing-hero-btn-secondary w-full sm:w-auto">
              See how it works
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          <div className="pointer-events-none absolute -inset-10 rounded-[42px] bg-accent/15 blur-3xl" />
          <div className="landing-panel noise-overlay relative rounded-[34px] p-3 md:p-4">
            <div className="landing-visual-dark overflow-hidden rounded-[26px]">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 md:px-5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>

              <div className="grid gap-4 p-4 md:grid-cols-[1.1fr_0.9fr] md:p-5">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.07] p-5 shadow-[0_1px_1px_rgba(255,255,255,0.08)_inset]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                        Funnel score
                      </p>
                      <p className="mt-2 font-display text-5xl font-semibold tracking-[-0.06em] text-white">
                        72
                        <span className="ml-1 text-lg font-medium text-white/35">/100</span>
                      </p>
                    </div>
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                        Verdict
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">Fix before launch</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {[
                      ["Ad hook", "84%", "w-[84%]", "bg-accent"],
                      ["Landing match", "58%", "w-[58%]", "bg-amber-400"],
                      ["Offer clarity", "71%", "w-[71%]", "bg-accent-tertiary"],
                    ].map(([label, value, width, color]) => (
                      <div key={label}>
                        <div className="mb-1.5 flex justify-between text-xs">
                          <span className="text-white/55">{label}</span>
                          <span className="font-semibold text-white/80">{value}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className={`h-full rounded-full ${width} ${color}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.07] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      Agent findings
                    </p>
                    <div className="mt-3 space-y-2">
                      {[
                        "CTA tone conflicts with curiosity-led ad hook",
                        "Social proof appears too late for cold traffic",
                        "Pricing context missing above the fold",
                      ].map((finding, i) => (
                        <div
                          key={finding}
                          className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.055] px-3 py-2.5"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/70">
                            {i + 1}
                          </span>
                          <p className="text-left text-xs leading-relaxed text-white/68">
                            {finding}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-accent/25 bg-accent/[0.14] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                      Priority action
                    </p>
                    <p className="mt-2 text-left text-sm font-semibold leading-relaxed text-white">
                      Rewrite landing page CTA to match the ad&apos;s curiosity angle before scaling spend.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
