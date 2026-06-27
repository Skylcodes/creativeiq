"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { AdDeconstruction } from "@/lib/types/deconstruction";
import { EASE_PREMIUM } from "@/components/ui/motion";

const CONF_LABEL = {
  high: { text: "High", className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" },
  medium: { text: "Medium", className: "border-amber-500/25 bg-amber-500/10 text-amber-400" },
  low: { text: "Low", className: "border-white/15 bg-white/[0.06] text-white/55" },
} as const;

export function DeconstructorList({
  items,
}: {
  items: AdDeconstruction[];
}) {
  if (items.length === 0) {
    return (
      <div className="dash-card p-8 text-center md:p-12">
        <p className="font-display text-lg font-semibold text-white">
          No deconstructions yet
        </p>
        <p className="mt-2 text-sm text-white/55">
          Submit a competitor ad to learn why it works — with evidence verification first.
        </p>
        <Link href="/deconstructor/new" className="btn-premium mt-6 inline-flex">
          Deconstruct an ad
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const conf = item.confidence_level
          ? CONF_LABEL[item.confidence_level]
          : null;
        const mode =
          item.report?.mode === "honest_analysis"
            ? "Honest analysis"
            : "Deconstruction";

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.4, ease: EASE_PREMIUM }}
          >
            <Link href={`/deconstructor/${item.id}`}>
              <div className="dash-card dash-card-interactive flex flex-wrap items-center justify-between gap-3 p-5 md:p-6">
                <div className="min-w-0">
                  <p className="font-medium text-white">{item.title}</p>
                  <p className="mt-0.5 text-xs text-white/42">
                    {new Date(item.created_at).toLocaleDateString()} · {mode}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {conf && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${conf.className}`}
                    >
                      {conf.text}
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      item.status === "completed"
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                        : item.status === "failed"
                          ? "border-red-500/25 bg-red-500/10 text-red-400"
                          : "border-accent/25 bg-accent/12 text-accent-tertiary"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
