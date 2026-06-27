"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createBrief, resetBriefForRetry } from "@/lib/briefs/actions";
import { useBilling } from "@/components/billing/billing-provider";
import {
  AD_BUDGETS,
  AUDIENCE_TEMPERATURES,
  BRIEF_GOALS,
  BRIEF_PLATFORMS,
  BRIEF_WIZARD_STEPS,
  PRODUCTION_RESOURCES,
  briefPlatformLabels,
  getDurationOptionsForPlatforms,
} from "@/lib/briefs/constants";
import type { BriefWizardInput } from "@/lib/types/brief";
import type { Workspace } from "@/lib/types/workspace";
import { CancelModal } from "@/components/analysis-wizard/cancel-modal";
import { WizardStepIndicator } from "@/components/analysis-wizard/wizard-step-indicator";
import { BriefProgress } from "./brief-progress";
import { createInitialBriefState, type BriefWizardState } from "./types";

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
  multi = false,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-2xl p-5 text-left transition-all ${
        selected
          ? "dash-card border-accent/30 bg-accent/[0.08] ring-1 ring-accent/25"
          : "dash-card dash-card-interactive"
      }`}
    >
      {multi && selected && (
        <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
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
      <p className="font-semibold text-white">{title}</p>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-white/55">
          {description}
        </p>
      )}
    </button>
  );
}

export function BriefWizard({ workspace, prefill }: BriefWizardProps) {
  const router = useRouter();
  const [state, setState] = useState<BriefWizardState>(() =>
    createInitialBriefState(workspace.brand_url, prefill),
  );
  const [phase, setPhase] = useState<WizardPhase>("wizard");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [briefId, setBriefId] = useState<string | null>(null);
  const { ensureCanAct, showBlocked } = useBilling();

  const durationOptions = getDurationOptionsForPlatforms(state.platforms);

  const canContinue =
    state.step === 1
      ? Boolean(state.goal)
      : state.step === 2
        ? state.platforms.length > 0 && Boolean(state.audienceTemperature)
        : state.step === 3
          ? state.angleMode === "surprise_me" ||
            state.angleIdea.trim().length >= 10
          : state.step === 4
            ? Boolean(
                state.productionResource &&
                state.adBudget &&
                state.creativeDuration,
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
    platforms: state.platforms,
    audienceTemperature:
      state.audienceTemperature as BriefWizardInput["audienceTemperature"],
    audienceNotes: state.audienceNotes.trim() || undefined,
    angleMode: state.angleMode,
    angleIdea: state.angleIdea.trim() || undefined,
    productionResource:
      state.productionResource as BriefWizardInput["productionResource"],
    adBudget: state.adBudget as BriefWizardInput["adBudget"],
    creativeDuration: state.creativeDuration,
    landingPageUrl: state.landingPageUrl.trim() || workspace.brand_url || "",
  });

  const handleGenerate = async () => {
    if (!ensureCanAct("creative_briefs")) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await createBrief({
        workspaceId: workspace.id,
        input: buildInput(),
      });
      if (!result.success) {
        if (result.blocked) showBlocked(result.blocked);
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
  const platformLabel = briefPlatformLabels({ platforms: state.platforms });

  return (
    <>
      <div className="relative flex min-h-full flex-col">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 ambient-bg opacity-20" />
          <div className="absolute inset-0 grid-pattern opacity-25" />
        </div>

        <header className="relative flex shrink-0 items-center justify-between px-5 py-4 md:px-8">
          <div className="w-20">
            {state.step > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="wizard-ghost-btn inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M9 3L4 7L9 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back
              </button>
            )}
          </div>
          <WizardStepIndicator
            currentStep={state.step}
            steps={[...BRIEF_WIZARD_STEPS]}
          />
          <div className="flex w-20 justify-end">
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="wizard-ghost-btn flex h-9 w-9 items-center justify-center rounded-full"
              aria-label="Cancel"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <path
                  d="M4 4L12 12M12 4L4 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className="relative mx-auto w-full max-w-5xl flex-1 px-5 pb-8 pt-2 md:px-8 md:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.step}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {state.step === 1 && (
                <div>
                  <h2 className="font-display text-2xl font-semibold text-text-primary md:text-[1.75rem]">
                    What is your goal for this creative?
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    This shapes everything — a retargeting brief looks nothing
                    like cold traffic.
                  </p>
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {BRIEF_GOALS.map((g) => (
                      <SelectCard
                        key={g.id}
                        selected={state.goal === g.id}
                        onClick={() => setState((p) => ({ ...p, goal: g.id }))}
                        title={g.label}
                        description={g.description}
                      />
                    ))}
                  </div>
                </div>
              )}

              {state.step === 2 && (
                <div>
                  <h2 className="font-display text-2xl font-semibold text-text-primary md:text-[1.75rem]">
                    Who are you trying to reach?
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    Select every platform this creative targets. Platform and
                    audience temperature calibrate hook length, format, and CTA.
                  </p>
                  <div className="mt-8 space-y-8">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Platform
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {BRIEF_PLATFORMS.map((p) => (
                          <SelectCard
                            key={p.id}
                            multi
                            selected={state.platforms.includes(p.id)}
                            onClick={() =>
                              setState((prev) => {
                                const platforms = prev.platforms.includes(p.id)
                                  ? prev.platforms.filter((id) => id !== p.id)
                                  : [...prev.platforms, p.id];
                                return {
                                  ...prev,
                                  platforms,
                                  creativeDuration: "",
                                };
                              })
                            }
                            title={p.label}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Audience temperature
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {AUDIENCE_TEMPERATURES.map((t) => (
                          <SelectCard
                            key={t.id}
                            selected={state.audienceTemperature === t.id}
                            onClick={() =>
                              setState((prev) => ({
                                ...prev,
                                audienceTemperature: t.id,
                              }))
                            }
                            title={t.label}
                            description={t.description}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="field-stack">
                      <label className="field-label">
                        Audience notes{" "}
                        <span className="field-label-muted">(optional)</span>
                      </label>
                      <textarea
                        value={state.audienceNotes}
                        onChange={(e) =>
                          setState((p) => ({
                            ...p,
                            audienceNotes: e.target.value,
                          }))
                        }
                        placeholder='e.g. "Women 25–40 interested in skincare" or "Cart abandoners last 30 days"'
                        rows={3}
                        className="input-field text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {state.step === 3 && (
                <div>
                  <h2 className="font-display text-2xl font-semibold text-text-primary md:text-[1.75rem]">
                    Do you have an angle in mind?
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    Optional — brain dump an idea or let AI propose three
                    directions.
                  </p>
                  <div className="premium-tabs mt-6">
                    {(["user_idea", "surprise_me"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          setState((p) => ({ ...p, angleMode: mode }))
                        }
                        className={`premium-tab relative flex-1 ${
                          state.angleMode === mode ? "premium-tab-active" : ""
                        }`}
                      >
                        {state.angleMode === mode && (
                          <div className="premium-tab-indicator" />
                        )}
                        <span className="relative">
                          {mode === "user_idea"
                            ? "I have an angle idea"
                            : "Surprise me — AI decides"}
                        </span>
                      </button>
                    ))}
                  </div>
                  {state.angleMode === "user_idea" && (
                    <textarea
                      value={state.angleIdea}
                      onChange={(e) =>
                        setState((p) => ({ ...p, angleIdea: e.target.value }))
                      }
                      placeholder='e.g. "Founder story about why I started this brand" or "Before/after transformation UGC style"'
                      rows={6}
                      className="input-field min-h-[9.5rem] text-sm leading-relaxed"
                    />
                  )}
                  {state.angleMode === "surprise_me" && (
                    <p className="mt-4 app-inset rounded-xl px-4 py-3 text-sm text-white/55">
                      We&apos;ll generate 3 distinct angle options for you to
                      choose from before building the full brief.
                    </p>
                  )}
                </div>
              )}

              {state.step === 4 && (
                <div>
                  <h2 className="font-display text-2xl font-semibold text-text-primary md:text-[1.75rem]">
                    Production context
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    Shapes what the brief recommends you film and how.
                  </p>
                  <div className="mt-8 space-y-8">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Production resources
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {PRODUCTION_RESOURCES.map((r) => (
                          <SelectCard
                            key={r.id}
                            selected={state.productionResource === r.id}
                            onClick={() =>
                              setState((p) => ({
                                ...p,
                                productionResource: r.id,
                              }))
                            }
                            title={r.label}
                            description={r.description}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Ad budget for this creative
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {AD_BUDGETS.map((b) => (
                          <SelectCard
                            key={b.id}
                            selected={state.adBudget === b.id}
                            onClick={() =>
                              setState((p) => ({ ...p, adBudget: b.id }))
                            }
                            title={b.label}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Creative length / format
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {durationOptions.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() =>
                              setState((p) => ({
                                ...p,
                                creativeDuration: d.id,
                              }))
                            }
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${state.creativeDuration === d.id ? "btn-premium !rounded-full !px-4 !py-2 !text-sm !shadow-none" : "app-chip hover:border-white/20 hover:bg-white/[0.08] hover:text-white/80"}`}
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
                  <h2 className="font-display text-2xl font-semibold text-text-primary md:text-[1.75rem]">
                    Review and generate
                  </h2>
                  <div className="mt-8 space-y-3 dash-card p-5">
                    <p className="text-sm">
                      <span className="text-text-muted">Goal:</span>{" "}
                      <span className="font-medium">{goalLabel}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-text-muted">Platform:</span>{" "}
                      <span className="font-medium">{platformLabel}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-text-muted">Audience:</span>{" "}
                      <span className="font-medium">
                        {
                          AUDIENCE_TEMPERATURES.find(
                            (t) => t.id === state.audienceTemperature,
                          )?.label
                        }
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-text-muted">Angle:</span>{" "}
                      <span className="font-medium">
                        {state.angleMode === "surprise_me"
                          ? "AI will propose 3 options"
                          : state.angleIdea.slice(0, 80) +
                            (state.angleIdea.length > 80 ? "…" : "")}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-text-muted">Production:</span>{" "}
                      <span className="font-medium">
                        {
                          PRODUCTION_RESOURCES.find(
                            (r) => r.id === state.productionResource,
                          )?.label
                        }{" "}
                        ·{" "}
                        {
                          durationOptions.find(
                            (d) => d.id === state.creativeDuration,
                          )?.label
                        }
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10">
            {submitError && (
              <p
                className="mb-4 text-center text-sm text-[#ef4444]"
                role="alert"
              >
                {submitError}
              </p>
            )}
            {state.step < 5 ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canContinue}
                  className="btn-premium min-w-[200px] disabled:cursor-not-allowed disabled:opacity-40"
                >
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
                  Our AI will generate a complete production-ready creative
                  brief tailored to your brand, audience, and goals. Ready in
                  under 2 minutes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <CancelModal
        open={showCancelModal}
        onConfirm={() => router.push("/brief")}
        onCancel={() => setShowCancelModal(false)}
      />
    </>
  );
}
