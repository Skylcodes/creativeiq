"use client";

import { motion } from "framer-motion";
import { INPUT_PLACEHOLDERS } from "@/lib/chat/constants";

const CAPABILITIES = [
  {
    title: "Hooks & scripts",
    description:
      "Generate variants, rewrites, and platform-specific creative in your brand voice.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M3 4H13M3 8H11M3 12H9"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Strategic priorities",
    description:
      "Get a ranked action plan based on your report scores and conversion blockers.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 2V14M5 5L8 2L11 5M5 11L8 14L11 11"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Deep analysis",
    description:
      "Challenge assumptions, compare variants, and understand every agent finding.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M8 5.5V8.5L10 10"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

type ChatEmptyStateProps = {
  contextLabel: string;
  onSelectPrompt: (prompt: string) => void;
};

export function ChatEmptyState({
  contextLabel,
  onSelectPrompt,
}: ChatEmptyStateProps) {
  const examples = INPUT_PLACEHOLDERS.slice(0, 4);

  return (
    <div className="mx-auto max-w-lg px-2 py-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <div className="icon-badge mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/[0.12]">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M12 2L14.5 8.5H21.5L16 12.5L18 20L12 16L6 20L8 12.5L2.5 8.5H9.5L12 2Z"
              stroke="#a78bfa"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-white">
          Your AI creative strategist
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-white/55">
          I&apos;ve read your full analysis. Ask me to rewrite hooks, prioritize
          fixes, explain findings, or pressure-test your creative strategy.
        </p>
        <p className="app-chip mt-3 inline-flex gap-1.5 px-3 py-1.5 text-[11px] text-accent-tertiary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-tertiary animate-pulse" />
          Connected to {contextLabel}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 grid gap-2.5"
      >
        {CAPABILITIES.map((cap) => (
          <div key={cap.title} className="dash-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent-tertiary">
                {cap.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{cap.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/45">
                  {cap.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
          Try asking
        </p>
        <div className="mt-3 grid gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onSelectPrompt(example)}
              className="group dash-card dash-card-interactive flex w-full items-center justify-between px-4 py-3 text-left text-[13px] text-white/55"
            >
              <span>{example}</span>
              <svg
                className="shrink-0 text-white/35 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-tertiary"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
              >
                <path
                  d="M5 3L10 7L5 11"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
