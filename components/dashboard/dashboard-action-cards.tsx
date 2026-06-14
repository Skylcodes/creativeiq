"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { EASE_PREMIUM } from "@/components/ui/motion";

const CARDS = [
  {
    href: "/analyses/new",
    title: "New Analysis",
    subtitle: "Upload a creative and get a full funnel intelligence report.",
    accent: "#6e3aff",
    gradient: "from-accent/14 via-accent/6 to-transparent",
    featured: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path d="M11 4V18M4 11H18" stroke="#6e3aff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/analyses/compare",
    title: "Compare Variants",
    subtitle: "Test up to 4 creatives head to head before you spend.",
    accent: "#9333ea",
    gradient: "from-[#9333ea]/12 to-transparent",
    featured: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="3" y="5" width="7" height="12" rx="1.5" stroke="#9333ea" strokeWidth="1.5" />
        <rect x="12" y="5" width="7" height="12" rx="1.5" stroke="#9333ea" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: "/brief/new",
    title: "Generate Creative Brief",
    subtitle: "Get a full production brief before you film anything.",
    accent: "#d97706",
    gradient: "from-[#d97706]/12 to-transparent",
    featured: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="4" y="3" width="14" height="16" rx="2" stroke="#d97706" strokeWidth="1.5" />
        <path d="M8 8H14M8 11H13M8 14H11" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

type DashboardActionCardsProps = {
  featured?: boolean;
};

export function DashboardActionCards({ featured = false }: DashboardActionCardsProps) {
  return (
    <div className={`grid gap-4 ${featured ? "md:grid-cols-12" : "md:grid-cols-3"}`}>
      {CARDS.map((card, i) => (
        <motion.div
          key={card.href}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.45, ease: EASE_PREMIUM }}
          className={featured && card.featured ? "md:col-span-6" : featured ? "md:col-span-3" : ""}
        >
          <Link
            href={card.href}
            className={`premium-card premium-card-interactive group relative flex h-full flex-col overflow-hidden p-5 md:p-6 ${
              card.featured && featured ? "md:min-h-[168px]" : ""
            }`}
          >
            <div className={`absolute inset-x-0 top-0 h-24 bg-linear-to-b ${card.gradient}`} />
            <div className="relative flex h-full flex-col">
              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
                style={{ background: `${card.accent}14` }}
              >
                {card.icon}
              </div>
              <h3 className="font-display text-base font-semibold text-text-primary">
                {card.title}
              </h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-text-secondary">
                {card.subtitle}
              </p>
              <span
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold transition-all group-hover:gap-2.5"
                style={{ color: card.accent }}
              >
                Get started
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M3 7H11M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
