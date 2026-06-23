"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type NewAnalysisCtaProps = {
  label: string;
  size?: "hero" | "compact";
  className?: string;
};

export function NewAnalysisCta({
  label,
  size = "hero",
  className = "",
}: NewAnalysisCtaProps) {
  if (size === "compact") {
    return (
      <Link
        href="/analyses/new"
        className={`dash-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[13px] ${className}`}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M8 3V13M3 8H13"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
        {label}
      </Link>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      <Link
        href="/analyses/new"
        className="btn-primary group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-2xl px-9 py-[1.125rem] text-lg"
      >
        <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/12 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M10 4V16M4 10H16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        {label}
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          className="transition-transform group-hover:translate-x-0.5"
          aria-hidden
        >
          <path
            d="M4 9H14M14 9L10 5M14 9L10 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </motion.div>
  );
}
