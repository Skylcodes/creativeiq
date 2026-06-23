"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { stepTransition } from "./onboarding-shell";

type StepManualBrandProps = {
  workspaceId: string;
  workspaceName: string;
  errorMessage: string | null;
  onComplete: () => void;
};

export function StepManualBrand({
  workspaceId,
  workspaceName,
  errorMessage,
  onComplete,
}: StepManualBrandProps) {
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/brand-profile/manual`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        }
      );

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Could not save your brand description.");
        setIsSubmitting(false);
        return;
      }

      onComplete();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      key="manual"
      {...stepTransition}
      className="premium-card noise-overlay rounded-2xl p-8 md:p-10"
    >
      <div className="icon-badge mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
          <path
            d="M13 4L14.5 9.5H20L15.5 13L17 18.5L13 15.5L9 18.5L10.5 13L6 9.5H11.5L13 4Z"
            stroke="#d97706"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2 className="text-center font-display text-2xl font-semibold tracking-tight text-text-primary">
        Tell us about {workspaceName}
      </h2>

      <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-text-secondary">
        {errorMessage ??
          "We couldn't fully read your website. Describe your product, target customer, and what makes your brand different — this powers every analysis you run."}
      </p>

      <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-lg">
        <label htmlFor="brand-description" className="sr-only">
          Brand description
        </label>
        <textarea
          id="brand-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={7}
          placeholder="Example: We sell premium cold-press skincare for women 30–50 who want clean ingredients without luxury markup. Our hero product is a $48 vitamin C serum. We compete on transparency and dermatologist-backed formulas…"
          className="input-field w-full resize-none text-sm leading-relaxed"
        />
        <p className="mt-2 text-xs text-text-muted">
          Minimum 50 characters · Be specific about product, audience, and positioning
        </p>

        {error && (
          <p className="mt-3 text-sm text-[#ef4444]" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-center">
          <button
            type="submit"
            disabled={isSubmitting || description.trim().length < 50}
            className="btn-premium min-w-[200px] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Saving profile…" : "Continue"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
