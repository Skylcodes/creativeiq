"use client";

import type { ReactNode } from "react";
import { FadeUp } from "./motion";

const SHELL_PADDING =
  "px-4 py-5 sm:px-6 sm:py-7 md:px-10 md:py-8 lg:px-12 lg:py-9";
const CONTENT_WIDTH = "mx-auto w-full max-w-6xl xl:max-w-7xl";

type PageShellProps = {
  children: ReactNode;
  /** Show ambient mesh gradient background */
  ambient?: boolean;
  /** Show subtle grid pattern overlay */
  grid?: boolean;
  /** Constrain content width (default true) */
  contained?: boolean;
  className?: string;
};

export function PageShell({
  children,
  ambient = true,
  grid = true,
  contained = true,
  className = "",
}: PageShellProps) {
  return (
    <div
      className={`relative min-h-full overflow-x-clip ${SHELL_PADDING} ${className}`}
    >
      {ambient && (
        <>
          <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-28 top-20 h-72 w-72 rounded-full bg-accent-tertiary/12 blur-3xl" />
        </>
      )}
      {grid && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      )}
      <div className={`relative ${contained ? CONTENT_WIDTH : "w-full"}`}>
        {children}
      </div>
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
      className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5 ${compact ? "" : "mb-6 sm:mb-8 md:mb-10"}`}
    >
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <p className="app-eyebrow">{eyebrow}</p>}
        <h1
          className={`font-display font-semibold tracking-[-0.045em] text-white ${
            compact
              ? "text-2xl md:text-[1.875rem]"
              : "text-[1.75rem] md:text-[2.25rem]"
          } ${eyebrow ? "mt-3" : ""}`}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 max-w-2xl text-[14px] leading-relaxed text-white/55 md:text-[15px]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="w-full shrink-0 pt-0 sm:w-auto sm:pt-1">{action}</div>}
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
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 ${className}`}>
      <div>
        <h2 className="font-display text-lg font-semibold tracking-[-0.03em] text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[13px] text-white/55">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
