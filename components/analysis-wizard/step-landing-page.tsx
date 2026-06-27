"use client";

import { validateLandingPageUrl } from "@/lib/analyses/validation";

type StepLandingPageProps = {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  onError: (error: string | null) => void;
};

export function StepLandingPage({
  value,
  onChange,
  error,
  onError,
}: StepLandingPageProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-[1.75rem]">
        Confirm your landing page
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
        This is where your ad traffic lands. Advara will crawl and score
        this page as part of your full funnel analysis — message match, CTA
        clarity, and conversion friction.
      </p>

      <div className="mt-8">
        <div className="field-stack">
          <label htmlFor="landing-url" className="field-label">
            Landing page URL
          </label>
          <input
            id="landing-url"
            type="url"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (error) onError(null);
            }}
            onBlur={() => onError(validateLandingPageUrl(value))}
            placeholder="https://yourbrand.com"
            className={`input-field text-sm ${
              error ? "border-[#ef4444]/50 focus:border-[#ef4444]" : ""
            }`}
          />
          {error && (
            <p className="mt-2 text-sm text-[#ef4444]" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="surface-inset mt-5 flex gap-3 px-4 py-3.5">
        <svg
          className="mt-0.5 shrink-0"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <circle cx="8" cy="8" r="6.5" stroke="#6947ff" strokeWidth="1.2" />
          <path
            d="M8 5V8.5M8 11H8.01"
            stroke="#6947ff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-sm leading-relaxed text-text-secondary">
          <span className="font-medium text-text-primary">
            Running a product-specific ad?
          </span>{" "}
          Update this to your exact landing page — not just your homepage — for
          the most accurate funnel score.
        </p>
      </div>
    </div>
  );
}

export function isLandingStepValid(value: string): boolean {
  return validateLandingPageUrl(value) === null;
}
