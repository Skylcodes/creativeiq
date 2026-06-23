"use client";

import { motion } from "framer-motion";
import { stepTransition } from "./onboarding-shell";

type StepReadyProps = {
  workspaceName: string;
  onContinue: () => void;
};

export function StepReady({ workspaceName, onContinue }: StepReadyProps) {
  return (
    <motion.div
      key="ready"
      {...stepTransition}
      className="premium-card noise-overlay rounded-2xl p-8 text-center md:p-10"
    >
      <motion.div
        className="icon-badge mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent-light"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
      >
        <motion.svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          aria-hidden
        >
          <motion.path
            d="M6 14L12 20L22 8"
            stroke="#6947ff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </motion.div>

      <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
        {workspaceName} is ready
      </h1>

      <p className="mt-3 text-base leading-relaxed text-text-secondary">
        Your workspace is set up and your brand profile is built. Time to start stress-testing your ad funnels.
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="btn-premium mt-8 w-full"
      >
        Go to my dashboard
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </motion.div>
  );
}
