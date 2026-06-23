"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { AccountSnapshot } from "@/lib/billing/account-types";

type Phase = "confirming" | "active" | "pending";

export function BillingSuccess() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("confirming");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        const res = await fetch("/api/billing/status", { cache: "no-store" });
        if (res.ok) {
          const snap = (await res.json()) as AccountSnapshot;
          if (!cancelled && snap.status === "active") {
            setPhase("active");
            router.refresh();
            return;
          }
        }
      } catch {
        // ignore — keep polling
      }

      if (cancelled) return;
      // Webhooks usually land within a few seconds; stop polling after ~24s.
      if (attempts >= 12) {
        setPhase("pending");
        return;
      }
      setTimeout(poll, 2000);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="premium-card w-full max-w-md p-8 text-center"
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4338ca]">
          {phase === "active" ? (
            <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-8 w-8 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
        </div>

        {phase === "active" ? (
          <>
            <h1 className="font-display text-2xl font-semibold text-text-primary">
              You&apos;re all set 🎉
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Your subscription is active. Every analysis, brief, deconstruction,
              and strategist session is unlocked. Time to ship better creative.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#7c3aed] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9]"
            >
              Go to dashboard
            </Link>
          </>
        ) : phase === "pending" ? (
          <>
            <h1 className="font-display text-2xl font-semibold text-text-primary">
              Payment received
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Thanks! We&apos;re finalizing your subscription — this can take a
              moment. You can head to your dashboard and it&apos;ll be active
              shortly.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#7c3aed] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9]"
            >
              Go to dashboard
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold text-text-primary">
              Confirming your subscription…
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Hang tight while we activate your plan.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
