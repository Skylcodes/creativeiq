"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

type ReportPendingProps = {
  analysisId: string;
  status: "processing" | "pending";
};

export function ReportPending({ analysisId }: ReportPendingProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const timer = setInterval(async () => {
      const { data } = await supabase
        .from("analyses")
        .select("status")
        .eq("id", analysisId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.status === "completed" || data?.status === "failed") {
        router.refresh();
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [analysisId, router]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="#6e3aff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </motion.div>
      <h1 className="font-display text-xl font-semibold text-text-primary">
        Your report is being generated
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        The AI agents are still working through your funnel. This page will
        update automatically the moment it&apos;s ready.
      </p>
    </div>
  );
}
