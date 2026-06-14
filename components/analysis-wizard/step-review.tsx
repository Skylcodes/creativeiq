"use client";

import { ANALYSIS_PLATFORMS } from "@/lib/analyses/constants";
import { getCreativeGoalLabel } from "@/lib/analyses/creative-goals";
import type { CreativeGoal } from "@/lib/analyses/creative-goals";
import type { CreativeTab, WizardCreativeState } from "./types";

type StepReviewProps = {
  creativeGoal: CreativeGoal;
  platforms: string[];
  platformOther: string;
  creativeTab: CreativeTab;
  creative: WizardCreativeState;
  landingPageUrl: string;
};

function formatPlatforms(platforms: string[], platformOther: string): string {
  return platforms
    .map((id) => {
      if (id === "other" && platformOther.trim()) return platformOther.trim();
      return ANALYSIS_PLATFORMS.find((p) => p.id === id)?.label ?? id;
    })
    .join(", ");
}

function formatCreativeType(tab: CreativeTab): string {
  if (tab === "image") return "Image upload";
  if (tab === "video") return "Video upload";
  return "Ad script";
}

function formatCreativeDetail(
  tab: CreativeTab,
  creative: WizardCreativeState
): string {
  if (tab === "image") return creative.imageFile?.name ?? "—";
  if (tab === "video") return creative.videoFile?.name ?? "—";
  const preview = creative.scriptContent.trim();
  return preview.length > 80 ? `${preview.slice(0, 80)}…` : preview;
}

export function StepReview({
  creativeGoal,
  platforms,
  platformOther,
  creativeTab,
  creative,
  landingPageUrl,
}: StepReviewProps) {
  const rows = [
    {
      label: "Creative goal",
      value: getCreativeGoalLabel(creativeGoal),
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <circle cx="9" cy="9" r="6.5" stroke="#6e3aff" strokeWidth="1.3" />
          <path d="M9 5V9L11.5 11.5" stroke="#6e3aff" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Platforms",
      value: formatPlatforms(platforms, platformOther),
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <rect x="2" y="3" width="14" height="12" rx="2" stroke="#6e3aff" strokeWidth="1.3" />
          <path d="M2 7H16" stroke="#6e3aff" strokeWidth="1.3" />
        </svg>
      ),
    },
    {
      label: "Creative type",
      value: formatCreativeType(creativeTab),
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <rect x="3" y="4" width="12" height="10" rx="1.5" stroke="#6e3aff" strokeWidth="1.3" />
          <path d="M7 8L10 9.5L7 11V8Z" fill="#6e3aff" fillOpacity="0.3" stroke="#6e3aff" strokeWidth="1" />
        </svg>
      ),
    },
    {
      label: "Creative",
      value: formatCreativeDetail(creativeTab, creative),
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M4 14L7 8L10 11L14 5" stroke="#6e3aff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Landing page",
      value: landingPageUrl,
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <circle cx="9" cy="9" r="6.5" stroke="#6e3aff" strokeWidth="1.3" />
          <path d="M6 9H12M9 6V12" stroke="#6e3aff" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-[1.75rem]">
        Review and launch
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
        Everything looks good? Launch your funnel intelligence analysis — 5 AI
        agents will stress-test your full funnel end to end.
      </p>

      <div className="mt-8 space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start gap-4 rounded-2xl bg-white/80 px-5 py-4 ring-1 ring-black/[0.04]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/8">
              {row.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {row.label}
              </p>
              <p className="mt-1 break-all text-sm font-medium text-text-primary">
                {row.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {(creativeTab === "image" && creative.imagePreview) ||
      (creativeTab === "video" && creative.videoThumbnail) ? (
        <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-black/[0.04]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              creativeTab === "image"
                ? creative.imagePreview!
                : creative.videoThumbnail!
            }
            alt="Creative preview"
            className="max-h-40 w-full object-cover"
          />
        </div>
      ) : null}
    </div>
  );
}
