"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";

type OnboardingShellProps = {
  children: ReactNode;
  step: number;
  totalSteps: number;
  wide?: boolean;
};

export function OnboardingShell({
  children,
  step,
  totalSteps,
  wide = false,
}: OnboardingShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute inset-0 mesh-gradient" />
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-50" />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-accent/8 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-accent-secondary/8 blur-3xl" />

      <div className={`relative w-full ${wide ? "max-w-lg" : "max-w-md"}`}>
        <div className="mb-8 flex flex-col items-center gap-6">
          <Logo href="/" />
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <motion.div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i + 1 <= step
                      ? "w-8 bg-accent"
                      : "w-4 bg-border-strong"
                  }`}
                  animate={{ width: i + 1 <= step ? 32 : 16 }}
                />
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">{children}</AnimatePresence>
      </div>
    </div>
  );
}

export const stepTransition = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.98 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};
