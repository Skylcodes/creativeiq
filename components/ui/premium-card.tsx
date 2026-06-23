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

const toneClassMap = {
  default: "",
  orange: "dash-metric dash-metric-orange",
  purple: "dash-metric dash-metric-purple",
  teal: "dash-metric dash-metric-teal",
  pink: "dash-metric dash-metric-pink",
};

export function MetricTile({
  label,
  value,
  suffix,
  trend,
  icon,
  delay = 0,
  tone = "default",
}: MetricTileProps) {
  const isPastel = tone !== "default";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE_PREMIUM }}
      className={
        isPastel
          ? toneClassMap[tone]
          : "dash-card p-5 md:p-6"
      }
    >
      <div className="relative flex items-start justify-between gap-3">
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${
            isPastel ? "text-white/75" : "text-text-muted"
          }`}
        >
          {label}
        </p>
        {icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isPastel
                ? "bg-white/18 text-white"
                : "border border-black/6 bg-[#f6f7fb] text-accent"
            }`}
          >
            {icon}
          </div>
        )}
      </div>
      <p
        className={`relative mt-3 font-display text-[1.75rem] font-semibold tracking-[-0.04em] md:text-[2rem] ${
          isPastel ? "text-white" : "text-text-primary"
        }`}
      >
        {value}
        {suffix && (
          <span
            className={`ml-0.5 text-lg font-medium ${
              isPastel ? "text-white/70" : "text-text-muted"
            }`}
          >
            {suffix}
          </span>
        )}
      </p>
      {trend && (
        <p
          className={`relative mt-2 text-xs font-medium ${
            trend.positive
              ? isPastel
                ? "text-white/90"
                : "text-emerald-600"
              : isPastel
                ? "text-white/70"
                : "text-text-muted"
          }`}
        >
          {trend.value}
        </p>
      )}
    </motion.div>
  );
}
