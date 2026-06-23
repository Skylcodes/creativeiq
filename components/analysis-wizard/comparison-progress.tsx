"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  COMPARISON_INDIVIDUAL_STEPS,
  COMPARISON_SYNTHESIS_STEPS,
  COMPARISON_TEST_DIMENSIONS,
  INTELLIGENCE_STEPS,
  VIDEO_PROCESSING_STEPS,
} from "@/lib/analyses/constants";
import {
  ANALYSIS_TIMEOUT_MS,
  ANALYSIS_TIMEOUT_MESSAGE,
  isTimeoutError,
} from "@/lib/analyses/watchdog-constants";
import { createClient } from "@/lib/supabase/client";
import type { CreativeType } from "@/lib/types/analysis";
import type { ComparisonTestDimension } from "@/lib/types/comparison";

const POLL_INTERVAL_MS = 3000;

type ComparisonProgressProps = {
  analysisId: string;
  variantCount: number;
  variantLabels: string[];
  creativeType: CreativeType;
  testDimensions: ComparisonTestDimension[];
  onComplete: () => void;
  onRetry: () => void;
};

type ProgressState = "active" | "failed" | "timed_out";
type VariantStatus = "waiting" | "active" | "complete";

function dimensionLabel(ids: ComparisonTestDimension[]): string {
  if (ids.includes("hook")) return "hook strength";
  if (ids.includes("cta")) return "CTA effectiveness";
  if (ids.includes("visual_style")) return "visual impact";
  if (ids.includes("script_copy")) return "copy quality";
  return "creative strength";
}

