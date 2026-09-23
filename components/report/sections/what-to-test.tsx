"use client";

import Link from "next/link";
import type { AnalysisReport } from "@/lib/types/report";
import { PremiumCard } from "@/components/ui/premium-card";

const RANK_LABELS = ["Launch First", "Test Next", "Alternative Opportunity"];

type WhatToTestSectionProps = {
  report: AnalysisReport;
};

export function WhatToTestSection({ report }: WhatToTestSectionProps) {
  const angles = [...(report.angleRecommendations ?? [])].sort(
    (a, b) => a.rank - b.rank
  );

  return (
    <section id="section-test-next" className="scroll-mt-24 space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-white md:text-2xl">
          What To Test Next
        </h2>
        <p className="mt-1 text-sm text-white/55">
          Positioning angles ranked by launch priority — not generic brainstorms.
        </p>
      </div>

      {angles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {angles.slice(0, 3).map((angle, i) => (
            <PremiumCard key={angle.rank} padding="md">
              <span className="card-eyebrow font-bold tracking-[0.15em]">
                Angle {angle.rank} — {RANK_LABELS[i] ?? "Consider"}
              </span>
              <h3 className="mt-2 font-display text-lg font-semibold text-text-primary">
                {angle.angle}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {angle.rationale}
              </p>
            </PremiumCard>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/45">
          No angle recommendations were generated for this report.
        </p>
      )}

      <div className="flex justify-center pt-2">
        <Link href="/analyses/new" className="btn-primary">
          Start New Analysis
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M3 8H13M9 4L13 8L9 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </section>
  );
}
