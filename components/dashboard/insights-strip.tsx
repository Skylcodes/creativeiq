"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { PremiumCard } from "@/components/ui/premium-card";

const INSIGHTS = [
  {
    category: "Creative Testing",
    tip: "Test one variable per creative iteration. Change the hook OR the CTA — not both. You'll know exactly what moved the needle.",
  },
  {
    category: "Funnel Alignment",
    tip: "Your ad promise and landing page hero should use the same language. A curiosity hook with a 'Shop Now' CTA is the #1 conversion killer we see.",
  },
  {
    category: "ICP Targeting",
    tip: "Run separate analyses for different creative angles targeting different buyer types. The same landing page converts differently per ICP.",
  },
  {
    category: "Pre-Launch Testing",
    tip: "Analyze creative before scaling past $500/day. Catching a funnel mismatch at $0 spend beats discovering it at $5,000.",
  },
  {
    category: "Landing Page CRO",
    tip: "Place social proof above the fold, not below it. Skeptical buyers decide within 3 seconds whether your page is worth reading.",
  },
];

export function InsightsStrip() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % INSIGHTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const insight = INSIGHTS[index];

  return (
    <PremiumCard variant="accent" padding="md">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 1.5L9.5 6H14L10.5 8.5L12 13L8 10.5L4 13L5.5 8.5L2 6H6.5L8 1.5Z" stroke="#6e3aff" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
              Intelligence Tip
            </p>
            <span className="text-[10px] text-text-muted">· {insight.category}</span>
          </div>

          <div className="min-h-14 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="text-[13px] leading-relaxed text-text-secondary"
              >
                {insight.tip}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="mt-3 flex gap-1.5">
            {INSIGHTS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === index ? "w-5 bg-accent" : "w-1.5 bg-black/10 hover:bg-black/20"
                }`}
                aria-label={`Show insight ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </PremiumCard>
  );
}
