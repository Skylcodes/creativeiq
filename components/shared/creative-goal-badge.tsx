"use client";

import {
  getCreativeGoalLabel,
  getCreativeGoalScoreContext,
  normalizeCreativeGoal,
} from "@/lib/analyses/creative-goals";
import type { CreativeGoal } from "@/lib/analyses/creative-goals";

type CreativeGoalBadgeProps = {
  goal: CreativeGoal | string | null | undefined;
  showContext?: boolean;
  className?: string;
};

export function CreativeGoalBadge({
  goal,
  showContext = false,
  className = "",
}: CreativeGoalBadgeProps) {
  const normalized = normalizeCreativeGoal(goal ?? undefined);
  const label = getCreativeGoalLabel(normalized);
  const context = getCreativeGoalScoreContext(normalized);

  return (
    <div className={className}>
      <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
        Goal: {label}
      </span>
      {showContext && (
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {context}
        </p>
      )}
    </div>
  );
}
