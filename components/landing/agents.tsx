"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  AnimatedSection,
  StaggerContainer,
  staggerItem,
} from "./animated-section";

const agents = [
  {
    id: "01",
    name: "The Skeptical Buyer",
    role: "Customer Objection Engine",
    description:
      "Reads your ad exactly as your ICP would — surfacing every objection, doubt, and reason they'd scroll past without clicking.",
    color: "#ef4444",
    bg: "#fef2f2",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="9" r="4" stroke="#ef4444" strokeWidth="1.5" />
        <path d="M5 20C5 16 8 14 12 14C16 14 19 16 19 20" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 8L18 6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    quote: "This looks like every other skincare ad. Why should I trust this brand?",
  },
  {
    id: "02",
    name: "The Competing Brand",
    role: "Competitive Positioning",
    description:
      "Challenges your positioning against real competitors — identifying where you're undifferentiated or vulnerable to comparison.",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 18L12 6L20 18H4Z" stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 10V14" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    quote: "Competitor X already owns this angle. Your hook doesn't create separation.",
  },
  {
    id: "03",
    name: "The Direct Response Critic",
    role: "Hook & Persuasion Analysis",
    description:
      "Evaluates attention capture, hook strength, persuasion architecture, and CTA effectiveness with direct-response rigor.",
    color: "#f59e0b",
    bg: "#fffbeb",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 12H20M12 4V20" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="1.5" />
      </svg>
    ),
    quote: "Hook holds for 1.2 seconds. CTA arrives too late — you've lost the scroll-stop.",
  },
  {
    id: "04",
    name: "The Contrarian Strategist",
    role: "Alternative Angle Discovery",
    description:
      "Identifies winning angles your competitors are missing — creative territories you haven't explored but should.",
    color: "#0d9488",
    bg: "#ecfdf5",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3L14 9H20L15 13L17 19L12 15L7 19L9 13L4 9H10L12 3Z" stroke="#0d9488" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    quote: "Nobody in your category is leading with the 'routine simplification' angle. High potential.",
  },
  {
    id: "05",
    name: "The Verdict Agent",
    role: "Final Launch Recommendation",
    description:
      "Synthesizes all agent findings into a single, actionable verdict — launch, revise, or kill — with confidence scoring.",
    color: "#6e3aff",
    bg: "#ede9fe",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 2L14.5 9H22L16 13.5L18 21L12 16.5L6 21L8 13.5L2 9H9.5L12 2Z" fill="#6e3aff" fillOpacity="0.15" stroke="#6e3aff" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    quote: "Revise before launch. Fix landing page CTA mismatch — then retest. Projected lift: +23% CVR.",
  },
];

export function Agents() {
  const [activeAgent, setActiveAgent] = useState(0);
  const agent = agents[activeAgent];

  return (
    <AnimatedSection id="agents" className="section-padding relative overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 mesh-gradient opacity-50" />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Multi-agent intelligence
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-text-primary md:text-5xl">
            Five agents. One coordinated verdict.
          </h2>
          <p className="mt-5 text-lg text-text-secondary">
            Not a single AI opinion — a structured debate that stress-tests your
            creative from every angle that matters before launch.
          </p>
        </div>

        {/* Debate visualization */}
        <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <StaggerContainer className="space-y-3">
            {agents.map((a, i) => (
              <motion.button
                key={a.id}
                variants={staggerItem}
                type="button"
                onClick={() => setActiveAgent(i)}
                className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-300 ${
                  activeAgent === i
                    ? "border-accent/20 bg-white shadow-elevated"
                    : "border-transparent bg-white/60 hover:bg-white hover:shadow-soft"
                }`}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: a.bg }}
                >
                  {a.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Agent {a.id}
                  </p>
                  <p className="truncate font-display text-sm font-semibold leading-snug text-text-primary">
                    {a.name}
                  </p>
                </div>
                {activeAgent === i && (
                  <motion.div
                    layoutId="agent-indicator"
                    className="ml-auto h-2 w-2 shrink-0 rounded-full bg-accent"
                  />
                )}
              </motion.button>
            ))}
          </StaggerContainer>

          {/* Active agent detail + debate feed */}
          <div className="relative">
            <div className="absolute -inset-3 rounded-3xl bg-linear-to-br from-accent/8 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white shadow-elevated">
              <AnimatePresence mode="wait">
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="p-8"
                >
                  <div className="mb-6 flex items-start gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: agent.bg }}
                    >
                      {agent.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Agent {agent.id} — {agent.role}
                      </p>
                      <h3 className="font-display text-2xl font-semibold text-text-primary">
                        {agent.name}
                      </h3>
                    </div>
                  </div>

                  <p className="text-base leading-relaxed text-text-secondary">
                    {agent.description}
                  </p>

                  {/* Simulated debate bubble */}
                  <div className="mt-8 rounded-xl border border-border bg-surface-muted/50 p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: agent.color }}
                      />
                      <span className="text-xs font-medium text-text-muted">
                        Agent output
                      </span>
                    </div>
                    <p className="text-sm italic leading-relaxed text-text-primary">
                      &ldquo;{agent.quote}&rdquo;
                    </p>
                  </div>

                  {/* Mini debate thread */}
                  <div className="mt-6 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Debate in progress
                    </p>
                    {agents.slice(0, activeAgent + 1).map((a, i) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div
                          className="mt-0.5 h-6 w-6 shrink-0 rounded-full"
                          style={{ backgroundColor: a.color, opacity: 0.8 }}
                        />
                        <p className="text-xs leading-relaxed text-text-secondary">
                          <span className="font-semibold text-text-primary">{a.name}:</span>{" "}
                          {a.quote.slice(0, 60)}…
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
