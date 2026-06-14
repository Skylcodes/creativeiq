"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createAnalysis, resetAnalysisForRetry } from "@/lib/analyses/actions";
import { uploadCreativeFile, uploadVideoThumbnail } from "@/lib/analyses/upload";
import { validateLandingPageUrl } from "@/lib/analyses/validation";
import type { Workspace } from "@/lib/types/workspace";
import type { HookLibraryEntry } from "@/lib/types/hook";
import { AnalysisProgress } from "./analysis-progress";
import { CancelModal } from "./cancel-modal";
import { isCreativeStepValid, StepCreative } from "./step-creative";
import { StepCreativeGoal } from "./step-creative-goal";
import { isLandingStepValid, StepLandingPage } from "./step-landing-page";
import { StepPlatform } from "./step-platform";
import { StepReview } from "./step-review";
import {
  createInitialWizardState,
  FUNNEL_WIZARD_STEPS,
  type WizardState,
} from "./types";
import { WizardStepIndicator } from "./wizard-step-indicator";

type NewAnalysisWizardProps = {
  workspace: Workspace;
  prefill?: {
    platform?: string;
    landingPageUrl?: string;
  };
  libraryHooks?: HookLibraryEntry[];
};

type WizardPhase = "wizard" | "progress";

const stepVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export function NewAnalysisWizard({ workspace, prefill, libraryHooks = [] }: NewAnalysisWizardProps) {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(() => {
    const initial = createInitialWizardState(
      prefill?.landingPageUrl || workspace.brand_url
    );
    if (prefill?.platform) {
      return {
        ...initial,
        platforms: [prefill.platform],
        step: 3 as WizardState["step"],
      };
    }
    return initial;
  });
  const [phase, setPhase] = useState<WizardPhase>("wizard");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [landingError, setLandingError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  const togglePlatform = (id: string) => {
    setState((prev) => {
      const exists = prev.platforms.includes(id);
      const platforms = exists
        ? prev.platforms.filter((p) => p !== id)
        : [...prev.platforms, id];
      return { ...prev, platforms };
    });
  };

  const canContinueStep1 = state.creativeGoal !== null;
  const canContinueStep2 =
    state.platforms.length > 0 &&
    (!state.platforms.includes("other") || state.platformOther.trim().length > 0);
  const canContinueStep3 = isCreativeStepValid(state.creativeTab, state.creative);
  const canContinueStep4 = isLandingStepValid(state.landingPageUrl);

  const canContinue =
    state.step === 1
      ? canContinueStep1
      : state.step === 2
        ? canContinueStep2
        : state.step === 3
          ? canContinueStep3
          : state.step === 4
            ? canContinueStep4
            : true;

  const goNext = () => {
    if (state.step === 4) {
      const err = validateLandingPageUrl(state.landingPageUrl);
      if (err) {
        setLandingError(err);
        return;
      }
    }
    if (state.step < 5) {
      setState((prev) => ({ ...prev, step: (prev.step + 1) as WizardState["step"] }));
    }
  };

  const goBack = () => {
    if (state.step > 1) {
      setState((prev) => ({ ...prev, step: (prev.step - 1) as WizardState["step"] }));
    }
  };

  const handleRunAnalysis = async () => {
    if (!state.creativeGoal) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      let creativeStoragePath: string | undefined;
      let creativeFileName: string | undefined;
      let creativeMimeType: string | undefined;
      let thumbnailUrl: string | undefined;

      if (state.creativeTab === "image" && state.creative.imageFile) {
        const upload = await uploadCreativeFile(state.creative.imageFile, "image");
        if ("error" in upload) {
          setSubmitError(upload.error);
          setIsSubmitting(false);
          return;
        }
        creativeStoragePath = upload.path;
        creativeFileName = state.creative.imageFile.name;
        creativeMimeType = state.creative.imageFile.type;
      }

      if (state.creativeTab === "video" && state.creative.videoFile) {
        const upload = await uploadCreativeFile(state.creative.videoFile, "video");
        if ("error" in upload) {
          setSubmitError(upload.error);
          setIsSubmitting(false);
          return;
        }
        creativeStoragePath = upload.path;
        creativeFileName = state.creative.videoFile.name;
        creativeMimeType = state.creative.videoFile.type;

        if (state.creative.videoThumbnail) {
          const thumb = await uploadVideoThumbnail(state.creative.videoThumbnail);
          if (!("error" in thumb)) {
            thumbnailUrl = thumb.url;
          }
        }
      }

      const result = await createAnalysis({
        workspaceId: workspace.id,
        creativeGoal: state.creativeGoal,
        platforms: state.platforms,
        platformOther: state.platformOther,
        creativeType: state.creativeTab,
        landingPageUrl: state.landingPageUrl,
        scriptContent:
          state.creativeTab === "script"
            ? state.creative.scriptContent
            : undefined,
        creativeStoragePath,
        creativeFileName,
        creativeMimeType,
        thumbnailUrl,
      });

      if (!result.success) {
        setSubmitError(result.error);
        setIsSubmitting(false);
        return;
      }

      setAnalysisId(result.analysis.id);
      setPhase("progress");
      void triggerRun(result.analysis.id);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerRun = async (id: string) => {
    try {
      await fetch(`/api/analyses/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Polling surfaces failures
    }
  };

  const handleProgressComplete = useCallback(() => {
    if (analysisId) router.push(`/report/${analysisId}`);
  }, [analysisId, router]);

  const handleRetry = useCallback(async () => {
    if (!analysisId) return;
    const result = await resetAnalysisForRetry(analysisId);
    if (result.success) {
      void triggerRun(analysisId);
    }
  }, [analysisId]);

  if (phase === "progress" && analysisId) {
    return (
      <AnalysisProgress
        analysisId={analysisId}
        creativeType={state.creativeTab}
        onComplete={handleProgressComplete}
        onRetry={handleRetry}
      />
    );
  }

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
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-black/[0.04] hover:text-text-primary"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M9 3L4 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
            )}
          </div>

          <WizardStepIndicator currentStep={state.step} steps={[...FUNNEL_WIZARD_STEPS]} />

          <div className="flex w-20 justify-end">
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-black/[0.04] hover:text-text-primary"
              aria-label="Cancel analysis"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        <div className="relative mx-auto w-full max-w-3xl flex-1 px-5 pb-8 pt-2 md:px-8 md:pb-12">
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
                <StepCreativeGoal
                  selected={state.creativeGoal}
                  onSelect={(creativeGoal) =>
                    setState((prev) => ({ ...prev, creativeGoal }))
                  }
                />
              )}
              {state.step === 2 && (
                <StepPlatform
                  selected={state.platforms}
                  platformOther={state.platformOther}
                  onToggle={togglePlatform}
                  onPlatformOtherChange={(platformOther) =>
                    setState((prev) => ({ ...prev, platformOther }))
                  }
                />
              )}
              {state.step === 3 && (
                <StepCreative
                  activeTab={state.creativeTab}
                  creative={state.creative}
                  onTabChange={(creativeTab) =>
                    setState((prev) => ({ ...prev, creativeTab }))
                  }
                  onCreativeChange={(creative) =>
                    setState((prev) => ({ ...prev, creative }))
                  }
                  libraryHooks={libraryHooks}
                />
              )}
              {state.step === 4 && (
                <StepLandingPage
                  value={state.landingPageUrl}
                  onChange={(landingPageUrl) =>
                    setState((prev) => ({ ...prev, landingPageUrl }))
                  }
                  error={landingError}
                  onError={setLandingError}
                />
              )}
              {state.step === 5 && state.creativeGoal && (
                <StepReview
                  creativeGoal={state.creativeGoal}
                  platforms={state.platforms}
                  platformOther={state.platformOther}
                  creativeTab={state.creativeTab}
                  creative={state.creative}
                  landingPageUrl={state.landingPageUrl}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10">
            {submitError && (
              <p className="mb-4 text-center text-sm text-[#ef4444]" role="alert">
                {submitError}
              </p>
            )}

            {state.step < 5 ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canContinue}
                  className="btn-primary min-w-[200px] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="text-center">
                <motion.button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={isSubmitting}
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  className="group relative inline-flex w-full max-w-md items-center justify-center gap-3 overflow-hidden rounded-2xl bg-linear-to-r from-accent to-[#7c3aed] px-10 py-5 text-lg font-semibold text-white shadow-[0_12px_48px_rgba(110,58,255,0.35)] transition-all duration-300 hover:shadow-[0_16px_56px_rgba(110,58,255,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  {isSubmitting ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="inline-block h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                      />
                      Preparing analysis...
                    </>
                  ) : (
                    <>
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
                        <path d="M11 3L13.5 8.5L19 9.5L15 13.5L16 19L11 16L6 19L7 13.5L3 9.5L8.5 8.5L11 3Z" fill="white" fillOpacity="0.9" />
                      </svg>
                      Run Analysis
                    </>
                  )}
                </motion.button>
                <p className="mx-auto mt-4 max-w-sm text-xs leading-relaxed text-text-muted">
                  5 AI agents will stress-test your full funnel. Full report
                  ready in under 3 minutes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <CancelModal
        open={showCancelModal}
        onConfirm={() => router.push("/dashboard")}
        onCancel={() => setShowCancelModal(false)}
      />
    </>
  );
}
