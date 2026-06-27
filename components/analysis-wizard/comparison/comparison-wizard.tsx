"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  createComparisonAnalysis,
  resetAnalysisForRetry,
} from "@/lib/analyses/actions";
import { useBilling } from "@/components/billing/billing-provider";
import {
  uploadCreativeFile,
  uploadVideoThumbnail,
} from "@/lib/analyses/upload";
import {
  validateLandingPageUrl,
  validateScriptContent,
} from "@/lib/analyses/validation";
import type { ComparisonVariantInput } from "@/lib/types/comparison";
import type { ComparisonTestDimension } from "@/lib/types/comparison";
import type { Workspace } from "@/lib/types/workspace";
import { CancelModal } from "../cancel-modal";
import { StepCreativeGoal } from "../step-creative-goal";
import { WizardStepIndicator } from "../wizard-step-indicator";
import { ComparisonProgress } from "../comparison-progress";
import { StepComparisonContext } from "./step-comparison-context";
import { StepComparisonReview } from "./step-comparison-review";
import { StepTestDimension } from "./step-test-dimension";
import {
  areVariantsValid,
  getLockedCreativeType,
  StepVariants,
} from "./step-variants";
import {
  COMPARISON_WIZARD_STEPS,
  createInitialComparisonState,
  type ComparisonWizardState,
  type VariantSlotState,
} from "./types";

type ComparisonWizardProps = {
  workspace: Workspace;
};

type WizardPhase = "wizard" | "progress";

const stepVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

async function uploadVariantSlot(
  slot: VariantSlotState,
  index: number,
): Promise<ComparisonVariantInput | { error: string }> {
  const label = slot.label.trim() || `Variant ${index + 1}`;
  const creativeType = slot.creativeTab;

  if (creativeType === "script") {
    return {
      label,
      creativeType,
      scriptContent: slot.creative.scriptContent.trim(),
    };
  }

  if (creativeType === "image" && slot.creative.imageFile) {
    const upload = await uploadCreativeFile(slot.creative.imageFile, "image");
    if ("error" in upload) return { error: upload.error };
    return {
      label,
      creativeType,
      creativeStoragePath: upload.path,
      creativeFileName: slot.creative.imageFile.name,
      creativeMimeType: slot.creative.imageFile.type,
    };
  }

  if (creativeType === "video" && slot.creative.videoFile) {
    const upload = await uploadCreativeFile(slot.creative.videoFile, "video");
    if ("error" in upload) return { error: upload.error };
    let thumbnailUrl: string | undefined;
    if (slot.creative.videoThumbnail) {
      const thumb = await uploadVideoThumbnail(slot.creative.videoThumbnail);
      if (!("error" in thumb)) thumbnailUrl = thumb.url;
    }
    return {
      label,
      creativeType,
      creativeStoragePath: upload.path,
      creativeFileName: slot.creative.videoFile.name,
      creativeMimeType: slot.creative.videoFile.type,
      thumbnailUrl,
    };
  }

  return { error: `Variant ${index + 1} is missing a creative.` };
}

