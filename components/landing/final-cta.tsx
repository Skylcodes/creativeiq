"use client";

import { motion } from "framer-motion";
import { AnimatedSection } from "./animated-section";

export function FinalCTA() {
  return (
    <AnimatedSection
      id="final-cta"
      className="landing-section-cta relative overflow-x-clip py-20 md:py-28"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/20 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-5 text-center md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-tertiary" />
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">
              Stop launching blind
            </span>
          </div>

          <h2 className="font-display text-[2rem] font-semibold leading-[1.05] tracking-[-0.055em] text-white md:text-[3.5rem]">
            If you&apos;re spending on Meta and TikTok ads,{" "}
            <span className="bg-linear-to-r from-accent-tertiary to-accent bg-clip-text text-transparent">
              you should be using this
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/55">
            Every day you launch without funnel validation is budget you&apos;ll never get back.
            Stress-test your next creative in under 5 minutes — before it costs you thousands.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/sign-up"
              className="btn-primary w-full text-base !px-10 !py-4 shadow-[0_16px_48px_rgba(105,71,255,0.4)] sm:w-auto"
            >
              Get your free Funnel Report
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path
                  d="M3 9H15M15 9L10 4M15 9L10 14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>

          <p className="mt-4 text-sm text-white/35">
            Free analysis · No credit card · Full report in minutes
          </p>

          {/* Feature pills — horizontal strip */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {["7-agent analysis", "Full funnel report", "Action plan included"].map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path
                    d="M2 7L5.5 10.5L12 3.5"
                    stroke="#0ea5e9"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatedSection>
  );
}
