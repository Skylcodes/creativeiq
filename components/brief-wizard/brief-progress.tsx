"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BRIEF_PROGRESS_STEPS, BRIEF_TIMEOUT_MS } from "@/lib/briefs/constants";
import { createClient } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 3000;

type BriefProgressProps = {
  briefId: string;
  onComplete: () => void;
  onAwaitingAngle: () => void;
  onRetry: () => void;
};

export function BriefProgress({
  briefId,
  onComplete,
  onAwaitingAngle,
  onRetry,
}: BriefProgressProps) {
  const onCompleteRef = useRef(onComplete);
  const onAwaitingAngleRef = useRef(onAwaitingAngle);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onAwaitingAngleRef.current = onAwaitingAngle;
  }, [onComplete, onAwaitingAngle]);

  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runSteps() {
      for (let i = 0; i < BRIEF_PROGRESS_STEPS.length; i++) {
        if (cancelled) return;
        setStepIndex(i);
        await new Promise((r) => setTimeout(r, BRIEF_PROGRESS_STEPS[i].durationMs));
      }
    }

    runSteps();
    const ticker = setInterval(() => setElapsed((e) => e + 1), 1000);

    return () => {
      cancelled = true;
      clearInterval(ticker);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;
    const supabase = createClient();

    async function poll() {
      const { data } = await supabase
        .from("creative_briefs")
        .select("status, error_message")
        .eq("id", briefId)
        .maybeSingle();

      if (cancelled) return;

      if (data?.status === "completed") {
        setTimeout(() => onCompleteRef.current(), 600);
        return;
      }
      if (data?.status === "awaiting_angle") {
        setTimeout(() => onAwaitingAngleRef.current(), 600);
        return;
      }
      if (data?.status === "failed") {
        setErrorMessage(data.error_message ?? "Brief generation failed.");
        setFailed(true);
        return;
      }

      pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    pollTimer = setTimeout(poll, POLL_INTERVAL_MS);

    const timeoutTimer = setTimeout(() => {
      if (!cancelled) {
        setErrorMessage("Brief generation took too long. Please try again.");
        setFailed(true);
      }
    }, BRIEF_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
      clearTimeout(timeoutTimer);
    };
  }, [briefId]);

  if (failed) {
    return (
      <div className="relative flex min-h-full flex-col items-center justify-center px-5 py-10">
        <div className="relative max-w-md text-center">
          <h2 className="font-display text-2xl font-semibold text-text-primary">
            Brief couldn&apos;t be generated
          </h2>
          <p className="mt-3 text-sm text-text-secondary">{errorMessage}</p>
          <button type="button" onClick={onRetry} className="btn-primary mt-7 text-sm">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const progress = Math.min(
    95,
    ((stepIndex + 1) / BRIEF_PROGRESS_STEPS.length) * 90 + elapsed * 0.5
  );

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 mesh-gradient opacity-60" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
      </div>

      <div className="relative w-full max-w-xl">
        <div className="mb-10 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d97706]/10 ring-1 ring-[#d97706]/20"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="4" y="3" width="16" height="18" rx="2" stroke="#d97706" strokeWidth="1.5" />
              <path d="M8 8H16M8 12H14M8 16H12" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </motion.div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            Building your creative brief
          </h2>
          <p className="mt-2 text-sm text-text-secondary">{elapsed}s elapsed</p>
          <div className="mx-auto mt-5 h-1.5 max-w-xs overflow-hidden rounded-full bg-black/[0.06]">
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-[#d97706] to-[#f59e0b]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-2.5">
          {BRIEF_PROGRESS_STEPS.map((step, i) => {
            const isActive = i === stepIndex;
            const isComplete = i < stepIndex;
            return (
              <div
                key={step.message}
                className={`rounded-2xl px-4 py-3.5 transition-all ${
                  isActive
                    ? "bg-white shadow-[0_8px_32px_rgba(217,119,6,0.14)] ring-2 ring-[#d97706]/25"
                    : isComplete
                      ? "bg-white/90 ring-1 ring-[#0d9488]/20"
                      : "bg-white/50 ring-1 ring-black/[0.04] opacity-50"
                }`}
              >
                <p className={`text-sm ${isActive ? "font-medium text-[#d97706]" : "text-text-secondary"}`}>
                  {step.message}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
