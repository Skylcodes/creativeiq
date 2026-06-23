"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, type CSSProperties, type ReactNode } from "react";
import { AnimatedSection } from "./animated-section";

type StepId = "url" | "creative" | "analyze" | "result";

type Step = {
  id: StepId;
  number: string;
  label: string;
  title: string;
  description: string;
  accentClass: string;
  accentColor: string;
  accentRgb: string;
  isOutcome?: boolean;
};

const steps: Step[] = [
  {
    id: "url",
    number: "01",
    label: "Input",
    title: "Add your landing page URL",
    description:
      "Paste the page your ad sends traffic to. Advara crawls the hero, offer, social proof, and checkout flow.",
    accentClass: "text-accent-secondary",
    accentColor: "#0d9488",
    accentRgb: "13, 148, 136",
  },
  {
    id: "creative",
    number: "02",
    label: "Input",
    title: "Upload your ad creative",
    description:
      "Drop in your video, image, or script. Advara evaluates hooks, messaging, and CTA against that landing page.",
    accentClass: "text-accent",
    accentColor: "#6947ff",
    accentRgb: "105, 71, 255",
  },
  {
    id: "analyze",
    number: "03",
    label: "Analyze",
    title: "AI stress-tests the full funnel",
    description:
      "Multiple agents review creative strength, message match, buyer journey, and conversion leaks — together, not in isolation.",
    accentClass: "text-amber-600",
    accentColor: "#f59e0b",
    accentRgb: "245, 158, 11",
  },
  {
    id: "result",
    number: "04",
    label: "Result",
    title: "Get your funnel intelligence report",
    description:
      "Scores, conversion blockers, ICP reactions, hook rewrites, and a prioritized action plan — before you spend on ads.",
    accentClass: "text-accent",
    accentColor: "#6947ff",
    accentRgb: "105, 71, 255",
    isOutcome: true,
  },
];

