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
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={className}
      >
        <Link
          href="/analyses/compare"
          className="group flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-5 text-center backdrop-blur-xl transition-all duration-350 hover:-translate-y-0.5 hover:border-accent/28 hover:bg-white/[0.07] hover:shadow-[0_0_48px_rgba(105,71,255,0.15)]"
        >
          <span className="inline-flex items-center gap-2 font-semibold text-accent-tertiary">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden
            >
              <rect
                x="2"
                y="4"
                width="6"
                height="10"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <rect
                x="10"
                y="4"
                width="6"
                height="10"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
            </svg>
            Compare Variants
          </span>
          <span className="mt-1.5 text-xs text-white/45">
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
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-[13px] font-semibold text-accent-tertiary backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/28 hover:bg-white/[0.07] hover:shadow-[0_0_32px_rgba(105,71,255,0.12)]"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect
            x="1"
            y="3"
            width="5.5"
            height="10"
            rx="1.2"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <rect
            x="9.5"
            y="3"
            width="5.5"
            height="10"
            rx="1.2"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
        Compare Variants
      </Link>
      <span className="text-[11px] text-white/38 pl-1">
        Test up to 4 creatives head to head
      </span>
    </div>
  );
}
