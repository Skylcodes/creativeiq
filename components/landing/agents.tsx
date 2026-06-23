"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { AnimatedSection } from "./animated-section";

const agents = [
  {
    id: "01",
    name: "The Ideal Customer",
    role: "Customer Objection Engine",
    shortName: "Ideal Customer",
    description:
      "Reads your ad exactly as your ICP would — surfacing every objection, doubt, and reason they'd scroll past without clicking.",
    color: "#ef4444",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 20C5 16 8 14 12 14C16 14 19 16 19 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    quote:
      "This looks like every other skincare ad I have seen on TikTok. Why would I trust this brand?",
  },
  {
    id: "02",
    name: "The Competing Brand",
    role: "Competitive Positioning",
    shortName: "Rival",
    description:
      "Challenges your positioning against real competitors — identifying where you're undifferentiated or vulnerable to comparison.",
    color: "#8b5cf6",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 18L12 6L20 18H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    quote:
      "Competitor X already owns this angle. Your hook doesn't create separation.",
  },
  {
    id: "03",
    name: "The Direct Response Critic",
    role: "Hook & Persuasion Analysis",
    shortName: "DR Critic",
    description:
      "Evaluates attention capture, hook strength, persuasion architecture, and CTA effectiveness with direct-response rigor.",
    color: "#f59e0b",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 12H20M12 4V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    quote:
      "Hook holds for 1.2 seconds. CTA arrives too late — you've lost the scroll-stop.",
  },
  {
    id: "04",
    name: "The Competitor Strategist",
    role: "Alternative Angle Discovery",
    shortName: "Competitor Strategist",
    description:
      "Identifies winning angles your competitors are missing — creative territories you haven't explored but should.",
    color: "#0d9488",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3L14 9H20L15 13L17 19L12 15L7 19L9 13L4 9H10L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    quote:
      "Nobody in your category is leading with the 'routine simplification' angle. High potential.",
  },
  {
    id: "05",
    name: "The Landing Page Agent",
    role: "Landing Page Analysis",
    shortName: "Landing Page",
    description:
      "Audits your product landing page — hero, offer clarity, social proof, and checkout flow — as a standalone conversion asset.",
    color: "#0ea5e9",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 8.5H21" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
        <rect x="5.5" y="11" width="13" height="2.5" rx="0.8" fill="currentColor" fillOpacity="0.2" />
        <rect x="5.5" y="15" width="8" height="1.5" rx="0.75" fill="currentColor" fillOpacity="0.15" />
        <rect x="15" y="14.5" width="3.5" height="2.5" rx="1" fill="currentColor" fillOpacity="0.45" />
      </svg>
    ),
    quote:
      "Hero headline doesn't match the ad promise. Offer is buried — social proof appears too late for cold traffic.",
  },
  {
    id: "06",
    name: "The Funnel Match Agent",
    role: "Ad-to-Page Alignment",
    shortName: "Funnel Match",
    description:
      "Compares ad creative against the landing page to determine if messaging, tone, offer, and CTA form one coherent path to purchase.",
    color: "#6366f1",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2" y="6" width="8" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="6" width="8" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12.5 10.5L14 12L12.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11.5 10.5L10 12L11.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </svg>
    ),
    quote:
      "Ad hook is curiosity-led. Landing page CTA is hard-sell 'Buy Now'. Message match is weak — align tone before launch.",
  },
  {
    id: "07",
    name: "The Verdict Agent",
    role: "Final Launch Recommendation",
    shortName: "Verdict",
    description:
      "Synthesizes all agent findings into a single, actionable verdict — launch, revise, or kill — with confidence scoring.",
    color: "#6947ff",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 2L14.5 9H22L16 13.5L18 21L12 16.5L6 21L8 13.5L2 9H9.5L12 2Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    quote:
      "Revise before launch. Fix landing page CTA mismatch — then retest.",
  },
];

const AGENT_COUNT = agents.length;

export function Agents() {
  const [activeAgent, setActiveAgent] = useState(0);
  const agent = agents[activeAgent];

  return (
    <AnimatedSection
      id="agents"
      className="landing-section-agents section-padding relative overflow-x-clip"
    >
      {/* Grid overlay for war room feel */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        {/* Dark section header — left aligned */}
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
              Multi-Agentic Validation
            </span>
          </div>
          <h2 className="font-display text-[2rem] font-semibold leading-[1.05] tracking-[-0.055em] text-white md:text-[3.25rem]">
            Multiple agents.{" "}
            <span className="text-accent-tertiary">One coordinated verdict.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-white/60">
            Not a single AI opinion — a structured debate that stress-tests your creative from
            every angle that matters before launch.
          </p>
        </div>

        {/* Horizontal agent constellation — single centered row */}
        <div className="mt-12 flex justify-center overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex flex-nowrap items-stretch gap-1.5 sm:gap-2">
            {agents.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setActiveAgent(i)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1.5 transition-all duration-300 sm:px-2.5 sm:py-2 md:gap-2 md:px-3 ${
                  activeAgent === i
                    ? "border-white/20 bg-white/10"
                    : "border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/8"
                }`}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full sm:h-7 sm:w-7 [&>svg]:h-[15px] [&>svg]:w-[15px] sm:[&>svg]:h-[17px] sm:[&>svg]:w-[17px]"
                  style={{ backgroundColor: `${a.color}33`, color: a.color }}
                >
                  {a.icon}
                </span>
                <span className="whitespace-nowrap text-[10px] font-medium leading-none text-white/90 sm:text-[11px]">
                  {a.shortName}
                </span>
                {activeAgent === i && (
                  <motion.span
                    layoutId="agent-pill-dot"
                    className="h-1 w-1 shrink-0 rounded-full bg-accent-tertiary sm:h-1.5 sm:w-1.5"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* War room chat interface */}
        <div className="mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
          {/* Chat header */}
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${agent.color}22`, color: agent.color }}
              >
                {agent.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{agent.name}</p>
                <p className="text-[11px] text-white/45">{agent.role}</p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium text-white/50">
              Agent {agent.id} of {String(AGENT_COUNT).padStart(2, "0")}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={agent.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid md:grid-cols-[1fr_1.2fr]"
            >
              {/* Agent profile */}
              <div className="border-b border-white/8 p-5 md:border-b-0 md:border-r md:p-6">
                <p className="text-sm leading-relaxed text-white/65">{agent.description}</p>

                <div className="landing-chat-bubble mt-6 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    Primary output
                  </p>
                  <p className="mt-2 text-sm italic leading-relaxed text-white/90">
                    &ldquo;{agent.quote}&rdquo;
                  </p>
                </div>
              </div>

              {/* Agent thread */}
              <div className="p-5 md:p-6">
                <div className="space-y-3">
                  {agents.slice(0, activeAgent + 1).map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex gap-3"
                    >
                      <span
                        className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                        style={{ backgroundColor: a.color }}
                      >
                        {a.id}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-white/70">{a.shortName}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-white/50">
                          {a.quote}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {activeAgent < agents.length - 1 && (
                    <div className="flex items-center gap-2 pt-2">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-accent-tertiary" />
                      <span className="h-1 w-1 animate-pulse rounded-full bg-accent-tertiary [animation-delay:150ms]" />
                      <span className="h-1 w-1 animate-pulse rounded-full bg-accent-tertiary [animation-delay:300ms]" />
                      <span className="text-[11px] text-white/30">Next agent analyzing…</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </AnimatedSection>
  );
}
