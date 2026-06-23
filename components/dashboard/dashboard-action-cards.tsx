"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { EASE_PREMIUM } from "@/components/ui/motion";

const CARDS = [
  {
    href: "/analyses/compare",
    title: "Compare Variants",
    subtitle: "Test up to 4 creatives head to head before you spend.",
    accent: "#0d9488",
    accentBg: "bg-[#0d9488]/10",
    icon: (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="3" y="5" width="7" height="12" rx="1.5" stroke="#0d9488" strokeWidth="1.5" />
        <rect x="12" y="5" width="7" height="12" rx="1.5" stroke="#0d9488" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: "/brief/new",
    title: "Generate Creative Brief",
    subtitle: "Get a full production brief before you film anything.",
    accent: "#db2777",
    accentBg: "bg-[#db2777]/10",
    icon: (
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="4" y="3" width="14" height="16" rx="2" stroke="#db2777" strokeWidth="1.5" />
        <path d="M8 8H14M8 11H13M8 14H11" stroke="#db2777" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function DashboardActionCards() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {CARDS.map((card, i) => (
        <motion.div
          key={card.href}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.4, ease: EASE_PREMIUM }}
        >
          <Link
            href={card.href}
            className="dash-action-card dash-card-interactive group flex h-full flex-col p-5"
            style={{ borderTop: `3px solid ${card.accent}` }}
          >
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${card.accentBg}`}
            >
              {card.icon}
            </div>
            <h3 className="font-display text-[15px] font-semibold tracking-[-0.02em] text-text-primary">
              {card.title}
            </h3>
            <p className="mt-1 flex-1 text-[13px] leading-relaxed text-text-secondary">
              {card.subtitle}
            </p>
            <span
              className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold transition-all group-hover:gap-2"
              style={{ color: card.accent }}
            >
              Get started
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
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
      ))}
    </div>
  );
}
