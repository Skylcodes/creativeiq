"use client";

import {
  COMPARISON_PLATFORMS,
  COMPARISON_TEST_DIMENSIONS,
} from "@/lib/analyses/constants";
import { getCreativeGoalLabel } from "@/lib/analyses/creative-goals";
import type { CreativeGoal } from "@/lib/analyses/creative-goals";
import type { ComparisonTestDimension } from "@/lib/types/comparison";
import type { VariantSlotState } from "./types";

type StepComparisonReviewProps = {
  creativeGoal: CreativeGoal;
  testDimensions: ComparisonTestDimension[];
  variants: VariantSlotState[];
  platform: string;
  platformOther: string;
  landingPageUrl: string;
};

function dimensionLabels(ids: ComparisonTestDimension[]): string {
  return ids
    .map((id) => COMPARISON_TEST_DIMENSIONS.find((d) => d.id === id)?.label ?? id)
    .join(", ");
}

function platformLabel(platform: string, platformOther: string): string {
  if (platform === "other" && platformOther.trim()) return platformOther.trim();
  return COMPARISON_PLATFORMS.find((p) => p.id === platform)?.label ?? platform;
}

export function StepComparisonReview({
  creativeGoal,
  testDimensions,
  variants,
  platform,
  platformOther,
  landingPageUrl,
}: StepComparisonReviewProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-[1.75rem]">
        Review and launch
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
        Confirm your comparison setup before our agents evaluate each variant
        head to head.
      </p>

      <div className="mt-8 space-y-4">
        <div className="dashboard-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-muted">
            Creative goal
          </p>
          <p className="mt-1 text-sm font-medium text-text-primary">
            {getCreativeGoalLabel(creativeGoal)}
          </p>
        </div>

        <div className="dashboard-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-muted">
            Testing
          </p>
          <p className="mt-1 text-sm font-medium text-text-primary">
            {dimensionLabels(testDimensions)}
          </p>
        </div>

        <div className="dashboard-panel p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-muted">
            Platform · Landing page
          </p>
          <p className="mt-1 text-sm font-medium text-text-primary">
            {platformLabel(platform, platformOther)}
          </p>
          <p className="mt-1 truncate text-xs text-text-secondary">{landingPageUrl}</p>
        </div>

        <div className="dashboard-panel p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-text-muted">
            {variants.length} variants
          </p>
          <div className="space-y-3">
            {variants.map((v, i) => {
              const name = v.label.trim() || `Variant ${i + 1}`;
              const preview =
                v.creative.imagePreview ??
                v.creative.videoThumbnail ??
                null;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="surface-inset h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-text-muted">
                        {v.creativeTab === "script" ? "TXT" : "—"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">{name}</p>
                    <p className="text-xs capitalize text-text-muted">{v.creativeTab}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
