"use client";

import type { ReactNode } from "react";
import { FadeUp } from "./motion";

type PageShellProps = {
  children: ReactNode;
  /** Show ambient mesh gradient background */
  ambient?: boolean;
  /** Show subtle grid pattern overlay */
  grid?: boolean;
  className?: string;
};

export function PageShell({
  children,
  ambient = true,
  grid = false,
  className = "",
}: PageShellProps) {
  return (
    <div className={`relative min-h-full overflow-x-clip px-5 pb-12 pt-3 md:px-8 md:pb-16 md:pt-5 ${className}`}>
      {ambient && (
        <>
          <div className="pointer-events-none absolute inset-0 mesh-gradient opacity-55" />
          <div className="pointer-events-none absolute -right-28 top-0 h-80 w-80 rounded-full bg-accent/[0.08] blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-accent-tertiary/[0.06] blur-3xl" />
        </>
      )}
      {grid && (
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-50" />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  compact = false,
}: PageHeaderProps) {
  return (
    <FadeUp
      className={`flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between ${compact ? "" : "mb-8"}`}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-primary">
            {eyebrow}
          </p>
        )}
        <h1
          className={`font-display font-semibold tracking-[-0.04em] text-text-primary ${
            compact
              ? "text-2xl md:text-[1.75rem]"
              : "text-2xl md:text-[2.1rem]"
          } ${eyebrow ? "mt-2" : ""}`}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-text-secondary">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </FadeUp>
  );
}

type SectionHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({
  title,
  description,
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex items-end justify-between gap-4 ${className}`}>
      <div>
        <h2 className="font-display text-lg font-semibold tracking-[-0.025em] text-text-primary">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[13px] text-text-secondary">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
