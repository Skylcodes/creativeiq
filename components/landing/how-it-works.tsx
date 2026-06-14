"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  AnimatedSection,
  StaggerContainer,
  staggerItem,
} from "./animated-section";

const steps = [
  {
    number: "01",
    title: "Input your brand URL",
    description:
      "CreativeIQ crawls your site, product pages, and brand positioning — building context for the full funnel analysis.",
    visual: (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="6" stroke="#6e3aff" strokeWidth="1.2" />
            <path d="M4 7H10M7 4V10" stroke="#6e3aff" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="text-xs text-text-muted">https://</span>
          <span className="text-xs font-medium text-text-primary">yourbrand.com</span>
        </div>
        <div className="flex gap-2">
          {["Homepage", "Product", "About"].map((p) => (
            <span key={p} className="rounded-md bg-accent-light px-2 py-1 text-[10px] font-medium text-accent">
              {p} ✓
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    number: "02",
    title: "Upload your ad creative",
    description:
      "Drop in a video, image, or script. CreativeIQ analyzes hooks, angles, CTAs, and messaging — exactly as your customer will experience it.",
    visual: (
      <div className="relative overflow-hidden rounded-lg border border-dashed border-accent/30 bg-accent-light/30 p-4 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M9 2V11M9 11L6 8M9 11L12 8" stroke="#6e3aff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 14H16" stroke="#6e3aff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-xs font-medium text-accent">Drop creative here</p>
        <p className="text-[10px] text-text-muted">MP4, PNG, or script</p>
      </div>
    ),
  },
  {
    number: "03",
    title: "Receive your Funnel Intelligence Report",
    description:
      "Five AI agents debate your creative against your landing page. You get scores, weaknesses, rewrites, and a prioritized action plan.",
    visual: (
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-soft">
          <span className="text-[11px] text-text-secondary">Funnel Score</span>
          <span className="font-display text-xl font-bold text-accent">78</span>
        </div>
        {["Ad Analysis ✓", "Landing Page ✓", "ICP Simulation ✓", "Action Plan ✓"].map((item) => (
          <div key={item} className="flex items-center gap-2 text-[11px] text-text-secondary">
            <span className="text-accent-secondary">●</span> {item}
          </div>
        ))}
      </div>
    ),
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);

  return (
    <AnimatedSection
      id="how-it-works"
      className="section-padding relative overflow-x-clip bg-surface-muted/40"
    >
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            How it works
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-text-primary md:text-5xl">
            Three inputs. One complete funnel verdict.
          </h2>
          <p className="mt-5 text-lg text-text-secondary">
            No integrations. No learning curve. Paste your URL, upload your
            creative, and let the agents do the work.
          </p>
        </div>

        <div className="mt-16 grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Step selector */}
          <StaggerContainer className="space-y-4">
            {steps.map((step, i) => (
              <motion.button
                key={step.number}
                variants={staggerItem}
                type="button"
                onClick={() => setActive(i)}
                className={`w-full rounded-2xl border p-6 text-left transition-all duration-300 ${
                  active === i
                    ? "border-accent/25 bg-white shadow-elevated"
                    : "border-transparent bg-white/50 hover:bg-white hover:shadow-soft"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`font-display text-sm font-bold transition-colors ${
                      active === i ? "text-accent" : "text-text-muted"
                    }`}
                  >
                    {step.number}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-text-primary">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </StaggerContainer>

          {/* Visual panel */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-linear-to-br from-accent/5 to-accent-secondary/5 blur-xl" />
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl border border-white/80 bg-white p-8 shadow-elevated"
            >
              <div className="mb-6 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <p className="text-xs font-medium text-text-muted">
                  Step {steps[active].number} — Live preview
                </p>
              </div>
              {steps[active].visual}

              {/* Animated connector dots */}
              <div className="mt-8 flex items-center justify-center gap-3">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      active === i ? "w-8 bg-accent" : "w-2 bg-border-strong"
                    }`}
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
