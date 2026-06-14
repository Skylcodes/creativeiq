"use client";

import { motion } from "framer-motion";
import type { Workspace } from "@/lib/types/workspace";
import { PageShell } from "@/components/ui/page-shell";
import { PremiumCard } from "@/components/ui/premium-card";
import { EmptyDashboardVisual } from "./empty-dashboard-visual";
import { NewAnalysisCta } from "./new-analysis-cta";
import { DashboardActionCards } from "./dashboard-action-cards";
import { WorkspaceHeader } from "./workspace-header";

const STEPS = [
  {
    num: "01",
    label: "Paste brand URL",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <circle cx="9" cy="9" r="7" stroke="#6e3aff" strokeWidth="1.3" />
        <path d="M6 9H12M9 6V12" stroke="#6e3aff" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: "02",
    label: "Upload ad creative",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M9 3V11M9 11L6 8M9 11L12 8" stroke="#6e3aff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 14H15" stroke="#6e3aff" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: "03",
    label: "Get funnel report",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M3 13L7 8L10 11L15 4" stroke="#6e3aff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 15H16" stroke="#6e3aff" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

const OUTCOME_CARDS = [
  {
    num: "01",
    title: "Ad Creative Analysis",
    description:
      "Five AI agents stress-test your hook, angle, and CTA before you spend.",
    gradient: "from-accent/12 to-accent/4",
    iconBg: "bg-accent/10",
    accent: "#6e3aff",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="3" y="5" width="16" height="12" rx="2" stroke="#6e3aff" strokeWidth="1.5" />
        <path d="M9 9L13 11L9 13V9Z" fill="#6e3aff" fillOpacity="0.3" stroke="#6e3aff" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Landing Page Conversion Score",
    description:
      "See where your funnel leaks — from ad click to checkout CTA.",
    gradient: "from-accent-secondary/12 to-accent-secondary/4",
    iconBg: "bg-accent-secondary/10",
    accent: "#0d9488",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path d="M4 16L8 10L12 13L18 5" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 18H19" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "ICP Funnel Simulation",
    description:
      "Watch your ideal customer move through your funnel with real objections.",
    gradient: "from-[#9333ea]/12 to-[#9333ea]/4",
    iconBg: "bg-[#9333ea]/10",
    accent: "#9333ea",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <circle cx="11" cy="7" r="3.5" stroke="#9333ea" strokeWidth="1.5" />
        <path d="M5 19C5 15 8 13 11 13C14 13 17 15 17 19" stroke="#9333ea" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const TRUST_PILLS = ["5 AI agents", "Full funnel report", "Action plan included"];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

type EmptyDashboardProps = {
  workspace: Workspace;
  displayName: string;
};

export function EmptyDashboard({ workspace, displayName }: EmptyDashboardProps) {
  return (
    <PageShell grid className="pb-4 pt-4 md:pb-6 md:pt-5">
        {/* Hero */}
        <div className="mx-auto grid max-w-6xl items-center gap-6 lg:grid-cols-2 lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center lg:text-left"
          >
            <WorkspaceHeader workspace={workspace} compact />

            <h1 className="mt-4 font-display text-[1.9rem] font-semibold tracking-tight text-text-primary sm:text-[2.1rem] lg:text-[2.5rem]">
              {displayName}, discover what your funnel is{" "}
              <span className="text-gradient-accent">really saying</span>
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-text-secondary lg:mx-0 lg:text-base">
              One ad creative. One URL. A complete intelligence report — ad
              analysis, conversion score, ICP simulation, and a prioritized
              action plan before you spend on Meta or TikTok.
            </p>

            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <NewAnalysisCta label="Run Your First Analysis" />
            </div>

            <div className="mx-auto mt-8 max-w-3xl lg:mx-0">
              <DashboardActionCards />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              {TRUST_PILLS.map((pill) => (
                <span key={pill} className="insight-chip text-[11px] font-medium">
                  {pill}
                </span>
              ))}
            </div>
          </motion.div>

          <div className="hidden sm:flex sm:justify-center lg:justify-end">
            <EmptyDashboardVisual />
          </div>
        </div>

        {/* Process strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mx-auto mt-7 max-w-4xl"
        >
          <PremiumCard
            variant="glass"
            padding="sm"
            className="relative flex items-center justify-between gap-3 px-5 py-4 md:px-8"
          >
            <div className="absolute left-[16%] right-[16%] top-1/2 hidden h-px bg-linear-to-r from-transparent via-accent/20 to-transparent md:block" />
            {STEPS.map((step) => (
              <div key={step.num} className="relative flex flex-1 flex-col items-center text-center">
                <div className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-[0_2px_8px_rgba(110,58,255,0.08)] ring-1 ring-black/[0.04]">
                  {step.icon}
                </div>
                <span className="text-[10px] font-bold text-accent/60">{step.num}</span>
                <span className="text-xs font-medium text-text-primary">{step.label}</span>
              </div>
            ))}
          </PremiumCard>
        </motion.div>

        {/* Outcome cards */}
        <div className="mx-auto mt-7 max-w-5xl">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted"
          >
            What you&apos;ll receive
          </motion.p>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 md:grid-cols-3"
          >
            {OUTCOME_CARDS.map((card) => (
              <PremiumCard
                key={card.title}
                variants={item}
                variant="interactive"
                padding="md"
                hover
                className="group relative overflow-hidden"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-20 bg-linear-to-b ${card.gradient} opacity-60`}
                />
                <div className="relative">
                  <div className="mb-3 flex items-center justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBg}`}>
                      {card.icon}
                    </div>
                    <span
                      className="font-display text-2xl font-bold opacity-20"
                      style={{ color: card.accent }}
                    >
                      {card.num}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-text-primary">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                    {card.description}
                  </p>
                </div>
              </PremiumCard>
            ))}
          </motion.div>
        </div>

        <div className="mt-6 sm:hidden">
          <EmptyDashboardVisual />
        </div>
    </PageShell>
  );
}
