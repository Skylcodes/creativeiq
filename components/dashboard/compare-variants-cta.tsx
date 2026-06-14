"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type CompareVariantsCtaProps = {
  size?: "hero" | "compact";
  className?: string;
};

export function CompareVariantsCta({
  size = "compact",
  className = "",
}: CompareVariantsCtaProps) {
  if (size === "hero") {
    return (
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={className}>
        <Link
          href="/analyses/compare"
          className="group flex flex-col items-center rounded-2xl border-2 border-accent/25 bg-white px-8 py-5 text-center shadow-[0_4px_24px_rgba(110,58,255,0.08)] transition-all hover:border-accent/40 hover:shadow-[0_8px_32px_rgba(110,58,255,0.14)]"
        >
          <span className="inline-flex items-center gap-2 font-semibold text-accent">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <rect x="2" y="4" width="6" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <rect x="10" y="4" width="6" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            Compare Variants
          </span>
          <span className="mt-1.5 text-xs text-text-secondary">
            Test up to 4 creatives head to head
          </span>
        </Link>
      </motion.div>
    );
  }

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <Link
        href="/analyses/compare"
        className="inline-flex items-center gap-2 rounded-full border-2 border-accent/30 bg-white px-5 py-2.5 text-[13px] font-semibold text-accent shadow-sm transition-all hover:border-accent/50 hover:bg-accent/[0.03] hover:shadow-[0_4px_16px_rgba(110,58,255,0.12)]"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="1" y="3" width="5.5" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
          <rect x="9.5" y="3" width="5.5" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        Compare Variants
      </Link>
      <span className="text-[11px] text-text-muted pl-1">
        Test up to 4 creatives head to head
      </span>
    </div>
  );
}
