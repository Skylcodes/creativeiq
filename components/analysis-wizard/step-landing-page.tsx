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
        This is where your ad traffic lands. CreativeIQ will crawl and score
        this page as part of your full funnel analysis — message match, CTA
        clarity, and conversion friction.
      </p>

      <div className="mt-8">
        <label htmlFor="landing-url" className="text-sm font-medium text-text-primary">
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
          className={`mt-2 w-full rounded-xl border bg-white px-4 py-3.5 text-sm text-text-primary outline-none transition-all placeholder:text-text-muted focus:ring-4 ${
            error
              ? "border-[#ef4444]/50 focus:border-[#ef4444] focus:ring-[#ef4444]/10"
              : "border-black/[0.08] focus:border-accent/40 focus:ring-accent/10"
          }`}
        />
        {error && (
          <p className="mt-2 text-sm text-[#ef4444]" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="mt-5 flex gap-3 rounded-xl bg-accent/[0.04] px-4 py-3.5 ring-1 ring-accent/10">
        <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="6.5" stroke="#6e3aff" strokeWidth="1.2" />
          <path d="M8 5V8.5M8 11H8.01" stroke="#6e3aff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-sm leading-relaxed text-text-secondary">
          <span className="font-medium text-text-primary">Running a product-specific ad?</span>{" "}
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