export function ComparisonProgress({
  analysisId,
  variantCount,
  variantLabels,
  creativeType,
  testDimensions,
  onComplete,
  onRetry,
}: ComparisonProgressProps) {
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const focus = dimensionLabel(testDimensions);
  const isVideo = creativeType === "video";

  const [phase, setPhase] = useState<"individual" | "synthesis">("individual");
  const [variantStates, setVariantStates] = useState<VariantStatus[]>(
    Array.from({ length: variantCount }, () => "waiting"),
  );
  const [synthesisStep, setSynthesisStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [progressState, setProgressState] = useState<ProgressState>("active");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [intelligenceDone, setIntelligenceDone] = useState(false);
  const [videoDone, setVideoDone] = useState(!isVideo);

  const resetForRetry = () => {
    setProgressState("active");
    setErrorMessage(null);
    setPhase("individual");
    setVariantStates(Array.from({ length: variantCount }, () => "waiting"));
    setSynthesisStep(0);
    setProgress(0);
    setElapsed(0);
    setIntelligenceDone(false);
    setVideoDone(!isVideo);
    onRetry();
  };

  useEffect(() => {
    if (progressState !== "active" || intelligenceDone) return;
    let cancelled = false;

    async function run() {
      for (let i = 0; i < INTELLIGENCE_STEPS.length; i++) {
        if (cancelled) return;
        await new Promise((r) =>
          setTimeout(r, INTELLIGENCE_STEPS[i].durationMs),
        );
      }
      if (!cancelled) setIntelligenceDone(true);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [progressState, intelligenceDone]);

  useEffect(() => {
    if (
      !isVideo ||
      !intelligenceDone ||
      videoDone ||
      progressState !== "active"
    )
      return;
    let cancelled = false;

    async function run() {
      for (let i = 0; i < VIDEO_PROCESSING_STEPS.length; i++) {
        if (cancelled) return;
        await new Promise((r) =>
          setTimeout(
            r,
            VIDEO_PROCESSING_STEPS[i].durationMs / Math.max(1, variantCount),
          ),
        );
      }
      if (!cancelled) setVideoDone(true);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isVideo, intelligenceDone, videoDone, progressState, variantCount]);

  useEffect(() => {
    if (progressState !== "active" || !intelligenceDone || !videoDone) return;
    if (phase !== "individual") return;

    let cancelled = false;

    async function runIndividual() {
      setVariantStates(Array.from({ length: variantCount }, () => "active"));

      const stepMs = COMPARISON_INDIVIDUAL_STEPS.reduce(
        (s, v) => s + v.durationMs,
        0,
      );
      await new Promise((r) => setTimeout(r, stepMs));

      if (cancelled) return;
      setVariantStates(Array.from({ length: variantCount }, () => "complete"));
      await new Promise((r) => setTimeout(r, 400));
      setPhase("synthesis");
    }

    runIndividual();
    return () => {
      cancelled = true;
    };
  }, [progressState, intelligenceDone, videoDone, phase, variantCount]);

  useEffect(() => {
    if (progressState !== "active" || phase !== "synthesis") return;
    let cancelled = false;

    async function runSynthesis() {
      for (let i = 0; i < COMPARISON_SYNTHESIS_STEPS.length; i++) {
        if (cancelled) return;
        setSynthesisStep(i);
        await new Promise((r) =>
          setTimeout(r, COMPARISON_SYNTHESIS_STEPS[i].durationMs),
        );
      }
    }

    runSynthesis();
    return () => {
      cancelled = true;
    };
  }, [progressState, phase]);

  useEffect(() => {
    if (progressState !== "active") return;
    const start = Date.now();
    const timer = setInterval(() => {
      const sec = Math.floor((Date.now() - start) / 1000);
      setElapsed(sec);
      const individualWeight = 55;
      const synthesisWeight = 40;
      const preWeight = 15;
      let p = 0;
      if (!intelligenceDone) p = Math.min(preWeight * 0.5, sec * 2);
      else if (!videoDone) p = preWeight;
      else if (phase === "individual") {
        const complete = variantStates.filter((s) => s === "complete").length;
        p = preWeight + (complete / variantCount) * individualWeight;
      } else {
        p =
          preWeight +
          individualWeight +
          ((synthesisStep + 1) / COMPARISON_SYNTHESIS_STEPS.length) *
            synthesisWeight;
      }
      setProgress(Math.min(95, p));
    }, 200);
    return () => clearInterval(timer);
  }, [
    progressState,
    intelligenceDone,
    videoDone,
    phase,
    variantStates,
    synthesisStep,
    variantCount,
  ]);

  useEffect(() => {
    if (progressState !== "active") return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;
    const supabase = createClient();

    const finish = () => {
      setProgress(100);
      setVariantStates(Array.from({ length: variantCount }, () => "complete"));
      setTimeout(() => {
        if (!cancelled) onCompleteRef.current();
      }, 700);
    };

    const handleFailure = (message: string | null) => {
      if (isTimeoutError(message)) {
        setErrorMessage(ANALYSIS_TIMEOUT_MESSAGE);
        setProgressState("timed_out");
      } else {
        setErrorMessage(message);
        setProgressState("failed");
      }
    };

    async function poll() {
      const { data } = await supabase
        .from("analyses")
        .select("status, error_message")
        .eq("id", analysisId)
        .maybeSingle();

      if (cancelled) return;

      if (data?.status === "completed") {
        finish();
        return;
      }
      if (data?.status === "failed") {
        handleFailure(data.error_message ?? null);
        return;
      }

      pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    pollTimer = setTimeout(poll, POLL_INTERVAL_MS);

    const timeoutTimer = setTimeout(async () => {
      if (cancelled) return;
      try {
        await fetch("/api/analyses/watchdog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisId }),
        });
      } catch {
        // Poll surfaces failure
      }
      const { data } = await supabase
        .from("analyses")
        .select("status, error_message")
        .eq("id", analysisId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.status === "failed") {
        handleFailure(data.error_message ?? ANALYSIS_TIMEOUT_MESSAGE);
      } else if (data?.status !== "completed") {
        setErrorMessage(ANALYSIS_TIMEOUT_MESSAGE);
        setProgressState("timed_out");
      }
    }, ANALYSIS_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
      clearTimeout(timeoutTimer);
    };
  }, [analysisId, progressState, variantCount]);

  if (progressState === "failed" || progressState === "timed_out") {
    return (
      <div className="relative flex min-h-full flex-col items-center justify-center px-5 py-10">
        <div className="relative w-full max-w-md text-center">
          <h2 className="font-display text-2xl font-semibold text-text-primary">
            Comparison couldn&apos;t complete
          </h2>
          <p className="mt-3 text-sm text-text-secondary">
            {errorMessage ??
              "Something went wrong. Your variants are saved — try again."}
          </p>
          <button
            type="button"
            onClick={resetForRetry}
            className="btn-premium mt-7 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const testingLabel =
    testDimensions.length > 0
      ? COMPARISON_TEST_DIMENSIONS.filter((d) => testDimensions.includes(d.id))
          .map((d) => d.label)
          .join(" · ")
      : "Full creative";

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 ambient-bg opacity-30" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
      </div>

      <div className="relative w-full max-w-xl">
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            Running variant comparison
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {phase === "individual"
              ? `Phase 1 · Individual evaluation · ${elapsed}s`
              : `Phase 2 · Head-to-head ranking · ${elapsed}s`}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Testing: {testingLabel}
          </p>

          <div className="mx-auto mt-5 h-1.5 max-w-xs overflow-hidden rounded-full bg-black/[0.06]">
            <motion.div
              className="h-full rounded-full bg-accent"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {phase === "individual" ? (
            <motion.div
              key="individual"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-2.5"
            >
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                Phase 1 — Individual evaluation
              </p>
              {variantLabels.slice(0, variantCount).map((label, i) => {
                const status = variantStates[i] ?? "waiting";
                const isActive = status === "active";
                const isComplete = status === "complete";
                const blocked = !intelligenceDone || !videoDone;

                return (
                  <div
                    key={label}
                    className={`rounded-2xl px-4 py-3.5 transition-all ${
                      isActive
                        ? "dashboard-progress-active"
                        : isComplete
                          ? "dashboard-progress-done"
                          : "dashboard-progress-idle opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {label}
                        </p>
                        <p className="mt-0.5 text-xs text-text-secondary">
                          {blocked
                            ? "Waiting for context..."
                            : isComplete
                              ? "Evaluation complete"
                              : isActive
                                ? `Evaluating ${label} ${focus}...`
                                : "Queued"}
                        </p>
                      </div>
                      {isActive && !blocked && (
                        <motion.div
                          className="flex gap-1"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        >
                          {[0, 1, 2].map((d) => (
                            <span
                              key={d}
                              className="h-1.5 w-1.5 rounded-full bg-accent"
                            />
                          ))}
                        </motion.div>
                      )}
                      {isComplete && (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M5.5 9L8 11.5L12.5 6.5"
                            stroke="#0d9488"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="synthesis"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2.5"
            >
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-accent-secondary">
                Phase 2 — Comparative analysis
              </p>
              {COMPARISON_SYNTHESIS_STEPS.map((step, i) => {
                const isActive = i === synthesisStep;
                const isComplete = i < synthesisStep;
                return (
                  <div
                    key={step.message}
                    className={`rounded-2xl px-4 py-3.5 ${
                      isActive
                        ? "dashboard-progress-active"
                        : isComplete
                          ? "dashboard-progress-done"
                          : "dashboard-progress-idle opacity-50"
                    }`}
                  >
                    <p
                      className={`text-sm ${isActive ? "font-medium text-accent" : "text-text-secondary"}`}
                    >
                      {step.message}
                    </p>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
