"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ANALYSIS_TIMEOUT_MS,
  ANALYSIS_TIMEOUT_MESSAGE,
  isTimeoutError,
} from "@/lib/analyses/watchdog-constants";
import {
  ANALYSIS_AGENTS,
  INTELLIGENCE_STEPS,
  VIDEO_PROCESSING_STEPS,
} from "@/lib/analyses/constants";
import { createClient } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 3000;

type ProgressState = "active" | "failed" | "timed_out";
type AgentStatus = "waiting" | "active" | "complete";

type AgentState = {
  status: AgentStatus;
  messageIndex: number;
};

function AgentIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? "#6947ff" : "#a1a1aa";

  switch (icon) {
    case "brand":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <rect
            x="3"
            y="3"
            width="14"
            height="14"
            rx="3"
            stroke={color}
            strokeWidth="1.4"
          />
          <path
            d="M7 10H13M10 7V13"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "buyer":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle cx="10" cy="7" r="3" stroke={color} strokeWidth="1.4" />
          <path
            d="M5 17C5 13.5 7.5 12 10 12C12.5 12 15 13.5 15 17"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "rival":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M4 16L8 8L12 12L16 4"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "critic":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M10 4L12 8L16 9L13 12L14 16L10 14L6 16L7 12L4 9L8 8L10 4Z"
            stroke={color}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "contrarian":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M6 6L14 14M14 6L6 14"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="10" cy="10" r="7" stroke={color} strokeWidth="1.4" />
        </svg>
      );
    case "landing":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <rect
            x="3"
            y="5"
            width="14"
            height="10"
            rx="2"
            stroke={color}
            strokeWidth="1.4"
          />
          <path d="M3 8H17" stroke={color} strokeWidth="1.4" />
        </svg>
      );
    case "competition":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M4 16L8 8L12 12L16 4"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="4" r="1.5" fill={color} />
        </svg>
      );
    case "funnel":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M4 5H16L13 10H7L4 15H16"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M10 3L12 7L16 8L13 11L14 15L10 13L6 15L7 11L4 8L8 7L10 3Z"
            fill={active ? "#6947ff" : "none"}
            stroke={color}
            strokeWidth="1.3"
          />
        </svg>
      );
  }
}

