"use client";

import { motion } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";
import {
  CountUp,
  GlassBadge,
  GlassInset,
  MetricBar,
  PanelOrbs,
  PanelSubtitle,
  PanelTitle,
  ScoreRing,
  SectionLabel,
  ShowcaseCard,
  staggerContainer,
  staggerItem,
} from "./shared";

type PanelProps = {
  accentRgb: string;
  accentColor: string;
};

/* ── Tab 1: Funnel Analysis ── */

export function FunnelAnalysisPanel({ accentRgb, accentColor }: PanelProps) {
  const leaks = [
    { stage: "Ad Hook → Click", issue: "Curiosity gap too weak", impact: "High" as const },
    { stage: "Landing Hero", issue: "Headline mismatch with ad", impact: "Critical" as const },
    { stage: "Offer Clarity", issue: "Discount buried below fold", impact: "Medium" as const },
    { stage: "Checkout CTA", issue: "Hard sell vs. ad tone", impact: "High" as const },
  ];

  const fixes = [
    { rank: 1, action: "Align landing hero with ad hook", lift: "+14% CVR" },
    { rank: 2, action: "Move offer above social proof", lift: "+9% CVR" },
    { rank: 3, action: "Soften checkout CTA copy", lift: "+6% CVR" },
  ];

  const personas = [
    {
      name: "Highly Aware Buyer",
      reaction: "I've seen this product before — show me why now is different.",
      sentiment: "neutral" as const,
      initial: "HA",
    },
    {
      name: "Problem Aware Buyer",
      reaction: "This speaks to my routine frustration. I'd click to learn more.",
      sentiment: "positive" as const,
      initial: "PA",
    },
    {
      name: "Skeptical Buyer",
      reaction: "Another skincare claim. Where's proof this works for sensitive skin?",
      sentiment: "negative" as const,
      initial: "SB",
    },
  ];

  const impactStyles = {
    Critical: "border-l-red-400 bg-red-500/10 text-red-300",
    High: "border-l-amber-400 bg-amber-500/10 text-amber-300",
    Medium: "border-l-white/20 bg-white/5 text-white/50",
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="relative">
      <PanelOrbs accentRgb={accentRgb} />
      <motion.div variants={staggerItem} className="relative z-[1]">
        <SectionLabel>Funnel Analysis</SectionLabel>
        <PanelTitle>Find Exactly Why Your Ads Aren&apos;t Converting</PanelTitle>
        <PanelSubtitle>
          Full-funnel intelligence — creative, landing page, message match, and ICP simulation in
          one dashboard.
        </PanelSubtitle>
      </motion.div>

      <div className="relative z-[1] mt-8 grid gap-5 lg:grid-cols-[1fr_300px]">
        <motion.div variants={staggerItem} className="space-y-5">
          <ShowcaseCard accentRgb={accentRgb} className="p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <GlassBadge tone="accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Funnel Intelligence
              </GlassBadge>
              <GlassBadge tone="warning">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Revise before scale
              </GlassBadge>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ScoreRing score={74} label="Conversion" color={accentColor} />
              <ScoreRing score={81} label="Creative" color="#0ea5e9" />
              <ScoreRing score={67} label="Landing Page" color="#8b5cf6" />
              <ScoreRing score={58} label="Message Match" color="#f59e0b" />
            </div>
          </ShowcaseCard>

          <div className="grid gap-4 md:grid-cols-2">
            <ShowcaseCard accentRgb={accentRgb} className="p-5" float>
              <SectionLabel>Funnel Flow</SectionLabel>
              <div className="mt-3 space-y-2.5">
                {[
                  { label: "Ad Impression", pct: 100 },
                  { label: "Hook Retention", pct: 72 },
                  { label: "Landing Click", pct: 48 },
                  { label: "Add to Cart", pct: 31 },
                  { label: "Purchase", pct: 18 },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className="w-[5.5rem] shrink-0 text-[10px] font-medium text-white/50">
                      {step.label}
                    </span>
                    <div className="landing-workflow-metric-track relative h-7 flex-1 overflow-hidden rounded-lg">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-lg"
                        style={{
                          background: `linear-gradient(90deg, rgba(${accentRgb}, 0.75), rgba(${accentRgb}, 0.95))`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${step.pct}%` }}
                        transition={{ duration: 0.85, delay: 0.12 * i, ease: [0.22, 1, 0.36, 1] }}
                      />
                      <span className="relative z-10 flex h-full items-center pl-2.5 text-[9px] font-bold text-white drop-shadow-sm">
                        {step.pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ShowcaseCard>

            <ShowcaseCard accentRgb="239, 68, 68" className="p-5">
              <SectionLabel>Conversion Leaks</SectionLabel>
              <div className="mt-3 space-y-2">
                {leaks.map((leak) => (
                  <div
                    key={leak.stage}
                    className={`landing-workflow-inset border-l-[3px] px-3 py-2.5 ${impactStyles[leak.impact]}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-white/90">{leak.stage}</p>
                      <span className="text-[9px] font-bold uppercase">{leak.impact}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-white/45">{leak.issue}</p>
                  </div>
                ))}
              </div>
            </ShowcaseCard>
          </div>

          <ShowcaseCard accentRgb="16, 185, 129" className="p-5">
            <SectionLabel>Priority Action Plan</SectionLabel>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {fixes.map((fix) => (
                <GlassInset key={fix.rank} className="p-3.5">
                  <span className="font-display text-2xl font-bold text-accent-tertiary">{fix.rank}</span>
                  <p className="mt-1 text-[11px] font-semibold leading-snug text-white/90">
                    {fix.action}
                  </p>
                  <p className="mt-1.5 text-[10px] font-bold text-emerald-400">{fix.lift}</p>
                </GlassInset>
              ))}
            </div>
          </ShowcaseCard>
        </motion.div>

        <motion.div variants={staggerItem}>
          <ShowcaseCard accentRgb={accentRgb} className="h-full p-5" float>
            <SectionLabel>ICP Simulation</SectionLabel>
            <p className="mt-1 text-[11px] leading-relaxed text-white/45">
              Predicted reactions as personas move through your funnel
            </p>
            <div className="mt-4 space-y-3">
              {personas.map((p) => (
                <GlassInset key={p.name} className="p-3.5">
                  <div className="mb-2 flex items-center gap-2.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, rgba(${accentRgb}, 0.9), rgba(${accentRgb}, 0.55))`,
                        boxShadow: `0 4px 14px rgba(${accentRgb}, 0.35)`,
                      }}
                    >
                      {p.initial}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-white/90">{p.name}</p>
                      <span
                        className={`text-[9px] font-medium ${
                          p.sentiment === "positive"
                            ? "text-emerald-400"
                            : p.sentiment === "negative"
                              ? "text-red-500"
                              : "text-amber-600"
                        }`}
                      >
                        {p.sentiment === "positive"
                          ? "Likely to convert"
                          : p.sentiment === "negative"
                            ? "Likely to bounce"
                            : "Needs stronger proof"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] italic leading-relaxed text-white/50">
                    &ldquo;{p.reaction}&rdquo;
                  </p>
                </GlassInset>
              ))}
            </div>
          </ShowcaseCard>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ── Tab 2: Ad Deconstructor ── */

export function DeconstructorPanel({ accentRgb, accentColor }: PanelProps) {
  const timeline = [
    { time: "0:00", beat: "Hook", detail: "Opens with a relatable frustration — no brand intro" },
    { time: "0:06", beat: "Problem", detail: "Routine fatigue: too many steps, same results" },
    { time: "0:14", beat: "Proof", detail: "14-day before/after with authentic UGC framing" },
    { time: "0:21", beat: "CTA", detail: "Limited shade drop + 30-day guarantee" },
  ];

  const breakdown = [
    { label: "Psychology", value: "Identity aspiration — \"this could be my routine\"" },
    { label: "Structure", value: "Hook → pain → proof → offer in 24 seconds" },
    { label: "Offer", value: "Bundle anchor + scarcity + risk reversal" },
    { label: "Production", value: "Handheld iPhone, natural light, jump cuts" },
  ];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="relative">
      <PanelOrbs accentRgb={accentRgb} />
      <motion.div variants={staggerItem} className="relative z-[1]">
        <SectionLabel>Ad Deconstructor</SectionLabel>
        <PanelTitle>Steal What Works From Winning Ads</PanelTitle>
        <PanelSubtitle>
          Upload a competitor&apos;s ad. Advara verifies it&apos;s a proven winner, breaks down why
          it converts, then adapts the strategy for your brand.
        </PanelSubtitle>
      </motion.div>

      <motion.div variants={staggerItem} className="relative z-[1] mt-8">
        <ShowcaseCard accentRgb={accentRgb} className="overflow-hidden p-0">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.15fr)_auto_minmax(0,1fr)]">
            {/* Step 1 — Upload */}
            <div className="border-b border-white/8 p-5 lg:border-b-0 lg:border-r lg:border-white/8">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: `rgba(${accentRgb}, 0.85)` }}
                >
                  1
                </span>
                <p className="text-[11px] font-bold text-white/90">Upload competitor ad</p>
              </div>
              <div className="landing-workflow-preview rounded-2xl p-3">
                <div
                  className="relative mx-auto aspect-[9/16] max-w-[120px] overflow-hidden rounded-xl"
                  style={{
                    background: `linear-gradient(180deg, rgba(${accentRgb}, 0.12) 0%, rgba(${accentRgb}, 0.32) 100%)`,
                  }}
                >
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-black/40 px-2 py-1">
                    <span className="text-[8px] font-medium text-white/80">0:24</span>
                    <span className="text-[8px] text-white/60">UGC</span>
                  </div>
                  <div className="flex h-full flex-col justify-end p-2">
                    <div className="landing-workflow-inset mb-1 h-1.5 w-4/5 rounded" />
                    <div className="landing-workflow-inset h-1 w-3/5 rounded" />
                  </div>
                </div>
                <GlassInset className="mt-3 px-2.5 py-2">
                  <p className="text-[9px] font-medium text-white/45">Landing page URL</p>
                  <p className="truncate text-[10px] text-white/70">competitor-brand.com/serum</p>
                </GlassInset>
              </div>
              <GlassBadge tone="success" className="mt-3">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Verified winner · 45+ days live
              </GlassBadge>
            </div>

            {/* Arrow 1 */}
            <div className="hidden items-center justify-center px-2 lg:flex">
              <span className="text-lg text-white/25">→</span>
            </div>

            {/* Step 2 — Breakdown */}
            <div className="border-b border-white/8 p-5 lg:border-b-0 lg:border-r lg:border-white/8">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: `rgba(${accentRgb}, 0.85)` }}
                >
                  2
                </span>
                <p className="text-[11px] font-bold text-white/90">See why it works</p>
              </div>
              <p className="mb-3 text-[10px] leading-relaxed text-white/45">
                AI maps the ad beat-by-beat and extracts the strategy behind it.
              </p>
              <div className="space-y-2">
                {timeline.map((item, i) => (
                  <motion.div
                    key={item.beat}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.4 }}
                    className="landing-workflow-inset flex gap-2.5 px-3 py-2"
                  >
                    <div className="shrink-0 text-center">
                      <p className="text-[9px] font-bold tabular-nums text-white/45">{item.time}</p>
                      <p
                        className="mt-0.5 text-[9px] font-bold uppercase"
                        style={{ color: accentColor }}
                      >
                        {item.beat}
                      </p>
                    </div>
                    <p className="text-[10px] leading-snug text-white/70">{item.detail}</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {breakdown.slice(0, 2).map((item) => (
                  <GlassInset key={item.label} className="p-2.5">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-white/40">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[9px] leading-snug text-white/65">{item.value}</p>
                  </GlassInset>
                ))}
              </div>
            </div>

            {/* Arrow 2 */}
            <div className="hidden items-center justify-center px-2 lg:flex">
              <span className="text-lg text-white/25">→</span>
            </div>

            {/* Step 3 — Your version */}
            <div className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: `rgba(${accentRgb}, 0.85)` }}
                >
                  3
                </span>
                <p className="text-[11px] font-bold text-white/90">Adapt for your brand</p>
              </div>
              <p className="mb-3 text-[10px] leading-relaxed text-white/45">
                Same winning structure — rewritten for your product, offer, and voice.
              </p>
              <div
                className="landing-workflow-inset rounded-xl p-4"
                style={{
                  borderColor: `rgba(${accentRgb}, 0.25)`,
                  background: `rgba(${accentRgb}, 0.08)`,
                }}
              >
                <GlassBadge tone="accent" className="mb-2">
                  Your new hook
                </GlassBadge>
                <p className="text-[11px] font-medium leading-relaxed text-white/90">
                  &ldquo;I cut my routine in half — one serum, same glow. Here&apos;s my 14-day
                  switch.&rdquo;
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { role: "Hook", text: "Routine simplification pain" },
                  { role: "Proof", text: "Your brand's before/after angle" },
                  { role: "Offer", text: "Your bundle + guarantee" },
                ].map((beat, i) => (
                  <motion.div
                    key={beat.role}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + 0.08 * i }}
                    className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/5 px-3 py-2"
                  >
                    <span
                      className="mt-0.5 shrink-0 text-[9px] font-bold uppercase"
                      style={{ color: accentColor }}
                    >
                      {beat.role}
                    </span>
                    <span className="text-[10px] text-white/60">{beat.text}</span>
                  </motion.div>
                ))}
              </div>
              <p className="mt-3 text-[9px] italic text-white/35">
                Strategic translation — not a copy of the original
              </p>
            </div>
          </div>

          {/* Mobile flow arrows */}
          <div className="flex justify-center gap-8 border-t border-white/8 py-2 text-white/25 lg:hidden">
            <span className="text-sm">↓</span>
            <span className="text-sm">↓</span>
          </div>
        </ShowcaseCard>
      </motion.div>

      <motion.div variants={staggerItem} className="relative z-[1] mt-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "Evidence verified",
              desc: "Checks Meta Ad Library & public signals before deconstructing",
            },
            {
              title: "Full breakdown",
              desc: "Psychology, structure, offer mechanics, and production notes",
            },
            {
              title: "Brand translation",
              desc: "Hook, outline, and offer adapted to your product — ready to film",
            },
          ].map((item) => (
            <GlassInset key={item.title} className="p-4">
              <p className="text-[11px] font-bold text-white/90">{item.title}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-white/45">{item.desc}</p>
            </GlassInset>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Tab 3: Variant Comparison ── */

export function ComparisonPanel({ accentRgb, accentColor }: PanelProps) {
  const variants = [
    { id: "A", score: 71, hook: 68, retention: 74, cta: 62, winner: false },
    { id: "B", score: 86, hook: 91, retention: 84, cta: 79, winner: true },
    { id: "C", score: 78, hook: 72, retention: 81, cta: 75, winner: false },
  ];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="relative">
      <PanelOrbs accentRgb={accentRgb} />
      <motion.div variants={staggerItem} className="relative z-[1]">
        <SectionLabel>Variant Comparison</SectionLabel>
        <PanelTitle>Know Which Creative To Launch</PanelTitle>
        <PanelSubtitle>
          Upload multiple ad creatives and validate which one will have more success
        </PanelSubtitle>
      </motion.div>

      <div className="relative z-[1] mt-8 grid items-end gap-4 lg:grid-cols-3">
        {variants.map((v, i) => (
          <motion.div
            key={v.id}
            variants={staggerItem}
            className={v.winner ? "lg:-mt-4 lg:scale-[1.03]" : ""}
          >
            <ShowcaseCard
              accentRgb={v.winner ? accentRgb : "55, 41, 111"}
              className={`relative overflow-visible p-5 ${v.winner ? "ring-1 ring-white/20" : ""}`}
              float={v.winner}
            >
              {v.winner && (
                <motion.span
                  initial={{ opacity: 0, y: -10, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.45, type: "spring", stiffness: 400, damping: 22 }}
                  className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full px-3.5 py-1 text-[10px] font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, rgba(${accentRgb}, 1), rgba(${accentRgb}, 0.75))`,
                    boxShadow: `0 6px 20px rgba(${accentRgb}, 0.45)`,
                  }}
                >
                  ★ Winner
                </motion.span>
              )}
              <div className="mb-4 flex items-center justify-between">
                <p className="font-display text-lg font-semibold text-white/90">Variant {v.id}</p>
                <GlassInset className="px-2.5 py-1 text-right">
                  <p className="font-display text-2xl font-bold text-white/90">
                    <CountUp value={v.score} />
                  </p>
                  <p className="text-[9px] font-medium text-white/45">Overall</p>
                </GlassInset>
              </div>
              <div className="space-y-3">
                <MetricBar label="Hook Strength" value={v.hook} color={accentColor} delay={0.1 * i} />
                <MetricBar label="Retention" value={v.retention} color="#0ea5e9" delay={0.15 * i} />
                <MetricBar label="CTA Effectiveness" value={v.cta} color="#8b5cf6" delay={0.2 * i} />
              </div>
              <div className="landing-workflow-preview mt-4 rounded-xl p-3">
                <div
                  className="mb-2 h-16 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, rgba(${accentRgb}, 0.12), rgba(${accentRgb}, 0.28))`,
                  }}
                />
                <div className="space-y-1.5">
                  <div className="landing-workflow-inset h-1.5 w-3/4 rounded" />
                  <div className="landing-workflow-inset h-1.5 w-1/2 rounded" />
                </div>
              </div>
            </ShowcaseCard>
          </motion.div>
        ))}
      </div>

      <motion.div variants={staggerItem} className="relative z-[1] mt-6">
        <div
          className="landing-workflow-editorial rounded-2xl p-5 md:p-6"
          style={{ "--wf-accent-rgb": accentRgb } as CSSProperties}
        >
          <SectionLabel>AI Reasoning</SectionLabel>
          <p className="mt-2 text-sm leading-relaxed text-white/90 md:text-base">
            Variant B wins because it introduces the core pain earlier and creates stronger curiosity.
            Variant A spends 4 seconds on setup before the problem appears. Variant C has strong
            retention but a weak CTA that doesn&apos;t match landing page tone.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Tab 4: Creative Briefs ── */

export function BriefsPanel({ accentRgb }: PanelProps) {
  const sections = [
    { label: "Campaign Goal", value: "Drive cold traffic conversions for Q2 serum launch" },
    { label: "Target Audience", value: "Women 28–42, routine-fatigued, skincare-conscious" },
    { label: "Selected Angle", value: "Routine simplification — one product, same results" },
    {
      label: "Hooks",
      value: [
        "I cut my routine in half — here's what happened",
        "12,000 women switched in 14 days",
        "Stop layering. Start glowing.",
      ],
    },
    {
      label: "Script",
      value:
        "Open on bathroom mirror. Hook: 'I used to use 6 products.' Cut to single serum application. Social proof overlay. CTA: 'Try the 14-day challenge.'",
    },
    {
      label: "Shot List",
      value: [
        "Mirror hook (0:00–0:03)",
        "Product close-up (0:03–0:08)",
        "Before/after split (0:08–0:15)",
        "CTA card (0:15–0:20)",
      ],
    },
    {
      label: "Production Notes",
      value: "iPhone 15 Pro, natural light, no ring light. Authentic UGC — no studio polish.",
    },
    {
      label: "CTA Guidance",
      value: "Soft curiosity CTA on ad → education-led landing hero → hard offer at scroll depth 60%",
    },
  ];

  const toc = sections.map((s) => s.label);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="relative">
      <PanelOrbs accentRgb={accentRgb} />
      <motion.div variants={staggerItem} className="relative z-[1]">
        <SectionLabel>Creative Briefs</SectionLabel>
        <PanelTitle>Generate Production-Ready Briefs</PanelTitle>
        <PanelSubtitle>
          Strategy becomes execution — hooks, scripts, shot lists, and CTA guidance in one document.
        </PanelSubtitle>
      </motion.div>

      <motion.div variants={staggerItem} className="relative z-[1] mt-8">
        <ShowcaseCard accentRgb={accentRgb} className="overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-white/8 bg-white/5 px-5 py-3 backdrop-blur-md">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <p className="text-[11px] font-medium text-white/45">
              creative-brief_serum-launch_v2.pdf
            </p>
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 }}
              className="landing-workflow-badge ml-auto rounded-full px-2.5 py-0.5 text-[9px] font-bold text-emerald-400"
            >
              ✓ Generated
            </motion.span>
          </div>

          <div className="grid md:grid-cols-[180px_1fr]">
            {/* TOC sidebar */}
            <div className="hidden border-r border-white/8 bg-white/5 p-4 backdrop-blur-sm md:block">
              <p className="mb-3 text-[9px] font-bold uppercase tracking-wider text-white/45">
                Contents
              </p>
              <ul className="space-y-1">
                {toc.map((item, i) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="rounded-lg px-2 py-1 text-[10px] text-white/50 transition-colors hover:bg-white/10"
                  >
                    {item}
                  </motion.li>
                ))}
              </ul>
              <GlassInset className="mt-4 p-2">
                <p className="text-[9px] font-bold text-white/45">Generation</p>
                <div className="landing-workflow-metric-track mt-1.5 h-1.5">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </GlassInset>
            </div>

            <div className="p-5 md:p-6">
              {sections.map((section, i) => (
                <motion.div
                  key={section.label}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.07 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className={`py-4 ${i > 0 ? "border-t border-white/8" : ""}`}
                >
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-tertiary">
                    {section.label}
                  </p>
                  {Array.isArray(section.value) ? (
                    <ul className="space-y-1.5">
                      {(section.value as string[]).map((line) => (
                        <li
                          key={line}
                          className="landing-workflow-inset rounded-lg px-3 py-2 text-[12px] text-white/90"
                        >
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[12px] leading-relaxed text-white/90">
                      {section.value as string}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </ShowcaseCard>
      </motion.div>
    </motion.div>
  );
}

/* ── Tab 5: AI Creative Director ── */

const CHAT_MESSAGES = [
  { role: "user" as const, text: "Why did Variant B outperform Variant A?" },
  {
    role: "ai" as const,
    text: "Variant B introduces the problem immediately while Variant A spends too much time on setup. Based on your Funnel Analysis (Message Match: 58), the early pain hook also aligns better with your landing page hero.",
    ref: "Funnel Analysis · Variant Comparison",
  },
  { role: "user" as const, text: "Generate 5 stronger hooks." },
];

const HOOK_SUGGESTIONS = [
  "I deleted 4 products from my routine — kept one",
  "My dermatologist asked what I changed",
  "14 days. One serum. Here's the proof.",
  "Stop buying serums that don't talk to each other",
  "The 60-second routine 12,000 women switched to",
];

const HOOKS_RESPONSE =
  "Here are 5 hooks optimized for your routine-simplification angle and cold traffic ICP:";

export function ChatPanel({ accentRgb, accentColor }: PanelProps) {
  const [typedText, setTypedText] = useState("");
  const [showHooks, setShowHooks] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const startDelay = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        i += 1;
        setTypedText(HOOKS_RESPONSE.slice(0, i));
        if (i >= HOOKS_RESPONSE.length) {
          if (interval) clearInterval(interval);
          setTimeout(() => setShowHooks(true), 300);
        }
      }, 18);
    }, 800);
    return () => {
      clearTimeout(startDelay);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="relative">
      <PanelOrbs accentRgb={accentRgb} />
      <motion.div variants={staggerItem} className="relative z-[1]">
        <SectionLabel>AI Creative Director</SectionLabel>
        <PanelTitle>Your On-Demand Creative Strategist</PanelTitle>
        <PanelSubtitle>
          Context-aware chat that references your analyses, comparisons, and funnel data.
        </PanelSubtitle>
      </motion.div>

      <motion.div variants={staggerItem} className="relative z-[1] mt-8">
        <ShowcaseCard accentRgb={accentRgb} className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-white/8 bg-white/5 px-5 py-3.5 backdrop-blur-md">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur-sm"
              style={{ boxShadow: `0 4px 16px rgba(${accentRgb}, 0.25)` }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3L14 9H20L15 13L17 19L12 15L7 19L9 13L4 9H10L12 3Z"
                  stroke={accentColor}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white/90">Creative Director</p>
              <p className="text-[10px] text-white/45">Serum launch · 3 analyses loaded</p>
            </div>
            <GlassBadge tone="success" className="ml-auto">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Online
            </GlassBadge>
          </div>

          <div className="space-y-4 p-5 md:p-6">
            {CHAT_MESSAGES.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 * i, duration: 0.4 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "border border-white/30 text-white backdrop-blur-md"
                      : "landing-workflow-inset text-white/90"
                  }`}
                  style={
                    msg.role === "user"
                      ? {
                          background: `linear-gradient(135deg, rgba(${accentRgb}, 0.92), rgba(${accentRgb}, 0.72))`,
                          boxShadow: `0 8px 28px rgba(${accentRgb}, 0.3)`,
                        }
                      : undefined
                  }
                >
                  <p className="text-[12px] leading-relaxed md:text-[13px]">{msg.text}</p>
                  {"ref" in msg && msg.ref && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.ref.split(" · ").map((ref) => (
                        <span
                          key={ref}
                          className="landing-workflow-badge rounded-full px-2 py-0.5 text-[9px] font-semibold text-accent-tertiary"
                        >
                          ↗ {ref}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-start"
            >
              <div className="landing-workflow-inset max-w-[92%] rounded-2xl px-4 py-3">
                <p className="text-[12px] leading-relaxed text-white/90 md:text-[13px]">
                  {typedText}
                  {!showHooks && typedText.length < HOOKS_RESPONSE.length && (
                    <span
                      className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse"
                      style={{ background: accentColor }}
                    />
                  )}
                </p>
                {showHooks && (
                  <motion.ul
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                    className="mt-3 space-y-2 border-t border-white/10 pt-3"
                  >
                    {HOOK_SUGGESTIONS.map((hook) => (
                      <motion.li key={hook} variants={staggerItem}>
                        <div className="landing-workflow-card rounded-xl px-3 py-2.5 text-[11px] text-white/90">
                          <div className="relative z-[1] flex items-start gap-2">
                            <span className="font-bold" style={{ color: accentColor }}>
                              →
                            </span>
                            {hook}
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </div>
            </motion.div>
          </div>

          <div className="border-t border-white/8 bg-white/5 px-5 py-3 backdrop-blur-md">
            <div className="landing-workflow-inset flex items-center gap-2 rounded-xl px-4 py-2.5">
              <span className="flex-1 text-[12px] text-white/45">
                Ask about your analyses, hooks, or launch strategy…
              </span>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, rgba(${accentRgb}, 1), rgba(${accentRgb}, 0.8))`,
                  boxShadow: `0 4px 14px rgba(${accentRgb}, 0.35)`,
                }}
                tabIndex={-1}
              >
                Send
              </button>
            </div>
          </div>
        </ShowcaseCard>
      </motion.div>
    </motion.div>
  );
}
