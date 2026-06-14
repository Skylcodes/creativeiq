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
      className="rounded-2xl border border-white/80 bg-white/90 p-8 text-center shadow-[0_24px_64px_rgba(110,58,255,0.08),0_8px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl md:p-10"
    >
      <motion.div
        className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent-light"
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
            stroke="#6e3aff"
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
        className="btn-primary mt-8 w-full"
      >
        Go to my dashboard
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </motion.div>
  );
}