function ErrorCard({
  variant,
  message,
  onRetry,
}: {
  variant: "failed" | "timed_out";
  message: string;
  onRetry: () => void;
}) {
  const isTimeout = variant === "timed_out";

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 ambient-bg opacity-20" />
        <div className="absolute inset-0 grid-pattern opacity-25" />
      </div>
      <div className="relative w-full max-w-md text-center">
        <div
          className={`icon-badge mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${
            isTimeout
              ? "bg-amber-500/10 ring-amber-500/20"
              : "bg-[#ef4444]/10 ring-[#ef4444]/20"
          }`}
        >
          {isTimeout ? (
            <svg
              width="26"
              height="26"
              viewBox="0 0 26 26"
              fill="none"
              aria-hidden
            >
              <circle
                cx="13"
                cy="13"
                r="9"
                stroke="#d97706"
                strokeWidth="1.5"
              />
              <path
                d="M13 7V13L16.5 15.5"
                stroke="#d97706"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              width="26"
              height="26"
              viewBox="0 0 26 26"
              fill="none"
              aria-hidden
            >
              <circle
                cx="13"
                cy="13"
                r="9"
                stroke="#ef4444"
                strokeWidth="1.5"
              />
              <path
                d="M13 8.5V13.5M13 17H13.01"
                stroke="#ef4444"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
          {isTimeout ? "Analysis took too long" : "Analysis couldn't complete"}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
          {message}
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="btn-premium text-sm"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <path
                d="M13 8A5 5 0 1 1 11.5 4.5M13 2V5H10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

/** Pre-agent panel shown for video uploads while audio/vision processing runs. */
function VideoProcessingPanel({
  stepIndex,
  totalDurationMs,
  elapsed,
}: {
  stepIndex: number;
  totalDurationMs: number;
  elapsed: number;
}) {
  const step =
    VIDEO_PROCESSING_STEPS[stepIndex] ??
    VIDEO_PROCESSING_STEPS[VIDEO_PROCESSING_STEPS.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4 }}
      className="premium-card premium-card-accent mb-4 overflow-hidden ring-2 ring-accent/20"
    >
      <div className="relative px-5 py-4">
        <motion.div
          className="absolute inset-0 bg-accent/[0.04]"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
            >
              <rect
                x="2"
                y="4"
                width="16"
                height="12"
                rx="2"
                fill="#1a1a2e"
                fillOpacity="0.06"
                stroke="#6947ff"
                strokeWidth="1.3"
              />
              <path d="M8 8L13 10L8 12V8Z" fill="#6947ff" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-accent">
              Processing Video
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={stepIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="mt-0.5 text-xs text-text-secondary"
              >
                {step.message}
              </motion.p>
            </AnimatePresence>
          </div>
          <motion.div
            className="flex gap-1"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            {[0, 1, 2].map((d) => (
              <span key={d} className="h-1.5 w-1.5 rounded-full bg-accent" />
            ))}
          </motion.div>
        </div>
        <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-accent/10">
          <motion.div
            className="h-full rounded-full bg-accent"
            style={{
              width: `${Math.min(100, (elapsed / (totalDurationMs / 1000)) * 100)}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
      <div className="border-t border-accent/10 bg-accent/[0.02] px-5 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-accent/70">
          {stepIndex + 1} of {VIDEO_PROCESSING_STEPS.length} steps · {elapsed}s
          elapsed
        </p>
      </div>
    </motion.div>
  );
}

/** Pre-agent panel shown while real-world intelligence is being gathered. */
function IntelligencePanel({
  stepIndex,
  elapsed,
}: {
  stepIndex: number;
  elapsed: number;
}) {
  const totalDurationMs = INTELLIGENCE_STEPS.reduce(
    (s, v) => s + v.durationMs,
    0,
  );
  const step =
    INTELLIGENCE_STEPS[stepIndex] ??
    INTELLIGENCE_STEPS[INTELLIGENCE_STEPS.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4 }}
      className="premium-card premium-card-accent mb-4 overflow-hidden ring-2 ring-accent/20"
    >
      <div className="relative px-5 py-4">
        <motion.div
          className="absolute inset-0 bg-accent/[0.04]"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
            >
              <circle
                cx="10"
                cy="10"
                r="7"
                stroke="#6947ff"
                strokeWidth="1.3"
              />
              <circle
                cx="10"
                cy="10"
                r="3"
                fill="#6947ff"
                fillOpacity="0.3"
                stroke="#6947ff"
                strokeWidth="1.2"
              />
              <path
                d="M10 3V5M10 15V17M3 10H5M15 10H17"
                stroke="#6947ff"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-accent">
              Gathering Market Intelligence
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={stepIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="mt-0.5 text-xs text-text-secondary"
              >
                {step.message}
              </motion.p>
            </AnimatePresence>
          </div>
          <motion.div
            className="flex gap-1"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            {[0, 1, 2].map((d) => (
              <span key={d} className="h-1.5 w-1.5 rounded-full bg-accent" />
            ))}
          </motion.div>
        </div>
        <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-accent/10">
          <motion.div
            className="h-full rounded-full bg-accent"
            style={{
              width: `${Math.min(100, (elapsed / (totalDurationMs / 1000)) * 100)}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
      <div className="border-t border-accent/10 bg-accent/[0.02] px-5 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-accent/70">
          {stepIndex + 1} of {INTELLIGENCE_STEPS.length} searches · {elapsed}s
          elapsed
        </p>
      </div>
    </motion.div>
  );
}

type AnalysisProgressProps = {
  analysisId: string;
  creativeType?: string;
  onComplete: () => void;
  onRetry: () => void;
};

export function AnalysisProgress({
  analysisId,
  creativeType,
  onComplete,
  onRetry,
}: AnalysisProgressProps) {
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const isVideo = creativeType === "video";
  const videoTotalMs = VIDEO_PROCESSING_STEPS.reduce(
    (s, v) => s + v.durationMs,
    0,
  );
  const intelligenceTotalMs = INTELLIGENCE_STEPS.reduce(
    (s, v) => s + v.durationMs,
    0,
  );

  const [agents, setAgents] = useState<AgentState[]>(
    ANALYSIS_AGENTS.map(() => ({ status: "waiting", messageIndex: 0 })),
  );
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [progressState, setProgressState] = useState<ProgressState>("active");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Intelligence gathering pre-phase (always runs first)
  const [intelligencePhase, setIntelligencePhase] = useState<
    "gathering" | "done"
  >("gathering");
  const [intelligenceStepIndex, setIntelligenceStepIndex] = useState(0);
  const [intelligenceElapsed, setIntelligenceElapsed] = useState(0);

  // Video-specific pre-agent phase (runs after intelligence)
  const [videoPhase, setVideoPhase] = useState<"processing" | "done">(
    isVideo ? "processing" : "done",
  );
  const [videoStepIndex, setVideoStepIndex] = useState(0);
  const [videoElapsed, setVideoElapsed] = useState(0);

  const resetForRetry = () => {
    setProgressState("active");
    setErrorMessage(null);
    setAgents(
      ANALYSIS_AGENTS.map(() => ({ status: "waiting", messageIndex: 0 })),
    );
    setProgress(0);
    setElapsed(0);
    setIntelligencePhase("gathering");
    setIntelligenceStepIndex(0);
    setIntelligenceElapsed(0);
    if (isVideo) {
      setVideoPhase("processing");
      setVideoStepIndex(0);
      setVideoElapsed(0);
    }
    onRetry();
  };

  // Intelligence gathering pre-phase animation
  useEffect(() => {
    if (intelligencePhase !== "gathering" || progressState !== "active") return;

    let cancelled = false;
    const start = Date.now();

    const ticker = setInterval(() => {
      if (cancelled) return;
      setIntelligenceElapsed(Math.floor((Date.now() - start) / 1000));
    }, 300);

    async function runIntelligenceSteps() {
      for (let i = 0; i < INTELLIGENCE_STEPS.length; i++) {
        if (cancelled) return;
        setIntelligenceStepIndex(i);
        await new Promise((r) =>
          setTimeout(r, INTELLIGENCE_STEPS[i].durationMs),
        );
      }
      if (!cancelled) setIntelligencePhase("done");
    }

    runIntelligenceSteps();

    return () => {
      cancelled = true;
      clearInterval(ticker);
    };
  }, [intelligencePhase, progressState]);

  // Video processing pre-phase animation
  useEffect(() => {
    if (!isVideo || videoPhase !== "processing" || progressState !== "active")
      return;
    // Wait for intelligence phase to complete first
    if (intelligencePhase !== "done") return;

    let cancelled = false;
    const start = Date.now();

    const ticker = setInterval(() => {
      if (cancelled) return;
      setVideoElapsed(Math.floor((Date.now() - start) / 1000));
    }, 300);

    async function runVideoSteps() {
      for (let i = 0; i < VIDEO_PROCESSING_STEPS.length; i++) {
        if (cancelled) return;
        setVideoStepIndex(i);
        await new Promise((r) =>
          setTimeout(r, VIDEO_PROCESSING_STEPS[i].durationMs),
        );
      }
      if (!cancelled) {
        setVideoPhase("done");
      }
    }

    runVideoSteps();

    return () => {
      cancelled = true;
      clearInterval(ticker);
    };
  }, [isVideo, videoPhase, progressState, intelligencePhase]);

  // Agent visual sequence
  useEffect(() => {
    if (progressState !== "active") return;
    if (intelligencePhase !== "done") return;
    if (isVideo && videoPhase !== "done") return;

    let cancelled = false;
    const startTime = Date.now();
    const totalDuration = ANALYSIS_AGENTS.reduce(
      (sum, a) => sum + a.durationMs,
      0,
    );

    const elapsedTimer = setInterval(() => {
      if (cancelled) return;
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
      setProgress(
        Math.min(95, ((Date.now() - startTime) / totalDuration) * 95),
      );
    }, 200);

    async function runSequence() {
      for (let i = 0; i < ANALYSIS_AGENTS.length; i++) {
        if (cancelled) return;

        setAgents((prev) =>
          prev.map((a, idx) =>
            idx === i ? { ...a, status: "active", messageIndex: 0 } : a,
          ),
        );

        const agent = ANALYSIS_AGENTS[i];
        const messageInterval = Math.floor(
          agent.durationMs / agent.messages.length,
        );

        for (let m = 0; m < agent.messages.length; m++) {
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, messageInterval));
          setAgents((prev) =>
            prev.map((a, idx) => (idx === i ? { ...a, messageIndex: m } : a)),
          );
        }

        if (i < ANALYSIS_AGENTS.length - 1) {
          setAgents((prev) =>
            prev.map((a, idx) =>
              idx === i ? { ...a, status: "complete" } : a,
            ),
          );
        }
      }
    }

    runSequence();

    return () => {
      cancelled = true;
      clearInterval(elapsedTimer);
    };
  }, [progressState, isVideo, videoPhase, intelligencePhase]);

  // Poll real analysis status
  useEffect(() => {
    if (progressState !== "active") return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;
    const supabase = createClient();

    const finish = () => {
      setAgents((prev) => prev.map((a) => ({ ...a, status: "complete" })));
      setProgress(100);
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
        // Poll will surface the failed status if watchdog succeeded
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
  }, [analysisId, progressState]);

  const activeCount = agents.filter((a) => a.status === "complete").length;

  if (progressState === "failed" || progressState === "timed_out") {
    return (
      <ErrorCard
        variant={progressState}
        message={
          errorMessage ??
          (progressState === "timed_out"
            ? ANALYSIS_TIMEOUT_MESSAGE
            : "Something went wrong while running the AI agents. Your inputs are saved — give it another try.")
        }
        onRetry={resetForRetry}
      />
    );
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 ambient-bg opacity-30" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative w-full max-w-xl">
        <div className="mb-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="icon-badge mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"
                  stroke="#6947ff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </motion.div>
          </motion.div>

          <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            Running funnel intelligence
          </h2>
          {intelligencePhase === "gathering" ? (
            <p className="mt-2 text-sm text-text-secondary">
              Scanning real competitor ads and platform trends...
            </p>
          ) : videoPhase === "processing" ? (
            <p className="mt-2 text-sm text-text-secondary">
              Processing your video creative — agents activate next
            </p>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">
              {activeCount} of {ANALYSIS_AGENTS.length} agents complete ·{" "}
              {elapsed}s elapsed
            </p>
          )}

          <div className="mx-auto mt-6 h-1.5 max-w-xs overflow-hidden rounded-full bg-black/[0.06]">
            <motion.div
              className="h-full rounded-full bg-accent"
              style={{
                width:
                  intelligencePhase === "gathering"
                    ? `${Math.min(20, (intelligenceElapsed / (intelligenceTotalMs / 1000)) * 20)}%`
                    : videoPhase === "processing"
                      ? `${20 + Math.min(20, (videoElapsed / (videoTotalMs / 1000)) * 20)}%`
                      : `${20 + (isVideo ? 20 : 0) + progress * 0.6}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="space-y-2.5">
          <AnimatePresence>
            {intelligencePhase === "gathering" && (
              <IntelligencePanel
                stepIndex={intelligenceStepIndex}
                elapsed={intelligenceElapsed}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isVideo &&
              intelligencePhase === "done" &&
              videoPhase === "processing" && (
                <VideoProcessingPanel
                  stepIndex={videoStepIndex}
                  totalDurationMs={videoTotalMs}
                  elapsed={videoElapsed}
                />
              )}
          </AnimatePresence>

          {ANALYSIS_AGENTS.map((agent, i) => {
            const state = agents[i];
            const isActive = state.status === "active";
            const isComplete = state.status === "complete";
            const isWaiting = state.status === "waiting";
            const isBlocked =
              intelligencePhase === "gathering" ||
              (isVideo && videoPhase === "processing");

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: isWaiting || isBlocked ? 0.35 : 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className={`relative overflow-hidden rounded-2xl px-4 py-3.5 transition-all duration-500 ${
                  isActive
                    ? "dashboard-progress-active"
                    : isComplete
                      ? "dashboard-progress-done"
                      : "dashboard-progress-idle"
                }`}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-accent/[0.03]"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                <div className="relative flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      isActive
                        ? "bg-accent/10"
                        : isComplete
                          ? "bg-[#0d9488]/10"
                          : "surface-inset"
                    }`}
                  >
                    {isComplete ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        aria-hidden
                      >
                        <circle
                          cx="9"
                          cy="9"
                          r="7"
                          fill="#0d9488"
                          fillOpacity="0.15"
                          stroke="#0d9488"
                          strokeWidth="1.3"
                        />
                        <path
                          d="M5.5 9L8 11.5L12.5 6.5"
                          stroke="#0d9488"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <AgentIcon icon={agent.icon} active={isActive} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        isActive
                          ? "text-accent"
                          : isComplete
                            ? "text-text-primary"
                            : "text-text-muted"
                      }`}
                    >
                      {agent.name}
                    </p>

                    <AnimatePresence mode="wait">
                      {(isActive || isComplete) && (
                        <motion.p
                          key={`${agent.id}-${state.messageIndex}-${state.status}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.25 }}
                          className={`mt-0.5 text-xs ${
                            isComplete
                              ? "text-accent-secondary"
                              : "text-text-secondary"
                          }`}
                        >
                          {isComplete
                            ? "Complete"
                            : agent.messages[state.messageIndex]}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {isActive && (
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
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function getAnalysisProgressDurationMs(): number {
  return ANALYSIS_AGENTS.reduce((sum, a) => sum + a.durationMs, 0) + 800;
}
