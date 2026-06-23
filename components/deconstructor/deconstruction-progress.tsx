"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  DECONSTRUCTION_PROGRESS_STEPS,
  DECONSTRUCTION_TIMEOUT_MS,
} from "@/lib/deconstructions/constants";
import { createClient } from "@/lib/supabase/client";

const POLL_INTERVAL_MS = 3000;

type DeconstructionProgressProps = {
  deconstructionId: string;
  onComplete: () => void;
  onRetry: () => void;
};

export function DeconstructionProgress({
  deconstructionId,
  onComplete,
  onRetry,
}: DeconstructionProgressProps) {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function runSteps() {
      for (let i = 0; i < DECONSTRUCTION_PROGRESS_STEPS.length; i++) {
        if (cancelled) return;
        setStepIndex(i);
        await new Promise((r) => setTimeout(r, DECONSTRUCTION_PROGRESS_STEPS[i].durationMs));
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
        .from("ad_deconstructions")
        .select("status, error_message")
        .eq("id", deconstructionId)
        .maybeSingle();

      if (cancelled) return;

      if (data?.status === "completed") {
        setTimeout(() => onCompleteRef.current(), 600);
        return;
      }
      if (data?.status === "failed") {
        setErrorMessage(data.error_message ?? "Deconstruction failed.");
        setFailed(true);
        return;
      }

      pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
    const timeoutTimer = setTimeout(() => {
      if (!cancelled) {
        setErrorMessage("Deconstruction took too long. Please try again.");
        setFailed(true);
      }
    }, DECONSTRUCTION_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
      clearTimeout(timeoutTimer);
    };
  }, [deconstructionId]);

  if (failed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-5">
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          Deconstruction failed
        </h2>
        <p className="mt-3 max-w-md text-center text-sm text-text-secondary">
          {errorMessage}
        </p>
        <button type="button" onClick={onRetry} className="btn-premium mt-7">
          Try again
        </button>
      </div>
    );
  }

  const progress = Math.min(
    95,
    ((stepIndex + 1) / DECONSTRUCTION_PROGRESS_STEPS.length) * 90 + elapsed * 0.5
  );

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 py-10">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="icon-badge mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 8L12 4L20 8V16L12 20L4 16V8Z" stroke="#6947ff" strokeWidth="1.5" />
          <path d="M12 4V20M4 8L20 16M20 8L4 16" stroke="#6947ff" strokeWidth="1.2" />
        </svg>
      </motion.div>
      <h2 className="font-display text-2xl font-semibold text-text-primary">
        Deconstructing winning ad
      </h2>
      <p className="mt-2 text-sm text-text-secondary">{elapsed}s elapsed</p>
      <div className="mt-5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-black/[0.06]">
        <motion.div
          className="h-full rounded-full bg-accent"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-8 w-full max-w-md space-y-2">
        {DECONSTRUCTION_PROGRESS_STEPS.map((step, i) => (
          <div
            key={step.message}
            className={`rounded-xl px-4 py-3 text-sm ${
              i === stepIndex
                ? "dashboard-panel font-medium text-accent ring-2 ring-accent/20"
                : i < stepIndex
                  ? "dashboard-panel text-text-secondary"
                  : "premium-card-glass px-4 py-3 text-text-muted opacity-60"
            }`}
          >
            {step.message}
          </div>
        ))}
      </div>
    </div>
  );
}
