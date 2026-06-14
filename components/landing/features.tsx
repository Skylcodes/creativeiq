"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  AnimatedSection,
  StaggerContainer,
  staggerItem,
} from "./animated-section";

const reportSections = [
  {
    id: "score",
    label: "Conversion Score",
    title: "Funnel Conversion Score",
    description:
      "A single number that tells you whether this creative + landing page combination is ready to scale — or needs work first.",
    preview: (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="relative">
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
            <circle cx="60" cy="60" r="52" fill="none" stroke="#f4f4f5" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r="52" fill="none" stroke="#6e3aff" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="327"
              initial={{ strokeDashoffset: 327 }}
              whileInView={{ strokeDashoffset: 327 - (327 * 0.78) }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-bold text-text-primary">78</span>
            <span className="text-[10px] text-text-muted">/ 100</span>
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-accent-secondary">Ready with revisions</p>
      </div>
    ),
  },
  {
    id: "funnel",
    label: "Funnel Breakdown",
    title: "Full Funnel Breakdown",
    description:
      "See exactly where your funnel leaks — from ad hook to landing page hero to checkout CTA — with specific drop-off points identified.",
    preview: (
      <div className="space-y-2 py-2">
        {[
          { stage: "Ad Hook", score: 82, width: "82%" },
          { stage: "Click Intent", score: 71, width: "71%" },
          { stage: "Landing Hero", score: 65, width: "65%" },
          { stage: "Product Page", score: 88, width: "88%" },
          { stage: "Checkout CTA", score: 54, width: "54%" },
        ].map((s) => (
          <div key={s.stage}>
            <div className="mb-1 flex justify-between text-[10px]">
              <span className="text-text-secondary">{s.stage}</span>
              <span className="font-medium text-text-primary">{s.score}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-linear-to-r from-accent to-accent-secondary"
                style={{ width: s.width }}
              />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "icp",
    label: "ICP Analysis",
    title: "ICP Funnel Simulation",
    description:
      "Watch your ideal customer profile move through your funnel — with predicted objections, drop-off triggers, and conversion likelihood.",
    preview: (
      <div className="space-y-3 py-2">
        <div className="rounded-lg border border-border bg-surface-muted/50 p-3">
          <p className="text-[10px] font-semibold uppercase text-text-muted">Primary ICP</p>
          <p className="text-xs font-medium text-text-primary">Women 28–42, skincare-conscious, $75k+</p>
        </div>
        {[
          "Responds to social proof ✓",
          "Skeptical of 'miracle' claims ⚠",
          "Price-sensitive at checkout ✗",
        ].map((item) => (
          <p key={item} className="text-[11px] text-text-secondary">{item}</p>
        ))}
      </div>
    ),
  },
  {
    id: "weakness",
    label: "Weakness Detection",
    title: "Creative Weakness Detection",
    description:
      "Pinpointed flaws in your creative — weak hooks, misaligned messaging, CTA friction — ranked by revenue impact.",
    preview: (
      <div className="space-y-2 py-2">
        {[
          { issue: "CTA mismatch", severity: "Critical", color: "#ef4444" },
          { issue: "Hook too generic", severity: "High", color: "#f59e0b" },
          { issue: "Missing social proof", severity: "Medium", color: "#6e3aff" },
        ].map((w) => (
          <div key={w.issue} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span className="text-[11px] text-text-primary">{w.issue}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-semibold text-white"
              style={{ backgroundColor: w.color }}
            >
              {w.severity}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "competitor",
    label: "Competitor Insights",
    title: "Competitive Positioning",
    description:
      "How your creative stacks against category leaders — angle overlap, differentiation gaps, and whitespace opportunities.",
    preview: (
      <div className="space-y-2 py-2">
        {[
          { brand: "Your Brand", overlap: 34 },
          { brand: "Competitor A", overlap: 78 },
          { brand: "Competitor B", overlap: 52 },
        ].map((c) => (
          <div key={c.brand} className="flex items-center gap-3">
            <span className="w-24 truncate text-[10px] text-text-secondary">{c.brand}</span>
            <div className="flex-1 h-1.5 rounded-full bg-surface-muted">
              <div
                className={`h-full rounded-full ${c.brand === "Your Brand" ? "bg-accent" : "bg-text-muted/30"}`}
                style={{ width: `${c.overlap}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "rewrite",
    label: "Creative Rewrites",
    title: "Creative Rewrite Suggestions",
    description:
      "Agent-generated rewrites for your hook, body copy, and CTA — optimized for your specific funnel and ICP.",
    preview: (
      <div className="space-y-2 py-2">
        <div className="rounded-lg border border-red-100 bg-red-50/50 p-2.5">
          <p className="text-[9px] font-semibold uppercase text-red-400">Before</p>
          <p className="text-[11px] text-text-secondary line-through">Shop our best-selling serum today</p>
        </div>
        <div className="rounded-lg border border-accent-secondary/20 bg-accent-secondary/5 p-2.5">
          <p className="text-[9px] font-semibold uppercase text-accent-secondary">After</p>
          <p className="text-[11px] font-medium text-text-primary">See why 12,000 women switched their routine in 14 days</p>
        </div>
      </div>
    ),
  },
  {
    id: "launch",
    label: "Launch Recs",
    title: "Launch Recommendations",
    description:
      "Clear go/no-go guidance with confidence scoring — launch as-is, revise first, or kill and pivot.",
    preview: (
      <div className="py-2 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M10 3V10L14 13" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="10" cy="10" r="8" stroke="#f59e0b" strokeWidth="1.5" />
          </svg>
        </div>
        <p className="font-display text-lg font-bold text-amber-600">Revise & Retest</p>
        <p className="mt-1 text-[10px] text-text-muted">Confidence: 84%</p>
      </div>
    ),
  },
  {
    id: "action",
    label: "Action Plan",
    title: "Priority Action Plan",
    description:
      "Ranked fixes ordered by expected conversion lift — so your team knows exactly what to change first.",
    preview: (
      <div className="space-y-2 py-2">
        {[
          { action: "Rewrite landing page CTA", lift: "+18% CVR", priority: 1 },
          { action: "Add UGC testimonial above fold", lift: "+12% CVR", priority: 2 },
          { action: "Shorten hook to 3 seconds", lift: "+8% CVR", priority: 3 },
        ].map((a) => (
          <div key={a.action} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
              {a.priority}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[11px] text-text-primary">{a.action}</p>
            </div>
            <span className="text-[10px] font-semibold text-accent-secondary">{a.lift}</span>
          </div>
        ))}
      </div>
    ),
  },
];

export function Features() {
  const [active, setActive] = useState(0);
  const section = reportSections[active];

  return (
    <AnimatedSection
      id="output"
      className="section-padding relative overflow-x-clip bg-surface-muted/40"
    >
      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            What you get
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-text-primary md:text-5xl">
            A complete Funnel Intelligence Report
          </h2>
          <p className="mt-5 text-lg text-text-secondary">
            Not vague AI feedback — a structured, actionable report your media
            buyer and creative team can execute on immediately.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Tab list */}
          <StaggerContainer className="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {reportSections.map((s, i) => (
              <motion.button
                key={s.id}
                variants={staggerItem}
                type="button"
                onClick={() => setActive(i)}
                className={`shrink-0 rounded-xl border px-4 py-3 text-left text-sm transition-all duration-300 lg:w-full ${
                  active === i
                    ? "border-accent/20 bg-white font-medium text-accent shadow-soft"
                    : "border-transparent bg-white/50 text-text-secondary hover:bg-white"
                }`}
              >
                {s.label}
              </motion.button>
            ))}
          </StaggerContainer>

          {/* Preview panel */}
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-white/80 bg-white p-8 shadow-elevated"
          >
            <h3 className="font-display text-xl font-semibold text-text-primary">
              {section.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {section.description}
            </p>
            <div className="mt-6 rounded-xl border border-border bg-surface-muted/30 p-5">
              {section.preview}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatedSection>
  );
}
