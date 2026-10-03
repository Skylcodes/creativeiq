"use client";

import { useState } from "react";
import type { AnalysisRemixKind, AnalysisReport, HookVariant } from "@/lib/types/report";
import type { HookLibraryEntry } from "@/lib/types/hook";
import { promoteAnalysisHook, remixAnalysisSection } from "@/lib/analyses/actions";
import { CopyButton } from "../shared/copy-button";
import {
  HookRowActions,
  matchHookInLibrary,
  type HookSaveContext,
} from "@/components/hooks/hook-row-actions";
import { PlainPanel } from "../shared/plain-panel";
import { CreativeScoreBreakdownCard } from "../shared/creative-score-breakdown";
import { useToast } from "@/components/shared/toast";

type CreativeAnalysisSectionProps = {
  analysisId: string;
  report: AnalysisReport;
  originalScript?: string | null;
  hookLookup?: Map<string, HookLibraryEntry>;
  hookSaveBase?: HookSaveContext;
  onHookSaved?: (hook: HookLibraryEntry) => void;
};

const HOOK_REMIX: { kind: AnalysisRemixKind; label: string }[] = [
  { kind: "hook_punchier", label: "Make punchier" },
  { kind: "hook_natural", label: "Make more natural" },
  { kind: "hook_alternatives", label: "Give alternatives" },
];

const SCRIPT_REMIX: { kind: AnalysisRemixKind; label: string }[] = [
  { kind: "script_shorten", label: "Shorten" },
  { kind: "script_conversational", label: "Make more conversational" },
  { kind: "script_direct", label: "Make more direct" },
  { kind: "script_cta", label: "Sharpen the CTA" },
];

