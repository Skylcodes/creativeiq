"use client";

import { useState } from "react";
import type { AnalysisReport, AgentFinding } from "@/lib/types/report";
import type { HookLibraryEntry } from "@/lib/types/hook";
import { agentsForReport } from "@/lib/report/agents";
import { AgentIcon } from "../shared/agent-icon";
import { CopyButton } from "../shared/copy-button";
import {
  HookRowActions,
  matchHookInLibrary,
  type HookSaveContext,
} from "@/components/hooks/hook-row-actions";
import { PremiumCard } from "@/components/ui/premium-card";
import { CreativeScoreBreakdownCard } from "../shared/creative-score-breakdown";

type CreativeAnalysisSectionProps = {
  report: AnalysisReport;
  originalScript?: string | null;
  hookLookup?: Map<string, HookLibraryEntry>;
  hookSaveBase?: HookSaveContext;
  onHookSaved?: (hook: HookLibraryEntry) => void;
};

/** Short, plain takeaway for agent cards — prefer first key finding over long summaries. */
function agentQuickTake(finding: AgentFinding | undefined): string {
  const findingLine = finding?.keyFindings?.[0]?.trim();
  if (findingLine) {
    const sentence = findingLine.split(/(?<=[.!?])\s+/)[0] ?? findingLine;
    return sentence.length > 160 ? `${sentence.slice(0, 157).trim()}…` : sentence;
  }

  const summary = finding?.summary?.trim();
  if (!summary) return "No quick takeaway available.";

  const first = summary.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  return first.length > 180 ? `${first.slice(0, 177).trim()}…` : first;
}

function agentBullets(finding: AgentFinding | undefined): string[] {
  return (finding?.keyFindings ?? [])
    .slice(0, 3)
    .map((line) => {
      const sentence = line.split(/(?<=[.!?])\s+/)[0] ?? line;
      return sentence.length > 120 ? `${sentence.slice(0, 117).trim()}…` : sentence;
    });
}

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
  report,
  originalScript,
  hookLookup,
  hookSaveBase,
  onHookSaved,
}: CreativeAnalysisSectionProps) {
  const [agentsOpen, setAgentsOpen] = useState(false);

  const allHooks = [...report.hookVariants].sort((a, b) => a.rank - b.rank);
  const hookStrong = (report.creativeStrengthScore ?? 0) >= 80;
  const hooks = hookStrong ? allHooks.slice(0, 1) : allHooks.slice(0, 5);

  const featuredAgents = agentsForReport(report).filter(
    (a) => a.id === "skeptical_buyer" || a.id === "direct_response"
  );

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

      {hooks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/45">
            Hook rewrites
          </h3>
          <div className="mt-4 space-y-3">
            {hooks.map((hook) => {
              const entry = hookLookup
                ? matchHookInLibrary(hook.hook, hookLookup)
                : undefined;
              return (
                <PremiumCard
                  key={hook.rank}
                  padding="md"
                  className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      {hookStrong ? "Optimization" : `Hook #${hook.rank}`}
                    </p>
                    <p className="mt-2 font-display text-lg font-semibold leading-snug text-text-primary md:text-xl">
                      &ldquo;{hook.hook}&rdquo;
                    </p>
                    {hook.rationale && (
                      <p className="mt-2 text-sm text-text-secondary">{hook.rationale}</p>
                    )}
                  </div>
                  <HookRowActions
                    hookText={hook.hook}
                    hookEntry={entry}
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
                </PremiumCard>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/45">
          Script rewrite
        </h3>
        <div className="mt-4">
          {report.scriptRewrite ? (
            <ScriptComparison
              original={originalScript?.trim() || null}
              rewrite={report.scriptRewrite}
            />
          ) : (
            <p className="text-sm text-white/45">
              Full script rewrite was not generated for this report.
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/45">
            Agent insights
          </h3>
          <button
            type="button"
            onClick={() => setAgentsOpen((o) => !o)}
            className="text-xs font-semibold text-accent-tertiary lg:hidden"
          >
            {agentsOpen ? "Collapse" : "Expand"}
          </button>
        </div>

        <div className={`mt-4 space-y-3 ${agentsOpen ? "block" : "hidden lg:block"}`}>
          {featuredAgents.map((agent) => {
            const finding = report.agentFindings.find((f) => f.agentId === agent.id);
            const bullets = agentBullets(finding);
            return (
              <PremiumCard key={agent.id} padding="md">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                    <AgentIcon icon={agent.icon} size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary">{agent.name}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                      {agentQuickTake(finding)}
                    </p>
                    {bullets.length > 1 && (
                      <ul className="mt-3 space-y-1.5">
                        {bullets.slice(1).map((item, i) => (
                          <li key={i} className="flex gap-2 text-sm text-text-primary">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </PremiumCard>
            );
          })}
        </div>

        {!agentsOpen && (
          <button
            type="button"
            onClick={() => setAgentsOpen(true)}
            className="mt-3 text-sm font-medium text-accent-tertiary lg:hidden"
          >
            Show agent insights →
          </button>
        )}
      </div>
    </section>
  );
}
