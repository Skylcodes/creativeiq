"use client";

import Link from "next/link";
import type { AdDeconstruction } from "@/lib/types/deconstruction";
import { PremiumCard } from "@/components/ui/premium-card";

const CONF_LABEL = {
  high: { text: "High", className: "text-emerald-600 bg-emerald-500/10" },
  medium: { text: "Medium", className: "text-amber-700 bg-amber-500/10" },
  low: { text: "Low", className: "text-zinc-600 bg-zinc-500/10" },
} as const;

export function DeconstructorList({
  items,
}: {
  items: AdDeconstruction[];
}) {
  if (items.length === 0) {
    return (
      <PremiumCard variant="elevated" padding="lg" className="text-center">
        <p className="font-display text-lg font-semibold text-text-primary">
          No deconstructions yet
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          Submit a competitor ad to learn why it works — with evidence verification first.
        </p>
        <Link href="/deconstructor/new" className="btn-premium mt-6 inline-flex">
          Deconstruct an ad
        </Link>
      </PremiumCard>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const conf = item.confidence_level
          ? CONF_LABEL[item.confidence_level]
          : null;
        const mode =
          item.report?.mode === "honest_analysis"
            ? "Honest analysis"
            : "Deconstruction";

        return (
          <Link key={item.id} href={`/deconstructor/${item.id}`}>
            <PremiumCard
              padding="md"
              hover
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-text-primary">{item.title}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {new Date(item.created_at).toLocaleDateString()} · {mode}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {conf && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${conf.className}`}
                  >
                    {conf.text}
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    item.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-700"
                      : item.status === "failed"
                        ? "bg-red-500/10 text-red-600"
                        : "bg-accent/10 text-accent"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            </PremiumCard>
          </Link>
        );
      })}
    </div>
  );
}
