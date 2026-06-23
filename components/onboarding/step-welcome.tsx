"use client";

import { motion } from "framer-motion";
import { stepTransition } from "./onboarding-shell";

type StepWelcomeProps = {
  userName: string;
  onContinue: () => void;
};

export function StepWelcome({ userName, onContinue }: StepWelcomeProps) {
  return (
    <motion.div
      key="welcome"
      {...stepTransition}
      className="premium-card noise-overlay rounded-2xl p-8 text-center md:p-10"
    >
      <div className="icon-badge mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-light">
        <span className="text-2xl">👋</span>
      </div>

      <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
        Hey {userName}, welcome to Advara
      </h1>

      <p className="mt-4 text-base leading-relaxed text-text-secondary">
        Everything here works around <span className="font-medium text-text-primary">brand workspaces</span> — one workspace per brand you analyze. Your analyses, reports, and brand profile all live inside a workspace.
      </p>

      <p className="mt-3 text-sm text-text-muted">
        Let&apos;s set up your first one. Takes about a minute.
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="btn-premium mt-8 w-full"
      >
        Let&apos;s go
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </motion.div>
  );
}
