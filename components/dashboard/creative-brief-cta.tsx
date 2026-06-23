"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type CreativeBriefCtaProps = {
  size?: "hero" | "compact" | "card";
  className?: string;
};

export function CreativeBriefCta({
  size = "compact",
  className = "",
}: CreativeBriefCtaProps) {
  if (size === "card") {
    return (
      <motion.div whileHover={{ y: -2 }} className={className}>
        <Link
          href="/brief/new"
          className="group flex h-full flex-col dashboard-panel p-5 transition-all hover:bg-white hover:shadow-[0_12px_36px_rgba(217,119,6,0.12)] hover:ring-[#d97706]/20"
        >
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#d97706]/10">
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              aria-hidden
            >
              <rect
                x="4"
                y="3"
                width="14"
                height="16"
                rx="2"
                stroke="#d97706"
                strokeWidth="1.5"
              />
              <path
                d="M8 8H14M8 11H13M8 14H11"
                stroke="#d97706"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h3 className="font-display text-base font-semibold text-text-primary">
            Generate Creative Brief
          </h3>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-text-secondary">
            Don&apos;t have an ad yet? Get a full production brief before you
            film anything.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#d97706] group-hover:gap-2 transition-all">
            Start here
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
            >
              <path
                d="M3 7H11M8 4L11 7L8 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </Link>
      </motion.div>
    );
  }

  if (size === "hero") {
    return (
      <motion.div whileHover={{ scale: 1.02 }} className={className}>
        <Link
          href="/brief/new"
          className="group flex flex-col items-center rounded-2xl border-2 border-[#d97706]/25 bg-white px-8 py-5 text-center shadow-[0_4px_24px_rgba(217,119,6,0.08)] transition-all hover:border-[#d97706]/40"
        >
          <span className="inline-flex items-center gap-2 font-semibold text-[#d97706]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden
            >
              <rect
                x="3"
                y="2"
                width="12"
                height="14"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path
                d="M6 6H12M6 9H10"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            Generate Creative Brief
          </span>
          <span className="mt-1.5 text-xs text-text-secondary">
            Get a production brief before you film
          </span>
        </Link>
      </motion.div>
    );
  }

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <Link
        href="/brief/new"
        className="inline-flex items-center gap-2 rounded-full border-2 border-[#d97706]/30 bg-white px-5 py-2.5 text-[13px] font-semibold text-[#d97706] shadow-sm transition-all hover:border-[#d97706]/50 hover:bg-[#d97706]/[0.03]"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect
            x="2"
            y="2"
            width="12"
            height="12"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M5 5H11M5 8H9"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        Generate Brief
      </Link>
      <span className="text-[11px] text-text-muted pl-1">
        Production brief before you film
      </span>
    </div>
  );
}
