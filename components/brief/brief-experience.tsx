"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BriefProgress } from "@/components/brief-wizard/brief-progress";
import { BriefAnglePicker } from "@/components/brief/brief-angle-picker";
import { BriefDocumentView } from "@/components/brief/brief-document-view";
import { resetBriefForRetry } from "@/lib/briefs/actions";
import { createClient } from "@/lib/supabase/client";
import type { BriefAngleOption, CreativeBrief } from "@/lib/types/brief";
import type { HookLibraryEntry } from "@/lib/types/hook";

type BriefExperienceProps = {
  brief: CreativeBrief;
  workspaceName: string;
  savedHooks?: HookLibraryEntry[];
};

export function BriefExperience({
  brief: initial,
  workspaceName,
  savedHooks = [],
}: BriefExperienceProps) {
  const router = useRouter();
  const [brief, setBrief] = useState(initial);

  useEffect(() => {
    if (brief.status !== "processing") return;

    const supabase = createClient();
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("creative_briefs")
        .select("*")
        .eq("id", brief.id)
        .maybeSingle();
      if (data && data.status !== "processing") {
        setBrief(data as CreativeBrief);
        router.refresh();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [brief.id, brief.status, router]);

  const handleRetry = useCallback(async () => {
    const result = await resetBriefForRetry(brief.id);
    if (result.success) {
      setBrief(result.brief);
      await fetch(`/api/briefs/${brief.id}/run`, { method: "POST" });
    }
  }, [brief.id]);

  if (brief.status === "processing") {
    return (
      <BriefProgress
        briefId={brief.id}
        onComplete={() => router.refresh()}
        onAwaitingAngle={() => router.refresh()}
        onRetry={handleRetry}
      />
    );
  }

  if (brief.status === "failed") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-xl font-semibold text-white">
          Brief generation failed
        </h1>
        <p className="mt-2 text-sm text-white/55">
          {brief.error_message ?? "Something went wrong."}
        </p>
        <button type="button" onClick={handleRetry} className="btn-premium mt-6 text-sm">
          Try again
        </button>
        <Link href="/brief" className="mt-4 text-sm text-accent">
          Back to briefs
        </Link>
      </div>
    );
  }

  if (brief.status === "awaiting_angle" && brief.angle_options?.length) {
    return (
      <BriefAnglePicker
        brief={brief}
        angles={brief.angle_options as BriefAngleOption[]}
      />
    );
  }

  if (brief.status === "completed" && brief.brief) {
    return (
      <BriefDocumentView
        brief={brief}
        workspaceName={workspaceName}
        savedHooks={savedHooks}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <p className="text-text-secondary">Brief unavailable.</p>
      <Link href="/brief" className="btn-outline mt-6 inline-flex text-sm">
        Back to briefs
      </Link>
    </div>
  );
}
