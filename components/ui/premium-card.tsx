"use client";

import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { EASE_PREMIUM } from "./motion";

type PremiumCardProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
  variant?: "default" | "elevated" | "glass" | "accent" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
};

const paddingMap = {
  none: "",
  sm: "p-4 md:p-[1.125rem]",
  md: "p-5 md:p-6",
  lg: "p-6 md:p-8",
};

const variantMap = {
  default: "premium-card",
  elevated: "premium-card premium-card-elevated",
  glass: "premium-card premium-card-glass",
  accent: "premium-card premium-card-accent",
  interactive: "premium-card premium-card-interactive",
};

export function PremiumCard({
  children,
  variant = "default",
  padding = "md",
  hover = false,
  className = "",
  ...props
}: PremiumCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -3, scale: 1.002, transition: { duration: 0.22 } } : undefined}
      transition={{ duration: 0.35, ease: EASE_PREMIUM }}
      className={`${variantMap[variant]} ${paddingMap[padding]} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type MetricTileProps = {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  trend?: { value: string; positive?: boolean };
  icon?: ReactNode;
  delay?: number;
  tone?: "default" | "orange" | "purple" | "teal" | "pink";
};

const toneAccentMap = {
  default: {
    top: "rgba(105, 71, 255, 0.55)",
    iconWrap: "border-accent/20 bg-accent/10 text-accent-tertiary",
    glow: "rgba(105, 71, 255, 0.1)",
  },
  orange: {
    top: "rgba(251, 146, 60, 0.7)",
    iconWrap: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    glow: "rgba(251, 146, 60, 0.08)",
  },
  purple: {
    top: "rgba(167, 139, 250, 0.75)",
    iconWrap: "border-accent/25 bg-accent/12 text-accent-tertiary",
    glow: "rgba(105, 71, 255, 0.1)",
  },
  teal: {
    top: "rgba(45, 212, 191, 0.7)",
    iconWrap: "border-teal-400/25 bg-teal-400/10 text-teal-300",
    glow: "rgba(45, 212, 191, 0.08)",
  },
  pink: {
    top: "rgba(244, 114, 182, 0.7)",
    iconWrap: "border-pink-400/25 bg-pink-400/10 text-pink-300",
    glow: "rgba(244, 114, 182, 0.08)",
  },
} as const;

export function MetricTile({
  label,
  value,
  suffix,
  trend,
  icon,
  delay = 0,
  tone = "default",
}: MetricTileProps) {
  const accent = toneAccentMap[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE_PREMIUM }}
      className="dash-card dash-card-interactive group relative overflow-hidden p-5 md:p-6"
      style={{
        borderTopWidth: 2,
        borderTopColor: accent.top,
        background: `radial-gradient(ellipse 80% 60% at 12% 0%, ${accent.glow}, transparent 55%), rgba(255, 255, 255, 0.04)`,
      }}
    >
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">
          {label}
        </p>
        {icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${accent.iconWrap}`}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="relative mt-3 font-display text-[1.75rem] font-semibold tracking-[-0.04em] text-white md:text-[2rem]">
        {value}
        {suffix && (
          <span className="ml-0.5 text-lg font-medium text-white/45">
            {suffix}
          </span>
        )}
      </p>
      {trend && (
        <p
          className={`relative mt-2 text-xs font-medium ${
            trend.positive ? "text-teal-300" : "text-white/45"
          }`}
        >
          {trend.value}
        </p>
      )}
    </motion.div>
  );
}
