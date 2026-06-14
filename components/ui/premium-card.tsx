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
  sm: "p-4",
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
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
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
};

export function MetricTile({
  label,
  value,
  suffix,
  trend,
  icon,
  delay = 0,
}: MetricTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE_PREMIUM }}
      className="premium-card group p-5 md:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
          {label}
        </p>
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/[0.06] text-accent transition-colors group-hover:bg-accent/10">
            {icon}
          </div>
        )}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-text-primary md:text-[2rem]">
        {value}
        {suffix && (
          <span className="ml-0.5 text-lg font-medium text-text-muted">{suffix}</span>
        )}
      </p>
      {trend && (
        <p
          className={`mt-2 text-xs font-medium ${
            trend.positive ? "text-emerald-600" : "text-text-muted"
          }`}
        >
          {trend.value}
        </p>
      )}
    </motion.div>
  );
}