function truncateScript(text: string, maxChars = 900): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars).trim()}…`;
}

function ScriptComparison({
  original,
  rewrite,
}: {
  original: string | null;
  rewrite: string;
}) {
  const [mode, setMode] = useState<"side" | "full">("side");
  const hasOriginal = Boolean(original?.trim());

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
        <div className="flex rounded-lg bg-white/[0.04] p-0.5">
          <button
            type="button"
            onClick={() => setMode("side")}
            disabled={!hasOriginal}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              mode === "side"
                ? "bg-white/[0.1] text-white"
                : "text-white/45 hover:text-white/70"
            } disabled:opacity-40`}
          >
            Side by side
          </button>
          <button
            type="button"
            onClick={() => setMode("full")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              mode === "full"
                ? "bg-white/[0.1] text-white"
                : "text-white/45 hover:text-white/70"
            }`}
          >
            Full rewrite only
          </button>
        </div>
        <CopyButton text={rewrite} label="Copy rewrite" />
      </div>

      {mode === "full" || !hasOriginal ? (
        <div className="p-4 md:p-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
            Improved
          </p>
          <p className="whitespace-pre-wrap text-[15px] leading-[1.85] text-white/90">
            {rewrite}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2">
          <div className="border-b border-white/[0.08] p-4 md:border-b-0 md:border-r md:border-white/[0.08] md:p-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
              Original
            </p>
            <p className="whitespace-pre-wrap text-sm leading-[1.75] text-white/55">
              {truncateScript(original!)}
            </p>
          </div>
          <div className="bg-accent/[0.04] p-4 md:p-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-accent-tertiary">
              Improved
            </p>
            <p className="whitespace-pre-wrap text-[15px] leading-[1.85] text-white/90">
              {rewrite}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function CreativeAnalysisSection({
  analysisId,
  report,
  originalScript,
  hookLookup,
  hookSaveBase,
  onHookSaved,
}: CreativeAnalysisSectionProps) {
  const { showToast } = useToast();
  const [hooks, setHooks] = useState<HookVariant[]>(() =>
    [...report.hookVariants].sort((a, b) => a.rank - b.rank)
  );
  const [script, setScript] = useState(report.scriptRewrite ?? "");
  const [pending, setPending] = useState<AnalysisRemixKind | null>(null);
  const [promoting, setPromoting] = useState(false);

  const recommended = hooks[0];
  const alternatives = hooks.slice(1);

  async function remix(kind: AnalysisRemixKind) {
    setPending(kind);
    const result = await remixAnalysisSection(analysisId, kind);
    setPending(null);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    setHooks([...result.hookVariants].sort((a, b) => a.rank - b.rank));
    setScript(result.scriptRewrite);
    showToast("Updated.");
  }

  async function useHook(rank: number) {
    setPromoting(true);
    const result = await promoteAnalysisHook(analysisId, rank);
    setPromoting(false);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    setHooks([...result.hookVariants].sort((a, b) => a.rank - b.rank));
  }

  return (
    <section id="section-creative" className="scroll-mt-24 space-y-8">
      <div>
        <h2 className="font-display text-xl font-semibold text-white md:text-2xl">
          Creative Analysis
        </h2>
        <p className="mt-1 text-sm text-white/55">
          How the ad stops the scroll, holds attention, and delivers the message.
        </p>
      </div>

      {report.creativeScoreBreakdown && (
        <CreativeScoreBreakdownCard
          breakdown={report.creativeScoreBreakdown}
          blendedScore={report.creativeStrengthScore}
        />
      )}

      {hooks.length > 0 && recommended && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/45">
            Hook rewrites
          </h3>
          <PlainPanel className="mt-4 p-5 md:p-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent-tertiary">
              Recommended hook
            </p>
            <p className="mt-2 font-display text-lg font-semibold leading-snug text-text-primary md:text-xl">
              &ldquo;{recommended.hook}&rdquo;
            </p>
            <div className="mt-3">
              <HookRowActions
                hookText={recommended.hook}
                hookEntry={
                  hookLookup ? matchHookInLibrary(recommended.hook, hookLookup) : undefined
                }
                saveContext={
                  hookSaveBase
                    ? {
                        ...hookSaveBase,
                        angleTags: report.angleTags ?? [],
                        notes: recommended.rationale ?? null,
                        captureKeySuffix: `variant-${recommended.rank}`,
                      }
                    : undefined
                }
                onSaved={onHookSaved}
              />
            </div>
            {recommended.rationale && (
              <Disclosure title="Why this version">
                <p className="text-sm leading-relaxed text-text-secondary">
                  {recommended.rationale}
                </p>
              </Disclosure>
            )}
            {alternatives.length > 0 && (
              <Disclosure title="Try another hook">
                <ul className="space-y-3">
                  {alternatives.map((hook) => (
                    <li
                      key={hook.rank}
                      className="rounded-xl border border-white/[0.1] bg-[#1e1a2a] px-3 py-3"
                    >
                      <p className="text-sm font-medium text-text-primary">
                        &ldquo;{hook.hook}&rdquo;
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={promoting || pending !== null}
                          onClick={() => useHook(hook.rank)}
                          className="min-h-10 rounded-lg px-3 text-xs font-semibold text-accent hover:bg-white/5 disabled:opacity-50"
                        >
                          Use this hook
                        </button>
                        <HookRowActions
                          hookText={hook.hook}
                          hookEntry={
                            hookLookup ? matchHookInLibrary(hook.hook, hookLookup) : undefined
                          }
                          saveContext={
                            hookSaveBase
                              ? {
                                  ...hookSaveBase,
                                  angleTags: report.angleTags ?? [],
                                  notes: hook.rationale ?? null,
                                  captureKeySuffix: `variant-${hook.rank}`,
                                }
                              : undefined
                          }
                          onSaved={onHookSaved}
                        />
                      </div>
                      {hook.rationale && (
                        <Disclosure title="Why this version">
                          <p className="text-sm text-text-secondary">{hook.rationale}</p>
                        </Disclosure>
                      )}
                    </li>
                  ))}
                </ul>
              </Disclosure>
            )}
            <RemixRow actions={HOOK_REMIX} pending={pending} onRemix={remix} />
          </PlainPanel>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/45">
          Script rewrite
        </h3>
        <div className="mt-4">
          {script ? (
            <>
              <ScriptComparison
                original={originalScript?.trim() || null}
                rewrite={script}
              />
              <RemixRow actions={SCRIPT_REMIX} pending={pending} onRemix={remix} prominent />
            </>
          ) : (
            <p className="text-sm text-white/45">
              Full script rewrite was not generated for this report.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Disclosure({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-10 w-full items-center justify-between gap-3 text-left text-sm font-medium text-white/70 hover:text-white"
      >
        <span>{title}</span>
        <span aria-hidden className="text-xs text-white/40">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && <div className="mt-2 pb-1">{children}</div>}
    </div>
  );
}

function RemixRow({
  actions,
  pending,
  onRemix,
  prominent = false,
}: {
  actions: { kind: AnalysisRemixKind; label: string }[];
  pending: AnalysisRemixKind | null;
  onRemix: (kind: AnalysisRemixKind) => void;
  prominent?: boolean;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
      {actions.map((action) => {
        const busy = pending === action.kind;
        return (
          <button
            key={action.kind}
            type="button"
            disabled={pending !== null}
            onClick={() => onRemix(action.kind)}
            className={
              prominent
                ? "min-h-10 rounded-full border border-white/30 bg-white/[0.1] px-4 text-sm font-semibold text-white hover:border-white/50 hover:bg-white/[0.16] disabled:opacity-50"
                : "min-h-10 rounded-full border border-white/10 px-3 text-xs font-medium text-white/70 hover:border-white/25 hover:text-white disabled:opacity-50"
            }
          >
            {busy ? "Updating…" : action.label}
          </button>
        );
      })}
    </div>
  );
}
