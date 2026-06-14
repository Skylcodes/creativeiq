"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { BrandProfileProgress, BrandProfileStatus } from "@/lib/types/report";
import { stepTransition } from "./onboarding-shell";

const POLL_INTERVAL_MS = 2000;

type StepLoadingProps = {
  workspaceId: string;
  workspaceName: string;
  onComplete: () => void;
  onManualRequired: (errorMessage: string | null) => void;
};

export function StepLoading({
  workspaceId,
  workspaceName,
  onComplete,
  onManualRequired,
}: StepLoadingProps) {
  const onCompleteRef = useRef(onComplete);
  const onManualRef = useRef(onManualRequired);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onManualRef.current = onManualRequired;
  }, [onComplete, onManualRequired]);

  const [message, setMessage] = useState("Creating your workspace…");
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    let cancelled = false;

    let timer: ReturnType<typeof setTimeout>;

    async function start() {
      try {
        await fetch(`/api/workspaces/${workspaceId}/brand-profile/generate`, {
          method: "POST",
        });
      } catch {
        // Polling will surface failures.
      }
    }

    void start();

    async function poll() {
      try {
        const res = await fetch(
          `/api/workspaces/${workspaceId}/brand-profile/status`
        );
        if (!res.ok) throw new Error("Status check failed");

        const data = (await res.json()) as {
          status: BrandProfileStatus;
          progress: BrandProfileProgress | null;
          error: string | null;
        };

        if (cancelled) return;

        if (data.progress?.message) {
          setMessage(data.progress.message);
          setProgress(Math.max(data.progress.percent, 5));
        }

        if (data.status === "complete") {
          setProgress(100);
          setTimeout(() => {
            if (!cancelled) onCompleteRef.current();
          }, 600);
          return;
        }

        if (data.status === "manual_required") {
          onManualRef.current(data.error);
          return;
        }

        if (data.status === "failed") {
          onManualRef.current(
            data.error ??
              "We couldn't build your brand profile automatically. Please describe your brand below."
          );
          return;
        }
      } catch {
        if (!cancelled) {
          setMessage("Still working on your brand profile…");
        }
      }

      if (!cancelled) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [workspaceId]);

  return (
    <motion.div
      key="loading"
      {...stepTransition}
      className="rounded-2xl border border-white/80 bg-white/90 p-10 text-center shadow-[0_24px_64px_rgba(110,58,255,0.08),0_8px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl"
    >
      <div className="relative mx-auto mb-8 h-24 w-24">
        <motion.div
          className="absolute inset-0 rounded-full bg-linear-to-br from-accent/20 to-accent-secondary/20"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full bg-linear-to-br from-accent to-[#9333ea] shadow-[0_8px_32px_rgba(110,58,255,0.35)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{
            background:
              "conic-gradient(from 0deg, #6e3aff, #0d9488, #9333ea, #6e3aff)",
          }}
        />
        <div className="absolute inset-4 flex items-center justify-center rounded-full bg-white">
          <motion.svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            aria-hidden
          >
            <path
              d="M14 3L17 11H25L19 16L21 24L14 19L7 24L9 16L3 11H11L14 3Z"
              stroke="#6e3aff"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </motion.svg>
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        Analyzing {workspaceName}
      </p>

      <div className="mt-6 h-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-lg font-medium text-text-primary"
          >
            {message}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mx-auto mt-8 max-w-xs">
        <div className="h-1 overflow-hidden rounded-full bg-surface-muted">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-accent to-accent-secondary"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <p className="mt-4 text-xs text-text-muted">
        Building your brand intelligence profile
      </p>
    </motion.div>
  );
}
