"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { AuthError } from "@/components/auth/auth-error";
import { AuthInput } from "@/components/auth/auth-input";
import { SubmitButton } from "@/components/auth/submit-button";
import type { WorkspaceActionResult } from "@/lib/workspaces/actions";
import type { Workspace } from "@/lib/types/workspace";
import { stepTransition } from "./onboarding-shell";

type StepCreateWorkspaceProps = {
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  onSubmit: (name: string, brandUrl: string) => Promise<WorkspaceActionResult>;
  onSuccess: (workspace: Workspace) => void;
};

const EXAMPLE_URLS = ["glowskin.co", "peaknutrition.com", "velourskin.co"];

export function StepCreateWorkspace({
  title = "Create your first workspace",
  subtitle = "CreativeIQ will crawl your website to understand your product, positioning, and target customer.",
  submitLabel = "Create workspace",
  onSubmit,
  onSuccess,
}: StepCreateWorkspaceProps) {
  const [name, setName] = useState("");
  const [brandUrl, setBrandUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    const result = await onSubmit(name, brandUrl);

    if (!result.success) {
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      setError(result.error);
      setLoading(false);
      return;
    }

    onSuccess(result.workspace);
  }

  return (
    <motion.div
      key="create"
      {...stepTransition}
      className="rounded-2xl border border-white/80 bg-white/90 p-8 shadow-[0_24px_64px_rgba(110,58,255,0.08),0_8px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl"
    >
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {subtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Brand name"
          name="brandName"
          placeholder="Velour Skin Co."
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          autoFocus
          required
        />

        <div className="space-y-1.5">
          <AuthInput
            label="Brand website URL"
            name="brandUrl"
            type="url"
            placeholder="https://yourbrand.com"
            value={brandUrl}
            onChange={(e) => setBrandUrl(e.target.value)}
            error={fieldErrors.brandUrl}
            required
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {EXAMPLE_URLS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setBrandUrl(example)}
                className="rounded-md bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-text-muted transition-colors hover:bg-accent-light hover:text-accent"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <AuthError message={error} />
        <SubmitButton loading={loading}>{submitLabel}</SubmitButton>
      </form>
    </motion.div>
  );
}
