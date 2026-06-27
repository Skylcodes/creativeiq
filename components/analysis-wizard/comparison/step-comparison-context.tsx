"use client";

import { COMPARISON_PLATFORMS } from "@/lib/analyses/constants";

function PlatformIcon({ icon }: { icon: string }) {
  const cls = "h-6 w-6";
  switch (icon) {
    case "organic":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="8" stroke="#6947ff" strokeWidth="1.5" />
          <path d="M8 12C8 9.5 10 8 12 8C14 8 16 9.5 16 12" stroke="#6947ff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "tiktok":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M14 4V14.5C14 16.985 12.209 19 10 19C7.791 19 6 17.015 6 14.5C6 11.985 7.791 10 10 10V13C9.172 13 8.5 13.672 8.5 14.5C8.5 15.328 9.172 16 10 16C10.828 16 11.5 15.328 11.5 14.5V4H14Z" fill="#6947ff" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="3" stroke="#6947ff" strokeWidth="1.5" />
        </svg>
      );
  }
}

type StepComparisonContextProps = {
  landingPageUrl: string;
  platform: string;
  platformOther: string;
  landingError: string | null;
  onLandingChange: (url: string) => void;
  onLandingError: (err: string | null) => void;
  onPlatformSelect: (id: string) => void;
  onPlatformOtherChange: (value: string) => void;
};

export function StepComparisonContext({
  landingPageUrl,
  platform,
  platformOther,
  landingError,
  onLandingChange,
  onLandingError,
  onPlatformSelect,
  onPlatformOtherChange,
}: StepComparisonContextProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-[1.75rem]">
        Confirm shared context
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
        All variants share the same landing page and platform. One context
        applies to the entire comparison.
      </p>

      <div className="mt-8 space-y-6">
        <div className="field-stack">
          <label className="field-label">Landing page URL</label>
          <input
            type="url"
            value={landingPageUrl}
            onChange={(e) => {
              onLandingChange(e.target.value);
              onLandingError(null);
            }}
            placeholder="https://yourbrand.com/landing-page"
            className={`input-field text-sm ${
              landingError ? "border-[#ef4444] focus:border-[#ef4444]" : ""
            }`}
          />
          {landingError && (
            <p className="mt-2 text-sm text-[#ef4444]" role="alert">
              {landingError}
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-text-primary">Platform</p>
          <p className="mt-1 text-xs text-text-muted">
            Where all variants will run
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMPARISON_PLATFORMS.map((p) => {
              const selected = platform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPlatformSelect(p.id)}
                  className={`p-4 text-left transition-all ${
                    selected
                      ? "premium-card premium-card-accent"
                      : "premium-card premium-card-interactive"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PlatformIcon icon={p.icon} />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{p.label}</p>
                      <p className="text-[11px] text-text-muted">{p.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {platform === "other" && (
            <input
              type="text"
              value={platformOther}
              onChange={(e) => onPlatformOtherChange(e.target.value)}
              placeholder="Describe your platform..."
              className="input-field mt-4 text-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}
