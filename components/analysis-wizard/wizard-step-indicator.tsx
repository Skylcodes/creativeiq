"use client";

import { motion } from "framer-motion";

const DEFAULT_STEPS = [
  { num: 1, label: "Platform" },
  { num: 2, label: "Creative" },
  { num: 3, label: "Landing page" },
  { num: 4, label: "Review" },
];

type WizardStepIndicatorProps = {
  currentStep: number;
  steps?: { num: number; label: string }[];
};

export function WizardStepIndicator({ currentStep, steps = DEFAULT_STEPS }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-3">
      {steps.map((step, index) => {
        const isComplete = currentStep > step.num;
        const isActive = currentStep === step.num;

        return (
          <div key={step.num} className="flex items-center gap-2 md:gap-3">
            <div className="flex flex-col items-center gap-1">
              <motion.div
                animate={{
                  scale: isActive ? 1.05 : 1,
                  backgroundColor: isComplete || isActive ? "#6e3aff" : "rgba(0,0,0,0.04)",
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isComplete || isActive ? "text-white shadow-[0_4px_12px_rgba(110,58,255,0.35)]" : "text-text-muted"
                }`}
              >
                {isComplete ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  step.num
                )}
              </motion.div>
              <span
                className={`hidden text-[10px] font-medium sm:block ${
                  isActive ? "text-accent" : isComplete ? "text-text-secondary" : "text-text-muted"
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div className="relative h-px w-6 overflow-hidden bg-black/[0.06] md:w-10">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-accent"
                  initial={{ width: "0%" }}
                  animate={{ width: currentStep > step.num ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
