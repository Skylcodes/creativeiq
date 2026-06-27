"use client";

import {
  getReportScoreColor,
  getReportScoreLabel,
} from "@/lib/report/utils";

type ScoreHeroProps = {
  score: number;
  label: string;
  size?: "lg" | "md" | "compact";
};

export function ScoreHero({ score, label, size = "lg" }: ScoreHeroProps) {
  const color = getReportScoreColor(score);
  const isCompact = size === "compact";
  const isMedium = size === "md";

  if (isCompact) {
    return (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">
          {label}
        </p>
        <p className="mt-0.5 font-display text-3xl font-bold leading-none" style={{ color }}>
          {score}
          <span className="ml-1 text-base font-medium text-white/35">/ 100</span>
        </p>
        <p className="mt-1 text-sm font-medium" style={{ color }}>
          {getReportScoreLabel(score)}
        </p>
      </div>
    );
  }

  return (
    <div className="text-center md:text-left">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">
        {label}
      </p>
      <p
        className={`mt-1 font-display font-bold leading-none ${
          isMedium ? "text-4xl" : "text-5xl"
        }`}
        style={{ color }}
      >
        {score}
        <span className="ml-1 text-base font-medium text-white/35">/ 100</span>
      </p>
      <p className="mt-1.5 text-sm font-medium" style={{ color }}>
        {getReportScoreLabel(score)}
      </p>
    </div>
  );
}
