"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createBrief, resetBriefForRetry } from "@/lib/briefs/actions";
import {
  AD_BUDGETS,
  AUDIENCE_TEMPERATURES,
  BRIEF_GOALS,
  BRIEF_PLATFORMS,
  BRIEF_WIZARD_STEPS,
  PRODUCTION_RESOURCES,
  getDurationOptions,
} from "@/lib/briefs/constants";
import type { BriefWizardInput } from "@/lib/types/brief";
import type { Workspace } from "@/lib/types/workspace";
import { CancelModal } from "@/components/analysis-wizard/cancel-modal";
import { WizardStepIndicator } from "@/components/analysis-wizard/wizard-step-indicator";
import { BriefProgress } from "./brief-progress";
import {
  createInitialBriefState,
  type BriefWizardState,
} from "./types";

type BriefWizardProps = {
  workspace: Workspace;
  prefill?: import("./types").BriefWizardPrefill;
};

type WizardPhase = "wizard" | "progress";

const stepVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

function SelectCard({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl p-5 text-left transition-all ${
        selected
          ? "bg-white shadow-[0_8px_28px_rgba(110,58,255,0.12)] ring-2 ring-accent/30"
          : "bg-white/70 ring-1 ring-black/[0.06] hover:ring-accent/20"
      }`}
    >
      <p className="font-semibold text-text-primary">{title}</p>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">{description}</p>
      )}
    </button>
  );
}

export function BriefWizard({ workspace, prefill }: BriefWizardProps) {
  const router = useRouter();
  const [state, setState] = useState<BriefWizardState>(() =>
    createInitialBriefState(workspace.brand_url, prefill)
  );
  const [phase, setPhase] = useState<WizardPhase>("wizard");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [briefId, setBriefId] = useState<string | null>(null);

  const durationOptions = state.platform
    ? getDurationOptions(state.platform)
    : [];

  const canContinue =
    state.step === 1
      ? Boolean(state.goal)
      : state.step === 2
        ? Boolean(state.platform && state.audienceTemperature)
        : state.step === 3
          ? state.angleMode === "surprise_me" ||
            state.angleIdea.trim().length >= 10
          : state.step === 4
            ? Boolean(
                state.productionResource &&
                  state.adBudget &&
                  state.creativeDuration
              )
            : true;

  const goNext = () => {
    if (state.step < 5) {
      setState((prev) => ({
        ...prev,
        step: (prev.step + 1) as BriefWizardState["step"],
      }));
    }
  };

  const goBack = () => {
    if (state.step > 1) {
      setState((prev) => ({
        ...prev,
        step: (prev.step - 1) as BriefWizardState["step"],
      }));
    }
  };

  const triggerRun = async (id: string) => {
    try {
      await fetch(`/api/briefs/${id}/run`, { method: "POST" });
    } catch {
      // Polling surfaces failures
    }
  };

  const buildInput = (): BriefWizardInput => ({
    goal: state.goal as BriefWizardInput["goal"],
    platform: state.platform,
    audienceTemperature: state.audienceTemperature as BriefWizardInput["audienceTemperature"],
    audienceNotes: state.audienceNotes.trim() || undefined,
    angleMode: state.angleMode,
    angleIdea: state.angleIdea.trim() || undefined,
    productionResource: state.productionResource as BriefWizardInput["productionResource"],
    adBudget: state.adBudget as BriefWizardInput["adBudget"],
    creativeDuration: state.creativeDuration,
    landingPageUrl: state.landingPageUrl.trim() || workspace.brand_url || "",
  });

  const handleGenerate = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await createBrief({
        workspaceId: workspace.id,
        input: buildInput(),
      });
      if (!result.success) {
        setSubmitError(result.error);
        setIsSubmitting(false);
        return;
      }
      setBriefId(result.brief.id);
      setPhase("progress");
      void triggerRun(result.brief.id);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProgressComplete = useCallback(() => {
    if (briefId) router.push(`/brief/${briefId}`);
  }, [briefId, router]);

  const handleAwaitingAngle = useCallback(() => {
    if (briefId) router.push(`/brief/${briefId}`);
  }, [briefId, router]);

  const handleRetry = useCallback(async () => {
    if (!briefId) return;
    const result = await resetBriefForRetry(briefId);
    if (result.success) void triggerRun(briefId);
  }, [briefId]);

  if (phase === "progress" && briefId) {
    return (
      <BriefProgress
        briefId={briefId}
        onComplete={handleProgressComplete}
        onAwaitingAngle={handleAwaitingAngle}
        onRetry={handleRetry}
      />
    );
  }

  const goalLabel = BRIEF_GOALS.find((g) => g.id === state.goal)?.label;
  const platformLabel = BRIEF_PLATFORMS.find((p) => p.id === state.platform)?.label;

  return (
    <>
      <div className="relative flex min-h-full flex-col">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 mesh-gradient opacity-40" />
          <div className="absolute inset-0 grid-pattern opacity-25" />
        </div>

        <header className="relative flex shrink-0 items-center justify-between px-5 py-4 md:px-8">
          <div className="w-20">
            {state.step > 1 && (
              <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-text-secondary hover:bg-black/[0.04]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M9 3L4 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Back
              </button>
            )}
          </div>
          <WizardStepIndicator currentStep={state.step} steps={[...BRIEF_WIZARD_STEPS]} />
          <div className="flex w-20 justify-end">
            <button type="button" onClick={() => setShowCancelModal(true)} className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-black/[0.04]" aria-label="Cancel">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </div>
        </header>

        <div className="relative mx-auto w-full max-w-3xl flex-1 px-5 pb-8 pt-2 md:px-8 md:pb-12">
          <AnimatePresence mode="wait">
            <motion.div key={state.step} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              {state.step === 1 && (
                <div>
                  <h2 className="font-display text-2xl font-semibold text-text-primary md:text-[1.75rem]">What is your goal for this creative?</h2>
                  <p className="mt-2 text-sm text-text-secondary">This shapes everything — a retargeting brief looks nothing like cold traffic.</p>
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {BRIEF_GOALS.map((g) => (
                      <SelectCard key={g.id} selected={state.goal === g.id} onClick={() => setState((p) => ({ ...p, goal: g.id }))} title={g.label} description={g.description} />
                    ))}
                  </div>
                </div>
              )}

              {state.step === 2 && (
                <div>
                  <h2 className="font-display text-2xl font-semibold text-text-primary md:text-[1.75rem]">Who are you trying to reach?</h2>
                  <p className="mt-2 text-sm text-text-secondary">Platform and audience temperature calibrate hook length, format, and CTA.</p>
                  <div className="mt-8 space-y-8">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Platform</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {BRIEF_PLATFORMS.map((p) => (
                          <SelectCard key={p.id} selected={state.platform === p.id} onClick={() => setState((prev) => ({ ...prev, platform: p.id, creativeDuration: "" }))} title={p.label} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">Audience temperature</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {AUDIENCE_TEMPERATURES.map((t) => (
                          <SelectCard key={t.id} selected={state.audienceTemperature === t.id} onClick={() => setState((prev) => ({ ...prev, audienceTemperature: t.id }))} title={t.label} description={t.description} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-text-primary">Audience notes <span className="text-text-muted">(optional)</span></label>
                      <textarea
                        value={state.audienceNotes}
                        onChange={(e) => setState((p) => ({ ...p, audienceNotes: e.target.value }))}
                        placeholder='e.g. "Women 25–40 interested in skincare" or "Cart abandoners last 30 days"'
                        rows={3}
                        className="mt-2 w-full resize-none rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-sm outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10"
                      />
                    </div>
                  </div>
                </div>
              )}

              {state.step === 3 && (
                <div>
                  <h2 className="font-display text-2xl font-semibold text-text-primary md:text-[1.75rem]">Do you have an angle in mind?</h2>
                  <p className="mt-2 text-sm text-text-secondary">Optional — brain dump an idea or let AI propose three directions.</p>
                  <div className="mt-6 flex gap-2 rounded-xl bg-black/[0.03] p-1">
                    {(["user_idea", "surprise_me"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setState((p) => ({ ...p, angleMode: mode }))}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${state.angleMode === mode ? "bg-white text-text-primary shadow-sm" : "text-text-muted"}`}
                      >
                        {mode === "user_idea" ? "I have an angle idea" : "Surprise me — AI decides"}
                      </button>
                    ))}
                  </div>
                  {state.angleMode === "user_idea" && (
                    <textarea
                      value={state.angleIdea}
                      onChange={(e) => setState((p) => ({ ...p, angleIdea: e.target.value }))}
                      placeholder='e.g. "Founder story about why I started this brand" or "Before/after transformation UGC style"'
                      rows={6}
                      className="mt-4 w-full resize-none rounded-2xl border border-black/[0.08] bg-white px-5 py-4 text-sm leading-relaxed outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
                    />
                  )}
                  {state.angleMode === "surprise_me" && (
                    <p className="mt-4 rounded-xl bg-accent/[0.06] px-4 py-3 text-sm text-text-secondary">
                      We&apos;ll generate 3 distinct angle options for you to choose from before building the full brief.
                    </p>
                  )}
                </div>
              )}

              {state.step === 4 && (
                <div>
                  <h2 className="font-display text-2xl font-semibold text-text-primary md:text-[1.75rem]">Production context</h2>
                  <p className="mt-2 text-sm text-text-secondary">Shapes what the brief recommends you film and how.</p>
                  <div className="mt-8 space-y-8">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Production resources</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {PRODUCTION_RESOURCES.map((r) => (
                          <SelectCard key={r.id} selected={state.productionResource === r.id} onClick={() => setState((p) => ({ ...p, productionResource: r.id }))} title={r.label} description={r.description} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">Ad budget for this creative</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {AD_BUDGETS.map((b) => (
                          <SelectCard key={b.id} selected={state.adBudget === b.id} onClick={() => setState((p) => ({ ...p, adBudget: b.id }))} title={b.label} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">Creative length / format</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {durationOptions.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setState((p) => ({ ...p, creativeDuration: d.id }))}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${state.creativeDuration === d.id ? "bg-accent text-white shadow-[0_4px_14px_rgba(110,58,255,0.25)]" : "bg-black/[0.04] text-text-secondary hover:text-text-primary"}`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {state.step === 5 && (
                <div>
                  <h2 className="font-display text-2xl font-semibold text-text-primary md:text-[1.75rem]">Review and generate</h2>
                  <div className="mt-8 space-y-3 rounded-2xl bg-white/80 p-5 ring-1 ring-black/[0.06]">
                    <p className="text-sm"><span className="text-text-muted">Goal:</span> <span className="font-medium">{goalLabel}</span></p>
                    <p className="text-sm"><span className="text-text-muted">Platform:</span> <span className="font-medium">{platformLabel}</span></p>
                    <p className="text-sm"><span className="text-text-muted">Audience:</span> <span className="font-medium">{AUDIENCE_TEMPERATURES.find((t) => t.id === state.audienceTemperature)?.label}</span></p>
                    <p className="text-sm"><span className="text-text-muted">Angle:</span> <span className="font-medium">{state.angleMode === "surprise_me" ? "AI will propose 3 options" : state.angleIdea.slice(0, 80) + (state.angleIdea.length > 80 ? "…" : "")}</span></p>
                    <p className="text-sm"><span className="text-text-muted">Production:</span> <span className="font-medium">{PRODUCTION_RESOURCES.find((r) => r.id === state.productionResource)?.label} · {durationOptions.find((d) => d.id === state.creativeDuration)?.label}</span></p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10">
            {submitError && <p className="mb-4 text-center text-sm text-[#ef4444]" role="alert">{submitError}</p>}
            {state.step < 5 ? (
              <div className="flex justify-center">
                <button type="button" onClick={goNext} disabled={!canContinue} className="btn-primary min-w-[200px] disabled:cursor-not-allowed disabled:opacity-40">
                  Continue
                </button>
              </div>
            ) : (
              <div className="text-center">
                <motion.button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isSubmitting}
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  className="group relative inline-flex w-full max-w-md items-center justify-center gap-3 rounded-2xl bg-linear-to-r from-[#d97706] to-[#f59e0b] px-10 py-5 text-lg font-semibold text-white shadow-[0_12px_48px_rgba(217,119,6,0.35)] disabled:opacity-60"
                >
                  {isSubmitting ? "Preparing brief..." : "Generate My Brief"}
                </motion.button>
                <p className="mx-auto mt-4 max-w-sm text-xs text-text-muted">
                  Our AI will generate a complete production-ready creative brief tailored to your brand, audience, and goals. Ready in under 2 minutes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <CancelModal open={showCancelModal} onConfirm={() => router.push("/brief")} onCancel={() => setShowCancelModal(false)} />
    </>
  );
}
