"use client";

import { motion, useReducedMotion } from "framer-motion";

function AgentBubble({
  label,
  color,
  delay,
  x,
  y,
}: {
  label: string;
  color: string;
  delay: number;
  x: string;
  y: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="absolute z-10"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={reduced ? {} : { y: [0, -6, 0] }}
        transition={{ duration: 4 + delay, repeat: Infinity, ease: "easeInOut" }}
        className="glass flex items-center gap-2 rounded-full px-3 py-1.5 shadow-soft"
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="whitespace-nowrap text-[10px] font-medium text-text-primary md:text-xs">
          {label}
        </span>
      </motion.div>
    </motion.div>
  );
}

function ProductMockup() {
  const reduced = useReducedMotion();

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* Glow backdrop */}
      <div className="absolute -inset-8 rounded-3xl bg-linear-to-br from-accent/10 via-transparent to-accent-secondary/10 blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-[0_32px_80px_rgba(110,58,255,0.12),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="mx-auto flex items-center gap-2 rounded-md bg-surface-muted px-3 py-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M6 1L10 6L6 11L2 6L6 1Z" stroke="#6e3aff" strokeWidth="1" fill="none" />
            </svg>
            <span className="text-[11px] text-text-muted">app.creativeiq.io/analysis</span>
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-[1fr_1.2fr_1fr]">
          {/* Input panel */}
          <div className="border-b border-border p-4 md:border-b-0 md:border-r">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Inputs
            </p>
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-surface-muted/50 p-3">
                <p className="mb-1 text-[10px] text-text-muted">Brand URL</p>
                <p className="truncate text-xs font-medium text-text-primary">
                  glowskin.co
                </p>
              </div>
              <div className="relative overflow-hidden rounded-lg border border-accent/20 bg-accent-light/30 p-3">
                <p className="mb-2 text-[10px] text-text-muted">Ad Creative</p>
                <div className="flex aspect-video items-center justify-center rounded-md bg-linear-to-br from-[#1a1a2e] to-[#16213e]">
                  <div className="text-center">
                    <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="white" aria-hidden>
                        <path d="M3 2L11 7L3 12V2Z" />
                      </svg>
                    </div>
                    <p className="text-[9px] text-white/70">UGC_hook_v3.mp4</p>
                  </div>
                </div>
                {!reduced && (
                  <motion.div
                    className="absolute inset-x-3 h-px bg-accent/60"
                    animate={{ top: ["10%", "90%", "10%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Agent debate center */}
          <div className="relative min-h-[220px] border-b border-border p-4 md:border-b-0 md:border-r">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Multi-Agent Analysis
            </p>
            <div className="relative h-[180px]">
              <AgentBubble label="Skeptical Buyer" color="#ef4444" delay={0.5} x="5%" y="10%" />
              <AgentBubble label="DR Critic" color="#f59e0b" delay={0.7} x="55%" y="5%" />
              <AgentBubble label="Competitor" color="#8b5cf6" delay={0.9} x="10%" y="55%" />
              <AgentBubble label="Contrarian" color="#0d9488" delay={1.1} x="50%" y="50%" />

              {/* Connection lines */}
              <svg className="absolute inset-0 h-full w-full" aria-hidden>
                <motion.line
                  x1="50%" y1="50%" x2="20%" y2="20%"
                  stroke="rgba(110,58,255,0.15)" strokeWidth="1"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ delay: 1.2, duration: 0.8 }}
                />
                <motion.line
                  x1="50%" y1="50%" x2="70%" y2="15%"
                  stroke="rgba(110,58,255,0.15)" strokeWidth="1"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ delay: 1.3, duration: 0.8 }}
                />
                <motion.line
                  x1="50%" y1="50%" x2="25%" y2="65%"
                  stroke="rgba(110,58,255,0.15)" strokeWidth="1"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ delay: 1.4, duration: 0.8 }}
                />
                <motion.line
                  x1="50%" y1="50%" x2="65%" y2="60%"
                  stroke="rgba(110,58,255,0.15)" strokeWidth="1"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ delay: 1.5, duration: 0.8 }}
                />
              </svg>

              {/* Verdict center */}
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.6, type: "spring", stiffness: 200 }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-accent to-[#9333ea] shadow-[0_8px_24px_rgba(110,58,255,0.4)]">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
                    <path d="M11 2L13.5 8.5L20 9L15 13.5L16.5 20L11 16.5L5.5 20L7 13.5L2 9L8.5 8.5L11 2Z" fill="white" />
                  </svg>
                </div>
                <p className="mt-1.5 text-center text-[9px] font-semibold text-accent">
                  Verdict Agent
                </p>
              </motion.div>
            </div>
          </div>

          {/* Report panel */}
          <div className="p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Funnel Report
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-lg bg-surface-muted/60 px-3 py-2">
                <span className="text-[11px] text-text-secondary">Conversion Score</span>
                <span className="font-display text-lg font-bold text-accent">72<span className="text-xs text-text-muted">/100</span></span>
              </div>
              {[
                { label: "Hook Strength", value: 68, color: "#f59e0b" },
                { label: "Landing Alignment", value: 81, color: "#0d9488" },
                { label: "ICP Match", value: 74, color: "#6e3aff" },
              ].map((metric, i) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.8 + i * 0.15 }}
                >
                  <div className="mb-1 flex justify-between text-[10px]">
                    <span className="text-text-secondary">{metric.label}</span>
                    <span className="font-medium text-text-primary">{metric.value}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: metric.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${metric.value}%` }}
                      transition={{ delay: 2 + i * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.4 }}
                className="mt-2 rounded-lg border border-accent/15 bg-accent-light/40 px-3 py-2"
              >
                <p className="text-[10px] font-semibold text-accent">Priority Action</p>
                <p className="text-[10px] leading-relaxed text-text-secondary">
                  Rewrite CTA — &ldquo;Shop Now&rdquo; misaligns with curiosity hook
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-x-clip pt-28 pb-16 md:pt-36 md:pb-24">
      {/* Mesh background */}
      <div className="pointer-events-none absolute inset-0 mesh-gradient" />
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-60" />

      {/* Floating orbs */}
      {!reduced && (
        <>
          <motion.div
            className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-accent/8 blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-accent-secondary/8 blur-3xl"
            animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        {/* Social proof pill */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex justify-center"
        >
          <div className="glass inline-flex items-center gap-3 rounded-full px-4 py-2 shadow-soft">
            <div className="flex -space-x-2">
              {["#6e3aff", "#0d9488", "#f59e0b", "#ef4444"].map((c, i) => (
                <div
                  key={c}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white"
                  style={{ backgroundColor: c, zIndex: 4 - i }}
                >
                  {["MK", "JR", "SL", "AP"][i]}
                </div>
              ))}
            </div>
            <p className="text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">240+ DTC brands</span>{" "}
              stress-test before launch
            </p>
          </div>
        </motion.div>

        {/* Headline */}
        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-[2.5rem] font-semibold tracking-tight text-text-primary md:text-[3.75rem]"
          >
            Stop guessing which ads will work{" "}
            <span className="text-gradient-accent">before you spend</span>{" "}
            launching them
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl"
          >
            CreativeIQ analyzes your ad creative and landing page as one connected
            funnel — so you validate conversion potential before burning budget on
            Meta and TikTok.
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
            <a href="#how-it-works" className="btn-secondary w-full sm:w-auto">
              See how it works
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 text-xs text-text-muted"
          >
            No credit card · Full report in under 5 minutes
          </motion.p>
        </div>

        {/* Product mockup */}
        <div className="mt-16 md:mt-20">
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}
