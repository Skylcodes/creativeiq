"use client";

import { motion } from "framer-motion";
import {
  AnimatedSection,
  StaggerContainer,
  staggerItem,
} from "./animated-section";

const testimonials = [
  {
    quote:
      "We used to burn through $15k before knowing if a creative worked. CreativeIQ told us the landing page was the problem — not the ad. Saved us two weeks of wasted spend.",
    name: "Marcus Klein",
    role: "Founder",
    company: "Velour Skin Co.",
    avatar: "MK",
    color: "#6e3aff",
    metric: "$12k saved on first test",
  },
  {
    quote:
      "The multi-agent debate is what sold me. It's not one AI saying 'looks good' — five different perspectives tearing apart your funnel. That's how you find the real issues.",
    name: "Jessica Reyes",
    role: "Head of Media Buying",
    company: "Peak Nutrition",
    avatar: "JR",
    color: "#0d9488",
    metric: "34% CVR lift after revisions",
  },
  {
    quote:
      "I run creative strategy for 8 DTC brands. CreativeIQ is now step zero before any launch. The rewrite suggestions alone are worth 10x the subscription.",
    name: "Sarah Lin",
    role: "Creative Strategist",
    company: "Independent · 8 brands",
    avatar: "SL",
    color: "#f59e0b",
    metric: "Used on 40+ creatives",
  },
  {
    quote:
      "Our agency started offering 'pre-launch funnel audits' powered by CreativeIQ. Clients love it — and our creative approval rate went from 40% to 78%.",
    name: "Alex Porter",
    role: "DTC Operator",
    company: "Scalehouse Agency",
    avatar: "AP",
    color: "#ef4444",
    metric: "78% creative approval rate",
  },
];

export function Testimonials() {
  return (
    <AnimatedSection className="section-padding relative overflow-x-clip bg-surface-muted/30">
      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Social proof
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-text-primary md:text-5xl">
            Built for people who spend real money on ads
          </h2>
        </div>

        <StaggerContainer className="mt-14 grid gap-5 md:grid-cols-2">
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={staggerItem}
              className="card-hover flex flex-col rounded-2xl border border-white/80 bg-white p-7 shadow-soft"
            >
              <div className="mb-4 flex gap-0.5" aria-label="5 star rating">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="#f59e0b" aria-hidden>
                    <path d="M7 1L8.5 5H13L9.5 7.5L11 12L7 9.5L3 12L4.5 7.5L1 5H5.5L7 1Z" />
                  </svg>
                ))}
              </div>
              <blockquote className="flex-1 text-base leading-relaxed text-text-primary">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                    <p className="text-xs text-text-muted">
                      {t.role} · {t.company}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-accent-light px-3 py-1 text-[10px] font-semibold text-accent">
                  {t.metric}
                </span>
              </div>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </AnimatedSection>
  );
}