function UrlInputPreview() {
  return (
    <div className="space-y-4">
      <div className="landing-preview-frame overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-2.5">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff5f57]/80" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#febc2e]/80" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#28c840]/80" />
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-accent-secondary/25 bg-white/8 px-3 py-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <circle cx="6" cy="6" r="4.5" stroke="#0d9488" strokeWidth="1.2" />
              <path d="M6 3.5V6.5L8 7.5" stroke="#0d9488" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <span className="text-[11px] font-medium text-white/85">glowskin.co/serum</span>
            <span className="ml-auto rounded-md bg-accent-secondary/15 px-1.5 py-0.5 text-[8px] font-bold text-accent-secondary">
              ✓
            </span>
          </div>
        </div>
        <div className="space-y-2.5 p-4">
          <div className="h-3 w-4/5 rounded-md bg-accent-secondary/20" />
          <div className="h-2 w-3/5 rounded-md bg-accent-secondary/12" />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="col-span-2 h-16 rounded-xl border border-white/10 bg-white/6" />
            <div className="h-16 rounded-xl border border-white/10 bg-white/5" />
          </div>
          <div className="flex justify-center pt-1">
            <span className="rounded-lg bg-accent-secondary/15 px-3 py-1 text-[9px] font-semibold text-accent-secondary">
              Shop Now
            </span>
          </div>
        </div>
      </div>

      <div className="landing-glass-inset rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          What we pull from your URL
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {["Hero headline", "Offer & pricing", "Social proof", "Checkout CTA"].map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-secondary/15 text-[10px] text-accent-secondary">
                ✓
              </span>
              <span className="text-[11px] text-white/80">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CreativeInputPreview() {
  return (
    <div className="space-y-4">
      <div className="landing-preview-frame-dark overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
          <span className="text-[10px] font-medium text-white/45">Upload ad creative</span>
          <span className="rounded-md border border-white/10 bg-white/8 px-2 py-0.5 text-[8px] text-white/50">
            MP4 · JPG · Script
          </span>
        </div>

        <div className="border-b border-dashed border-white/15 bg-white/5 p-6">
          <div className="mx-auto flex max-w-[200px] flex-col items-center rounded-2xl border border-accent/25 bg-accent/10 px-4 py-5">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 16V8M9 11L12 8L15 11"
                  stroke="#6947ff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 16V18C4 19.1 4.9 20 6 20H18C19.1 20 20 19.1 20 18V16"
                  stroke="#6947ff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="text-[11px] font-semibold text-white/90">UGC_hook_v3.mp4</p>
            <p className="mt-1 text-[9px] text-white/45">24s · Meta Feed</p>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-full rounded-full bg-accent/70" />
            </div>
            <span className="text-[9px] font-medium text-emerald-400">Uploaded</span>
          </div>
        </div>
      </div>

      <div className="landing-glass-inset rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          Also set your context
        </p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <span className="text-[11px] text-white/55">Platform</span>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold text-accent-tertiary">
              Meta Feed
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <span className="text-[11px] text-white/55">Creative goal</span>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold text-accent-tertiary">
              Drive purchases
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyzePreview() {
  const agents = [
    { name: "Skeptical Buyer", status: "done" as const, detail: "Objections mapped" },
    { name: "DR Critic", status: "done" as const, detail: "Hook & CTA scored" },
    { name: "Landing Page", status: "active" as const, detail: "Message match check" },
    { name: "Funnel Verdict", status: "pending" as const, detail: "Synthesizing report" },
  ];

  return (
    <div className="space-y-4">
      <div className="landing-preview-frame rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
              Analysis in progress
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-white/90">
              Stress-testing your funnel
            </p>
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-500/30 border-t-amber-400"
          />
        </div>

        <div className="landing-glass-inset mb-4 rounded-xl p-3">
          <div className="mb-2 flex justify-between text-[10px]">
            <span className="font-medium text-white/40">Overall progress</span>
            <span className="font-bold tabular-nums text-amber-400">68%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-500"
              initial={{ width: 0 }}
              animate={{ width: "68%" }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.4 }}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                agent.status === "active"
                  ? "border-amber-500/30 bg-amber-500/10"
                  : agent.status === "done"
                    ? "border-white/10 bg-white/5"
                    : "border-white/8 bg-white/4 opacity-60"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  agent.status === "done"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : agent.status === "active"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-white/10 text-white/40"
                }`}
              >
                {agent.status === "done" ? "✓" : agent.status === "active" ? "…" : "·"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-white/85">{agent.name}</p>
                <p className="text-[10px] text-white/45">{agent.detail}</p>
              </div>
              {agent.status === "active" && (
                <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                  Running
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="landing-glass-inset rounded-xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          Connecting ad + landing page
        </p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-medium text-white/80">
            Ad creative
          </div>
          <span className="text-accent-tertiary">↔</span>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-medium text-white/80">
            Landing page
          </div>
        </div>
        <p className="mt-3 text-center text-[10px] leading-relaxed text-white/45">
          Not separate audits — one unified funnel analysis
        </p>
      </div>
    </div>
  );
}

function ResultPreview() {
  const scores = [
    { label: "Conversion", score: 67, color: "#6947ff" },
    { label: "Creative", score: 81, color: "#0ea5e9" },
    { label: "Landing page", score: 58, color: "#8b5cf6" },
    { label: "Message match", score: 52, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-4">
      <div className="landing-preview-frame rounded-2xl p-5">
        <div className="flex items-center gap-5">
          <div className="relative h-[88px] w-[88px] shrink-0">
            <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden>
              <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <motion.circle
                cx="44"
                cy="44"
                r="38"
                fill="none"
                stroke="#6947ff"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="239"
                initial={{ strokeDashoffset: 239 }}
                animate={{ strokeDashoffset: 239 - 239 * 0.65 }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-bold tabular-nums text-white/90">65</span>
              <span className="text-[9px] text-white/40">/100</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-tertiary">
              Funnel verdict
            </p>
            <p className="font-display mt-1 text-xl font-semibold text-white/90">
              Fix before launch
            </p>
            <span className="mt-2 inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
              3 priority actions
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {scores.map((item, i) => (
          <div key={item.label} className="landing-glass-inset rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-white/40">{item.label}</p>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className="font-display text-lg font-semibold tabular-nums text-white/90">
                {item.score}
              </p>
              <div className="mb-1 h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: item.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.score}%` }}
                  transition={{ duration: 0.7, delay: 0.1 * i }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="landing-glass-inset rounded-xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          What you get
        </p>
        <div className="mt-2.5 space-y-2">
          {[
            "Hook rewrites + script suggestions",
            "ICP buyer reactions & drop-off points",
            "Prioritized action plan before ad spend",
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                ✓
              </span>
              <p className="text-xs leading-relaxed text-white/55">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepPreview({ stepId }: { stepId: StepId }) {
  const previews: Record<StepId, ReactNode> = {
    url: <UrlInputPreview />,
    creative: <CreativeInputPreview />,
    analyze: <AnalyzePreview />,
    result: <ResultPreview />,
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepId}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {previews[stepId]}
      </motion.div>
    </AnimatePresence>
  );
}

function StepRail({
  active,
  onSelect,
}: {
  active: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="relative mt-14">
      <div className="relative mb-4 hidden md:block">
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/12">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-accent-secondary via-accent to-accent"
            initial={{ width: "0%" }}
            animate={{ width: `${(active / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {steps.map((step, i) => {
          const isActive = active === i;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelect(i)}
              className={`landing-step-card group relative rounded-[22px] p-4 text-left md:p-5 ${
                isActive ? "landing-step-card-active" : ""
              }`}
              style={
                {
                  "--step-accent-rgb": step.accentRgb,
                } as CSSProperties
              }
            >
              <div className="relative">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                      isActive ? step.accentClass : "text-white/40"
                    }`}
                  >
                    {step.label}
                    {step.isOutcome && (
                      <span className="ml-1.5 rounded-md bg-accent/10 px-1 py-0.5 text-[8px] text-accent">
                        Outcome
                      </span>
                    )}
                  </p>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider backdrop-blur-sm ${
                      isActive ? step.accentClass : "text-white/40"
                    }`}
                    style={
                      isActive
                        ? {
                            borderColor: `rgba(${step.accentRgb}, 0.22)`,
                            background: `rgba(${step.accentRgb}, 0.08)`,
                          }
                        : undefined
                    }
                  >
                    {step.number}
                  </span>
                </div>
                <p
                  className={`font-display text-sm font-semibold leading-snug md:text-[0.9rem] ${
                    isActive ? "text-white/90" : "text-white/55"
                  }`}
                >
                  {step.title}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const activeStep = steps[active];

  return (
    <AnimatedSection
      id="how-it-works"
      className="landing-section-process section-padding relative overflow-x-clip"
    >
      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent-tertiary">
              How it works · 4 steps
            </span>
          </div>
          <h2 className="font-display text-[2rem] font-semibold leading-[1.05] tracking-[-0.055em] text-white md:text-[3.25rem]">
            Two inputs.{" "}
            <span className="text-gradient-accent">One complete funnel verdict.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/55">
            Advara connects the entire funnel — not random pieces — and tells you what will
            actually impact conversions.
          </p>
        </div>

        <StepRail active={active} onSelect={setActive} />

        <motion.div
          layout
          className="landing-process-stage mt-8 overflow-hidden rounded-[30px]"
          style={
            activeStep.isOutcome
              ? ({ "--step-accent-rgb": activeStep.accentRgb } as CSSProperties)
              : undefined
          }
        >
          <div className="relative flex items-center gap-3 border-b border-white/10 bg-white/5 px-5 py-3.5 backdrop-blur-md">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <span className="text-[11px] font-medium text-white/45">
              Advara · Funnel analysis
            </span>
            <span
              className="ml-auto rounded-full border px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-sm"
              style={{
                borderColor: `rgba(${activeStep.accentRgb}, 0.2)`,
                background: `rgba(${activeStep.accentRgb}, 0.1)`,
                color: activeStep.accentColor,
              }}
            >
              {activeStep.isOutcome ? "Final output" : `Step ${activeStep.number}`}
            </span>
          </div>

          <div className="grid md:grid-cols-[1fr_1.15fr]">
            <div className="relative border-b border-white/10 p-6 md:border-b-0 md:border-r md:p-8">
              <div className="relative">
                <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${activeStep.accentClass}`}>
                  {activeStep.number} · {activeStep.label}
                </p>
                <h3 className="font-display mt-2 text-2xl font-semibold tracking-[-0.03em] text-white/90 md:text-[1.65rem]">
                  {activeStep.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-white/55">
                  {activeStep.description}
                </p>

                <div className="landing-glass-inset mt-8 rounded-2xl p-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Pipeline progress
                  </p>
                  <div className="flex items-center gap-1">
                    {steps.map((step, i) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setActive(i)}
                        className="group flex flex-1 flex-col items-center gap-1.5"
                        aria-label={`Go to step ${i + 1}: ${step.title}`}
                      >
                        <div
                          className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                            i <= active ? "" : "bg-white/10"
                          }`}
                          style={
                            i <= active ? { background: step.accentColor } : undefined
                          }
                        />
                        <span
                          className={`text-[8px] font-bold uppercase tracking-wider transition-colors ${
                            i === active ? step.accentClass : "text-white/40"
                          }`}
                        >
                          {step.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative bg-white/5 p-6 backdrop-blur-sm md:p-8">
              <div className="mb-4 flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: activeStep.accentColor }}
                />
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Live preview
                </p>
              </div>
              <div className="landing-glass-inset rounded-[22px] p-5 md:p-6">
                <StepPreview stepId={activeStep.id} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatedSection>
  );
}
