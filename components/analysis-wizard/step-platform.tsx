"use client";

import { ANALYSIS_PLATFORMS } from "@/lib/analyses/constants";

function PlatformIcon({ icon }: { icon: string }) {
  const cls = "h-6 w-6";

  switch (icon) {
    case "meta_feed":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="3"
            stroke="#6947ff"
            strokeWidth="1.5"
          />
          <circle cx="8" cy="10" r="1.5" fill="#6947ff" />
          <path
            d="M3 15L8 11L12 14L17 9L21 12"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "meta_stories":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="7"
            y="3"
            width="10"
            height="18"
            rx="3"
            stroke="#6947ff"
            strokeWidth="1.5"
          />
          <path
            d="M10 8H14M10 12H14"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "tiktok":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M14 4V14.5C14 16.985 12.209 19 10 19C7.791 19 6 17.015 6 14.5C6 11.985 7.791 10 10 10V13C9.172 13 8.5 13.672 8.5 14.5C8.5 15.328 9.172 16 10 16C10.828 16 11.5 15.328 11.5 14.5V4H14Z"
            fill="#6947ff"
          />
        </svg>
      );
    case "youtube":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="2"
            y="6"
            width="20"
            height="12"
            rx="3"
            stroke="#6947ff"
            strokeWidth="1.5"
          />
          <path d="M11 9L15 12L11 15V9Z" fill="#6947ff" />
        </svg>
      );
    case "instagram":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="5"
            stroke="#6947ff"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="12" r="3.5" stroke="#6947ff" strokeWidth="1.5" />
          <circle cx="17" cy="7" r="1" fill="#6947ff" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="8" stroke="#6947ff" strokeWidth="1.5" />
          <path
            d="M12 8V16M8 12H16"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

type StepPlatformProps = {
  selected: string[];
  platformOther: string;
  onToggle: (id: string) => void;
  onPlatformOtherChange: (value: string) => void;
};

export function StepPlatform({
  selected,
  platformOther,
  onToggle,
  onPlatformOtherChange,
}: StepPlatformProps) {
  const showOtherInput = selected.includes("other");

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-[1.75rem]">
        Where is this ad running?
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
        Select every platform this creative targets. Our agents calibrate hook
        length, format, and CTA expectations based on your selection.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ANALYSIS_PLATFORMS.map((platform) => {
          const isSelected = selected.includes(platform.id);

          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => onToggle(platform.id)}
              className={`group relative flex flex-col items-start p-5 text-left transition-all duration-300 ${
                isSelected
                  ? "premium-card premium-card-accent ring-2 ring-accent"
                  : "premium-card premium-card-interactive"
              }`}
            >
              <div
                className={`icon-badge mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                  isSelected
                    ? "bg-accent/10"
                    : "surface-inset group-hover:bg-accent/5"
                }`}
              >
                <PlatformIcon icon={platform.icon} />
              </div>
              <span className="font-display text-base font-semibold text-text-primary">
                {platform.label}
              </span>
              <span className="mt-1 text-xs leading-relaxed text-text-secondary">
                {platform.description}
              </span>
              {isSelected && (
                <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M2.5 6L5 8.5L9.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showOtherInput && (
        <div className="mt-4">
          <label
            htmlFor="platform-other"
            className="text-sm font-medium text-text-primary"
          >
            Describe your platform
          </label>
          <input
            id="platform-other"
            type="text"
            value={platformOther}
            onChange={(e) => onPlatformOtherChange(e.target.value)}
            placeholder="e.g. Pinterest, Snapchat, Podcast pre-roll..."
            className="input-field mt-2 px-4 py-3 text-sm"
          />
        </div>
      )}
    </div>
  );
}
