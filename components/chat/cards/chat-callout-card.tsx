"use client";

import { motion } from "framer-motion";

type CalloutVariant = "warning" | "opportunity";

type ChatCalloutCardProps = {
  variant: CalloutVariant;
  title: string;
  body: string;
  index?: number;
};

const STYLES: Record<
  CalloutVariant,
  { border: string; bg: string; iconBg: string; label: string; iconColor: string }
> = {
  warning: {
    border: "border-amber-200/80",
    bg: "from-amber-50/80 to-white",
    iconBg: "bg-amber-100/80",
    label: "Conversion risk",
    iconColor: "#d97706",
  },
  opportunity: {
    border: "border-[#0d9488]/20",
    bg: "from-[#0d9488]/[0.05] to-white",
    iconBg: "bg-[#0d9488]/10",
    label: "Opportunity",
    iconColor: "#0d9488",
  },
};

export function ChatCalloutCard({
  variant,
  title,
  body,
  index = 0,
}: ChatCalloutCardProps) {
  const style = STYLES[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-xl border bg-linear-to-br p-4 ${style.border} ${style.bg}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}
        >
          {variant === "warning" ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M7 1.5L12.5 11.5H1.5L7 1.5Z" stroke={style.iconColor} strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M7 5.5V8" stroke={style.iconColor} strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="7" cy="10" r="0.6" fill={style.iconColor} />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M7 1.5V12.5M4 4.5L7 1.5L10 4.5M4 9.5L7 12.5L10 9.5" stroke={style.iconColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            {style.label}
          </p>
          <p className="mt-1 font-display text-sm font-semibold text-text-primary">{title}</p>
          {body && (
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{body}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
