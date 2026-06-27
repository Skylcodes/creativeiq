"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BRIEF_GOALS, briefPlatformLabels } from "@/lib/briefs/constants";
import { formatAnalysisDateTime } from "@/lib/analyses/utils";
import type { CreativeBrief } from "@/lib/types/brief";
import { EASE_PREMIUM } from "@/components/ui/motion";

type BriefListProps = {
  briefs: CreativeBrief[];
};

export function BriefList({ briefs }: BriefListProps) {
  if (briefs.length === 0) {
    return (
      <div className="dash-card p-8 text-center md:p-12">
        <div className="icon-badge mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d97706]/12">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="4" y="3" width="16" height="18" rx="2" stroke="#f59e0b" strokeWidth="1.5" />
            <path d="M8 8H16M8 12H14" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="font-display text-lg font-semibold text-white">
          No briefs yet
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/55">
          Generate a production-ready creative brief before you film anything.
        </p>
        <Link href="/brief/new" className="btn-premium mt-6 inline-flex text-sm">
          Generate Creative Brief
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {briefs.map((brief, index) => {
        const goal = BRIEF_GOALS.find((g) => g.id === brief.input?.goal)?.label;
        const platform = briefPlatformLabels(brief.input);
        const angleName =
          brief.brief?.angle?.name ??
          (brief.status === "awaiting_angle" ? "Choose an angle" : brief.title);

        return (
          <motion.div
            key={brief.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.4, ease: EASE_PREMIUM }}
            className="dash-card dash-card-interactive flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="app-chip text-[11px] font-semibold text-[#f59e0b]">
                  Brief
                </span>
                {goal && (
                  <span className="text-[11px] text-white/45">{goal}</span>
                )}
                {platform && (
                  <span className="app-chip text-[11px]">{platform}</span>
                )}
              </div>
              <h3 className="mt-2 font-display text-base font-semibold text-white">
                {angleName}
              </h3>
              <p className="mt-1 text-xs text-white/42">
                {formatAnalysisDateTime(brief.created_at)}
                {brief.status === "processing" && " · Generating…"}
                {brief.status === "awaiting_angle" && " · Awaiting angle selection"}
                {brief.status === "failed" && " · Failed"}
              </p>
            </div>
            <Link
              href={`/brief/${brief.id}`}
              className="btn-premium shrink-0 text-sm"
            >
              {brief.status === "awaiting_angle" ? "Choose Angle" : "View Brief"}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