export function ComparisonWizard({ workspace }: ComparisonWizardProps) {
  const router = useRouter();
  const [state, setState] = useState<ComparisonWizardState>(() =>
    createInitialComparisonState(workspace.brand_url),
  );
  const [phase, setPhase] = useState<WizardPhase>("wizard");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [landingError, setLandingError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const { ensureCanAct, showBlocked } = useBilling();

  const toggleDimension = (id: ComparisonTestDimension) => {
    setState((prev) => {
      const exists = prev.testDimensions.includes(id);
      const testDimensions = exists
        ? prev.testDimensions.filter((d) => d !== id)
        : [...prev.testDimensions, id];
      return { ...prev, testDimensions };
    });
  };

  const canContinueStep1 = state.creativeGoal !== null;
  const canContinueStep2 = state.testDimensions.length > 0;
  const canContinueStep3 = areVariantsValid(state.variants);
  const canContinueStep4 =
    validateLandingPageUrl(state.landingPageUrl) === null &&
    state.platform.length > 0 &&
    (state.platform !== "other" || state.platformOther.trim().length > 0);

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
      setState((prev) => ({
        ...prev,
        step: (prev.step + 1) as ComparisonWizardState["step"],
      }));
    }
  };

  const goBack = () => {
    if (state.step > 1) {
      setState((prev) => ({
        ...prev,
        step: (prev.step - 1) as ComparisonWizardState["step"],
      }));
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

  const handleRunComparison = async () => {
    if (!ensureCanAct("variant_comparisons")) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const creativeType = getLockedCreativeType(state.variants);
      if (!creativeType) {
        setSubmitError("Upload at least 2 variants.");
        setIsSubmitting(false);
        return;
      }

      const uploaded: ComparisonVariantInput[] = [];
      for (let i = 0; i < state.variants.length; i++) {
        const slot = state.variants[i];
        const hasContent =
          slot.creativeTab === "image"
            ? Boolean(slot.creative.imageFile)
            : slot.creativeTab === "video"
              ? Boolean(slot.creative.videoFile)
              : validateScriptContent(slot.creative.scriptContent) === null;
        if (!hasContent) continue;

        const result = await uploadVariantSlot(slot, i);
        if ("error" in result) {
          setSubmitError(result.error);
          setIsSubmitting(false);
          return;
        }
        uploaded.push(result);
      }

      if (uploaded.length < 2) {
        setSubmitError("Upload at least 2 variants.");
        setIsSubmitting(false);
        return;
      }

      if (!state.creativeGoal) {
        setSubmitError("Select a creative goal.");
        setIsSubmitting(false);
        return;
      }

      const result = await createComparisonAnalysis({
        workspaceId: workspace.id,
        creativeGoal: state.creativeGoal,
        platform: state.platform,
        platformOther: state.platformOther,
        landingPageUrl: state.landingPageUrl,
        testDimensions: state.testDimensions,
        creativeType,
        variants: uploaded,
      });

      if (!result.success) {
        if (result.blocked) showBlocked(result.blocked);
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

  const handleProgressComplete = useCallback(() => {
    if (analysisId) router.push(`/report/${analysisId}`);
  }, [analysisId, router]);

  const handleRetry = useCallback(async () => {
    if (!analysisId) return;
    const result = await resetAnalysisForRetry(analysisId);
    if (result.success) void triggerRun(analysisId);
  }, [analysisId]);

  const creativeType = getLockedCreativeType(state.variants) ?? "image";
  const variantLabels = state.variants.map(
    (v, i) => v.label.trim() || `Variant ${i + 1}`,
  );

  if (phase === "progress" && analysisId) {
    return (
      <ComparisonProgress
        analysisId={analysisId}
        variantCount={state.variants.length}
        variantLabels={variantLabels}
        creativeType={creativeType}
        testDimensions={state.testDimensions}
        onComplete={handleProgressComplete}
        onRetry={handleRetry}
      />
    );
  }

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
            steps={[...COMPARISON_WIZARD_STEPS]}
          />

          <div className="flex w-20 justify-end">
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="wizard-ghost-btn flex h-9 w-9 items-center justify-center rounded-full"
              aria-label="Cancel comparison"
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
                <StepTestDimension
                  selected={state.testDimensions}
                  onToggle={toggleDimension}
                />
              )}
              {state.step === 3 && (
                <StepVariants
                  variants={state.variants}
                  onChange={(variants) =>
                    setState((prev) => ({ ...prev, variants }))
                  }
                />
              )}
              {state.step === 4 && (
                <StepComparisonContext
                  landingPageUrl={state.landingPageUrl}
                  platform={state.platform}
                  platformOther={state.platformOther}
                  landingError={landingError}
                  onLandingChange={(landingPageUrl) =>
                    setState((prev) => ({ ...prev, landingPageUrl }))
                  }
                  onLandingError={setLandingError}
                  onPlatformSelect={(platform) =>
                    setState((prev) => ({ ...prev, platform }))
                  }
                  onPlatformOtherChange={(platformOther) =>
                    setState((prev) => ({ ...prev, platformOther }))
                  }
                />
              )}
              {state.step === 5 && state.creativeGoal && (
                <StepComparisonReview
                  creativeGoal={state.creativeGoal}
                  testDimensions={state.testDimensions}
                  variants={state.variants}
                  platform={state.platform}
                  platformOther={state.platformOther}
                  landingPageUrl={state.landingPageUrl}
                />
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
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M3 8H13M9 4L13 8L9 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="text-center">
                <motion.button
                  type="button"
                  onClick={handleRunComparison}
                  disabled={isSubmitting}
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  className="group relative inline-flex w-full max-w-md items-center justify-center gap-3 overflow-hidden rounded-2xl bg-accent px-10 py-5 text-lg font-semibold text-white shadow-[0_12px_48px_rgba(105, 71, 255, 0.12)] transition-all duration-300 hover:shadow-[0_16px_56px_rgba(105, 71, 255, 0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  {isSubmitting ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="inline-block h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                      />
                      Preparing comparison...
                    </>
                  ) : (
                    <>
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 22 22"
                        fill="none"
                        aria-hidden
                      >
                        <rect
                          x="3"
                          y="5"
                          width="7"
                          height="12"
                          rx="1.5"
                          stroke="white"
                          strokeWidth="1.5"
                        />
                        <rect
                          x="12"
                          y="5"
                          width="7"
                          height="12"
                          rx="1.5"
                          stroke="white"
                          strokeWidth="1.5"
                        />
                      </svg>
                      Run Comparison
                    </>
                  )}
                </motion.button>
                <p className="mx-auto mt-4 max-w-sm text-xs leading-relaxed text-text-muted">
                  Our agents will evaluate each variant individually then rank
                  them head to head. Full comparison report ready in under 5
                  minutes.
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
