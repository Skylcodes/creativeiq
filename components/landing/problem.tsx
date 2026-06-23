"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import {
  AnimatedSection,
  StaggerContainer,
  staggerItem,
} from "./animated-section";

const painPoints = [
  {
    num: "01",
    title: "Winning Clicks ≠ Winning Sales",
    accent: "#6947ff",
    accentRgb: "105, 71, 255",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path d="M4 16L9 6L13 12L18 4" stroke="#6947ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="18" cy="4" r="2" fill="#6947ff" fillOpacity="0.25" stroke="#6947ff" strokeWidth="1.2" />
      </svg>
    ),
    blocks: [
      { type: "text" as const, content: "An ad can grab attention." },
      { type: "text" as const, content: "That doesn't mean it creates buyers." },
    ],
    visual: (
      <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
        {[
          { label: "Click-through", value: 94, color: "#6947ff" },
          { label: "Buyer conversion", value: 12, color: "#ef4444" },
        ].map((m) => (
          <div key={m.label}>
            <div className="mb-1.5 flex justify-between text-[11px]">
              <span className="font-medium text-white/55">{m.label}</span>
              <span className="font-bold tabular-nums text-white/90">{m.value}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: m.color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${m.value}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: "02",
    title: "The Funnel Breaks In Silence",
    accent: "#f59e0b",
    accentRgb: "245, 158, 11",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path d="M11 4V11M11 15H11.01" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M11 2C6 2 2 6 2 11C2 16 6 20 11 20C16 20 20 16 20 11" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="3 3" />
      </svg>
    ),
    blocks: [
      { type: "text" as const, content: "Nobody gets an alert saying:" },
      {
        type: "quote" as const,
        content: "Your landing page just killed this campaign.",
      },
      { type: "text" as const, content: "You discover it after the budget is gone." },
    ],
    visual: (
      <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/8 px-4 py-5 backdrop-blur-md">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/25 bg-white/8">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M9 2L10.5 6.5H15L11.5 9.5L13 14L9 11.5L5 14L6.5 9.5L2 6.5H6.5L9 2Z" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M9 7V10" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">No alert sent</span>
          <span className="text-[11px] text-amber-200/60">Misalignment detected: never</span>
        </div>
      </div>
    ),
  },
  {
    num: "03",
    title: "The Missing Conversation",
    accent: "#3b2b9f",
    accentRgb: "59, 43, 159",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="2" y="5" width="8" height="12" rx="2" stroke="#3b2b9f" strokeWidth="1.4" />
        <rect x="12" y="5" width="8" height="12" rx="2" stroke="#3b2b9f" strokeWidth="1.4" />
        <path d="M10 11H12" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 2" />
      </svg>
    ),
    blocks: [
      { type: "text" as const, content: "Creative tools analyze ads." },
      { type: "text" as const, content: "Landing page tools analyze pages." },
      { type: "text" as const, content: "The gap between them is where revenue disappears." },
    ],
    visual: (
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
        <div className="rounded-xl border border-accent/20 bg-accent/10 px-2 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-accent-tertiary">Ad tools</p>
          <p className="mt-0.5 text-[10px] text-white/45">Hook · CTA</p>
        </div>
        <div className="flex flex-col items-center gap-0.5 px-1">
          <svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden>
            <path d="M2 6H18M14 2L18 6L14 10" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2" />
          </svg>
          <span className="text-[8px] font-bold uppercase text-red-500">Gap</span>
        </div>
        <div className="rounded-xl border border-accent-secondary/20 bg-accent-secondary/10 px-2 py-2.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-accent-secondary">LP tools</p>
          <p className="mt-0.5 text-[10px] text-white/45">Hero · Offer</p>
        </div>
      </div>
    ),
  },
];

const fragmentedChecks = [
  { label: "Hook strength", status: "reviewed" },
  { label: "Visual appeal", status: "reviewed" },
  { label: "Landing page", status: "missing" },
  { label: "Ad-to-page alignment", status: "missing" },
] as const;

const funnelStages = [
  { label: "Ad hook", score: 82, barColor: "#6947ff" },
  { label: "Click intent", score: 74, barColor: "#8b5cf6" },
  { label: "Landing match", score: 58, barColor: "#f59e0b" },
  { label: "Offer clarity", score: 71, barColor: "#0d9488" },
  { label: "Verdict", score: null, barColor: "" },
];

const launchSteps = [
  {
    step: "Create",
    detail: "Gut feel",
    status: "neutral" as const,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M3 14L6 4L9 10L12 7L15 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    step: "Launch",
    detail: "$2k/day",
    status: "warn" as const,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M9 3V12M9 12L6 9M9 12L12 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 15H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    step: "Wait",
    detail: "3–5 days",
    status: "warn" as const,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M9 5.5V9L11.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    step: "Analyze",
    detail: "Too late",
    status: "fail" as const,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <rect x="3" y="4" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M6 8H12M6 11H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    step: "Repeat",
    detail: "Burn budget",
    status: "fail" as const,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M14 6C13 3.5 11 2 9 2C5.5 2 2.5 5 2.5 8.5C2.5 12 5 14.5 8.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M14 2V6H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const stepStatusStyles = {
  neutral: {
    ring: "border-zinc-500/40",
    node: "bg-linear-to-br from-zinc-800 to-zinc-900 text-zinc-300",
    card: "border-zinc-700/40 bg-zinc-900/60",
    glow: "",
    detail: "text-zinc-400",
    badge: "bg-zinc-500/20 text-zinc-300",
    badgeLabel: "Guesswork",
    track: "#71717a",
  },
  warn: {
    ring: "border-amber-500/60",
    node: "bg-linear-to-br from-amber-500/25 to-amber-600/10 text-amber-300",
    card: "border-amber-500/25 bg-amber-500/8",
    glow: "shadow-[0_0_32px_rgba(245,158,11,0.22)]",
    detail: "text-amber-300/90",
    badge: "bg-amber-500/20 text-amber-300",
    badgeLabel: "Spending",
    track: "#f59e0b",
  },
  fail: {
    ring: "border-red-500/60",
    node: "bg-linear-to-br from-red-500/25 to-red-600/10 text-red-300",
    card: "border-red-500/30 bg-red-500/10",
    glow: "shadow-[0_0_40px_rgba(239,68,68,0.3)]",
    detail: "text-red-300",
    badge: "bg-red-500/25 text-red-300",
    badgeLabel: "Loss",
    track: "#ef4444",
  },
};

function LaunchCycleDiagram() {
  return (
    <div className="relative overflow-hidden border-t border-white/8 bg-[#08060f] px-5 py-8 md:px-8 md:py-10">
      {/* Layered ambient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_110%,rgba(239,68,68,0.18)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_0%_0%,rgba(245,158,11,0.06)_0%,transparent_50%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative">
        {/* Header row */}
        <div className="mb-10">
          <p className="font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
            The traditional launch cycle
          </p>
          <p className="mt-1 max-w-md text-sm text-white/45">
            No validation gate — just spend, wait, react, and repeat until budget runs dry.
          </p>
        </div>

        {/* Desktop / tablet pipeline */}
        <div className="hidden md:block">
          <div className="relative px-2">
            {/* Track + loop SVG — connects all step icons */}
            <svg
              className="pointer-events-none absolute inset-x-4 top-[52px] h-[100px] w-[calc(100%-2rem)]"
              viewBox="0 0 1000 100"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <linearGradient id="launch-track" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#52525b" />
                  <stop offset="30%" stopColor="#f59e0b" />
                  <stop offset="65%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Forward path through all five steps */}
              <motion.path
                d="M 50 20 H 200 L 250 20 H 400 L 450 20 H 600 L 650 20 H 800 L 850 20 H 920"
                stroke="url(#launch-track)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
                initial={{ pathLength: 0, opacity: 0.3 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
              />

              {/* Loop back: Repeat → Create */}
              <motion.path
                d="M 920 20 C 960 20 980 50 500 72 C 20 94 20 50 50 20"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="8 6"
                strokeOpacity="0.55"
                fill="none"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              />

              {/* Arrow on loop */}
              <motion.path
                d="M 120 68 L 108 72 L 120 76"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.7"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.2 }}
              />
            </svg>

            <div className="relative grid grid-cols-5 gap-3 lg:gap-5">
              {launchSteps.map((item, i) => {
                const styles = stepStatusStyles[item.status];
                return (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.08 + i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="group flex flex-col items-center"
                  >
                    {/* Node */}
                    <div className="relative mb-4">
                      <div
                        className={`absolute -inset-1 rounded-[20px] opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100 ${item.status === "fail" ? "bg-red-500/30" : item.status === "warn" ? "bg-amber-500/25" : "bg-zinc-500/20"}`}
                      />
                      <div
                        className={`relative flex h-[72px] w-[72px] items-center justify-center rounded-[18px] border-2 ${styles.ring} ${styles.node} ${styles.glow}`}
                      >
                        {item.icon}
                        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#120d1f] font-mono text-[10px] font-bold text-white/80 ring-2 ring-white/10">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                    </div>

                    {/* Card */}
                    <div
                      className={`w-full rounded-2xl border px-3 py-3 text-center backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-0.5 ${styles.card}`}
                    >
                      <p className="font-display text-sm font-semibold text-white">{item.step}</p>
                      <p className={`mt-0.5 text-[11px] font-medium ${styles.detail}`}>
                        {item.detail}
                      </p>
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${styles.badge}`}
                      >
                        {styles.badgeLabel}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile vertical flow */}
        <div className="space-y-3 md:hidden">
          {launchSteps.map((item, i) => {
            const styles = stepStatusStyles[item.status];
            const isLast = i === launchSteps.length - 1;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative"
              >
                {!isLast && (
                  <div
                    className="absolute left-[35px] top-[76px] h-[calc(100%-12px)] w-0.5 rounded-full"
                    style={{
                      background: `linear-gradient(180deg, ${styles.track} 0%, ${stepStatusStyles[launchSteps[i + 1].status].track} 100%)`,
                    }}
                  />
                )}
                <div
                  className={`flex items-center gap-4 rounded-2xl border p-4 backdrop-blur-sm ${styles.card}`}
                >
                  <div
                    className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 ${styles.ring} ${styles.node} ${styles.glow}`}
                  >
                    {item.icon}
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#120d1f] font-mono text-[9px] font-bold text-white/80 ring-1 ring-white/10">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-semibold text-white">{item.step}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${styles.badge}`}>
                        {styles.badgeLabel}
                      </span>
                    </div>
                    <p className={`mt-0.5 text-sm font-medium ${styles.detail}`}>{item.detail}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}

        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: "reviewed" | "missing" }) {
  if (status === "reviewed") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
          <path
            d="M1.5 4L3 5.5L6.5 2"
            stroke="#34d399"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-amber-400/50 bg-amber-500/10">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
    </span>
  );
}

function PainPointCard({
  point,
}: {
  point: (typeof painPoints)[number];
}) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="landing-pain-card group relative flex h-full flex-col overflow-hidden rounded-[28px] p-6 md:p-7"
      style={
        {
          "--pain-accent": point.accent,
          "--pain-accent-rgb": point.accentRgb,
        } as CSSProperties
      }
    >
      {/* Accent orb */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-50"
        style={{ background: `rgba(${point.accentRgb}, 0.35)` }}
      />

      {/* Watermark number */}
      <span
        className="pointer-events-none absolute -bottom-2 right-3 font-display text-[5.5rem] font-bold leading-none opacity-[0.05]"
        style={{ color: point.accent }}
        aria-hidden
      >
        {point.num}
      </span>

      <div className="relative flex flex-1 flex-col">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 backdrop-blur-md"
            style={{ background: `rgba(${point.accentRgb}, 0.1)` }}
          >
            {point.icon}
          </div>
          <span
            className="rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider backdrop-blur-sm"
            style={{
              borderColor: `rgba(${point.accentRgb}, 0.2)`,
              background: `rgba(${point.accentRgb}, 0.08)`,
              color: point.accent,
            }}
          >
            {point.num}
          </span>
        </div>

        <h3 className="font-display text-xl font-semibold leading-snug tracking-[-0.03em] text-white/90 md:text-[1.35rem]">
          {point.title}
        </h3>

        <div className="mt-3 flex flex-1 flex-col gap-2">
          {point.blocks.map((block) =>
            block.type === "quote" ? (
              <div
                key={block.content}
                className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 backdrop-blur-md"
              >
                <p className="text-sm italic leading-relaxed text-amber-100/90">
                  &ldquo;{block.content}&rdquo;
                </p>
              </div>
            ) : (
              <p key={block.content} className="text-sm leading-relaxed text-white/55">
                {block.content}
              </p>
            ),
          )}
        </div>

        {point.visual}

        {/* Bottom accent shimmer */}
        <div
          className="mt-6 h-px w-full opacity-40"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(${point.accentRgb}, 0.6), transparent)`,
          }}
        />
      </div>
    </motion.div>
  );
}

function FunnelGapVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="landing-problem-gap-shell mt-14 overflow-hidden rounded-[28px]"
    >
      <div className="relative grid md:grid-cols-2">
        {/* Fragmented — warm red diagnostic */}
        <div className="landing-problem-split-negative p-6 md:p-8">
          <div className="relative z-[1]">
            <div className="mb-6 flex items-center gap-3">
              <span className="landing-problem-panel-icon flex h-10 w-10 items-center justify-center rounded-xl text-red-500 shadow-[0_8px_28px_rgba(239,68,68,0.14)]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M4 8H12M8 4V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500/80">
                  Typical workflow
                </p>
                <p className="font-display text-sm font-semibold text-white/90">
                  Fragmented analysis
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {fragmentedChecks.map((item) => (
                <div
                  key={item.label}
                  className={`landing-problem-check-row flex items-center justify-between rounded-xl px-3.5 py-2.5 ${
                    item.status === "missing"
                      ? "landing-problem-check-row-missing"
                      : "landing-problem-check-row-reviewed"
                  }`}
                >
                  <span
                    className={`relative z-[1] text-sm ${item.status === "missing" ? "font-medium text-amber-300" : "text-white/85"}`}
                  >
                    {item.label}
                  </span>
                  <span className="relative z-[1]">
                    <StatusDot status={item.status} />
                  </span>
                </div>
              ))}
            </div>

            <div className="landing-problem-callout-negative relative z-[1] mt-6 rounded-2xl px-4 py-3">
              <p className="text-xs leading-relaxed text-red-300/75">
                Ad scores well. Landing page never evaluated. Misalignment found only after spend.
              </p>
            </div>
          </div>
        </div>

        {/* Connected — violet intelligence */}
        <div className="landing-problem-split-positive p-6 md:p-8">
          <div className="relative z-[1]">
            <div className="mb-6 flex items-center gap-3">
              <span className="landing-problem-panel-icon flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent shadow-[0_8px_28px_rgba(105,71,255,0.16)]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-tertiary">
                  Advara
                </p>
                <p className="font-display text-sm font-semibold text-white/90">
                  Full funnel connected
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {funnelStages.map((stage, i) => (
                <div key={stage.label} className="landing-problem-stage-row rounded-xl px-3.5 py-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm text-white/85">{stage.label}</span>
                    {stage.score !== null ? (
                      <span className="rounded-full border border-accent/25 bg-accent/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-accent-tertiary">
                        {stage.score}%
                      </span>
                    ) : (
                      <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white shadow-[0_4px_14px_rgba(105,71,255,0.28)]">
                        Verdict
                      </span>
                    )}
                  </div>
                  {stage.score !== null ? (
                    <div className="landing-problem-metric-track h-2">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${stage.barColor}bb, ${stage.barColor})`,
                          boxShadow: `0 0 10px ${stage.barColor}44`,
                        }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${stage.score}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  ) : (
                    <div className="landing-problem-callout-positive rounded-xl px-3.5 py-2.5">
                      <p className="text-xs font-semibold text-amber-200">Fix before launch</p>
                      <p className="mt-0.5 text-[11px] text-amber-300/70">
                        Landing CTA misaligns with ad hook
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <LaunchCycleDiagram />
    </motion.div>
  );
}

export function Problem() {
  return (
    <AnimatedSection
      id="problem"
      className="landing-section-problem section-padding relative overflow-x-clip"
    >
      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300/90">
              The cost of guessing
            </span>
          </div>
          <h2 className="font-display text-[2rem] font-semibold leading-[1.05] tracking-[-0.055em] text-white md:text-[3.25rem]">
            You don&apos;t need more creative tests.{" "}
            <span className="text-red-400">You need fewer expensive mistakes.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/55">
            Analyze the entire journey from ad click to purchase and uncover what will kill
            conversions before launch.
          </p>
        </div>

        <FunnelGapVisual />

        {/* Pain point glass cards */}
        <StaggerContainer className="mt-14 grid gap-5 md:grid-cols-3 md:gap-6">
          {painPoints.map((point) => (
            <PainPointCard key={point.title} point={point} />
          ))}
        </StaggerContainer>
      </div>
    </AnimatedSection>
  );
}
