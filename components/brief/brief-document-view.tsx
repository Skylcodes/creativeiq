"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatAnalysisDateTime } from "@/lib/analyses/utils";
import {
  getBriefPlatforms,
  isStaticCreative,
  PRODUCTION_RESOURCES,
  STATIC_DURATIONS,
  VIDEO_DURATIONS_META,
  VIDEO_DURATIONS_TIKTOK,
} from "@/lib/briefs/constants";
import {
  scriptBeats,
  shotRows,
  splitLead,
  splitProductionNotes,
  type ScriptBeat,
} from "@/lib/briefs/execution-view";
import { briefToPlainText, downloadBriefPdf } from "@/lib/briefs/export";
import { promoteBriefHook, remixBriefSection } from "@/lib/briefs/actions";
import type { BriefRemixKind, CreativeBrief, CreativeBriefDocument } from "@/lib/types/brief";
import type { HookLibraryEntry } from "@/lib/types/hook";
import { buildHookLookup } from "@/lib/hooks/utils";
import { matchHookInLibrary, HookRowActions } from "@/components/hooks/hook-row-actions";
import { useToast } from "@/components/shared/toast";
import { PageShell } from "@/components/ui/page-shell";

type BriefDocumentViewProps = {
  brief: CreativeBrief;
  workspaceName: string;
  savedHooks?: HookLibraryEntry[];
};

const FLOW = [
  { id: "do-this", label: "Brief" },
  { id: "script", label: "Script" },
  { id: "shoot", label: "Shoot" },
  { id: "post", label: "Post" },
] as const;

const HOOK_REMIX: { kind: BriefRemixKind; label: string }[] = [
  { kind: "hook_punchier", label: "Make punchier" },
  { kind: "hook_natural", label: "Make more natural" },
  { kind: "hook_alternatives", label: "Give alternatives" },
];

const SCRIPT_REMIX: { kind: BriefRemixKind; label: string }[] = [
  { kind: "script_shorten", label: "Shorten" },
  { kind: "script_conversational", label: "Make more conversational" },
  { kind: "script_direct", label: "Make more direct" },
];

const SHOT_REMIX: { kind: BriefRemixKind; label: string }[] = [
  { kind: "shots_simplify", label: "Simplify" },
  { kind: "shots_broll", label: "Add B-roll" },
  { kind: "shots_easier", label: "Make easier to film" },
];

function durationLabel(id: string): string {
  const all = [
    ...VIDEO_DURATIONS_TIKTOK,
    ...VIDEO_DURATIONS_META,
    ...STATIC_DURATIONS,
  ];
  return all.find((option) => option.id === id)?.label ?? id;
}

function toneChip(emotion: string): string | null {
  const value = emotion.trim();
  if (!value || value.length > 36) return null;
  return value;
}

export function BriefDocumentView({
  brief,
  workspaceName,
  savedHooks = [],
}: BriefDocumentViewProps) {
  const hookLookup = buildHookLookup(savedHooks);
  const { showToast } = useToast();
  const [doc, setDoc] = useState<CreativeBriefDocument | null>(
    brief.brief as CreativeBriefDocument | null
  );
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState<BriefRemixKind | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [activeStep, setActiveStep] = useState<string>("do-this");

  useEffect(() => {
    const nodes = FLOW.map((step) => document.getElementById(step.id)).filter(
      (node): node is HTMLElement => Boolean(node)
    );
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveStep(visible.target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.2, 0.6] }
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [doc]);

  const input = brief.input;
  const beats = useMemo(
    () => (doc ? scriptBeats(doc.script, doc.shotList) : []),
    [doc]
  );
  const shots = useMemo(() => (doc ? shotRows(doc.shotList) : []), [doc]);
  const notes = useMemo(
    () => (doc ? splitProductionNotes(doc.productionNotes) : { items: [], extra: "" }),
    [doc]
  );

  if (!doc) return null;

  const primaryPlatform = getBriefPlatforms(input)[0] ?? "";
  const analysisUrl = `/analyses/new?platform=${encodeURIComponent(primaryPlatform)}&landing=${encodeURIComponent(input.landingPageUrl)}`;
  const recommended = [...doc.hookOptions].sort((a, b) => a.rank - b.rank)[0];
  const alternatives = [...doc.hookOptions]
    .sort((a, b) => a.rank - b.rank)
    .slice(1);
  const resource = PRODUCTION_RESOURCES.find((item) => item.id === input.productionResource);
  const format = resource?.label ?? doc.header.productionResources;
  const length = durationLabel(input.creativeDuration);
  const tone = toneChip(doc.angle.emotion);
  const rationale = splitLead(doc.header.strategicRationale);
  const summary = rationale.lead;
  const rationaleRest = rationale.rest;
  const showRecording = !isStaticCreative(input.creativeDuration);
  const avoidVisible = doc.whatToAvoid.slice(0, 5);
  const avoidRest = doc.whatToAvoid.slice(5);

  async function copyText(text: string, success: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(success);
    } catch {
      showToast("Could not copy.");
    }
  }

  async function handleCopyBrief() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(briefToPlainText(doc!));
      showToast("Brief copied to clipboard.");
    } catch {
      showToast("Could not copy brief.");
    } finally {
      setCopying(false);
    }
  }

  async function handlePdf() {
    setDownloading(true);
    try {
      const slug = doc!.angle.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      await downloadBriefPdf(doc!, `creative-brief-${slug}.pdf`);
    } catch {
      showToast("Could not generate PDF.");
    } finally {
      setDownloading(false);
    }
  }

  async function remix(kind: BriefRemixKind) {
    setPending(kind);
    const result = await remixBriefSection(brief.id, kind);
    setPending(null);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    if (result.brief.brief) setDoc(result.brief.brief);
    showToast("Updated.");
  }

  async function useHook(rank: number) {
    setPromoting(true);
    const result = await promoteBriefHook(brief.id, rank);
    setPromoting(false);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    if (result.brief.brief) setDoc(result.brief.brief);
  }

  return (
    <PageShell grid={false} className="print:bg-white print:p-0">
      <div className="relative mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/brief" className="text-sm text-white/45 hover:text-white">
            ← All briefs
          </Link>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleCopyBrief} disabled={copying} className="btn-outline min-h-10 text-xs">
              {copying ? "Copying…" : "Copy brief"}
            </button>
            <button type="button" onClick={handlePdf} disabled={downloading} className="btn-outline min-h-10 text-xs">
              {downloading ? "Generating…" : "Download PDF"}
            </button>
          </div>
        </div>

        <Flow steps={FLOW} active={activeStep} />

        <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-8">
          <aside className="mb-4 hidden lg:block">
            <div className="sticky top-20 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                {workspaceName}
              </p>
              <ol className="space-y-2">
                {FLOW.map((step) => (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => scrollToBriefSection(step.id)}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                        activeStep === step.id
                          ? "bg-accent/15 font-semibold text-white"
                          : "text-white/50 hover:text-white"
                      }`}
                    >
                      {step.label}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <header className="dash-card px-4 py-4 sm:px-5">
              <h1 className="font-display text-2xl font-bold tracking-tight text-white">
                {doc.angle.name}
              </h1>
              <p className="mt-1 text-sm text-white/55">
                {length} · {doc.header.platform}
              </p>
              {summary && (
                <p className="mt-3 text-sm leading-relaxed text-white/75">{summary}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <MetaChip label="Goal" value={doc.header.campaignGoal} />
                {tone && <MetaChip label="Tone" value={tone} />}
                <MetaChip label="Format" value={format} />
              </div>
              <p className="mt-3 text-[11px] text-white/35">
                Generated {formatAnalysisDateTime(brief.completed_at ?? brief.created_at)}
              </p>
            </header>

            <section id="do-this" className="dash-card scroll-mt-24 border border-accent/30 px-4 py-4 sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                Do this
              </p>
              <h2 className="mt-2 font-display text-lg font-semibold text-white">
                Recommended hook
              </h2>
              {recommended ? (
                <>
                  <p className="mt-3 text-lg font-medium leading-snug text-white">
                    “{recommended.hook}”
                  </p>
                  {recommended.openingVisual && (
                    <p className="mt-2 text-sm text-white/55">
                      Open on: {recommended.openingVisual}
                    </p>
                  )}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => copyText(recommended.hook, "Hook copied.")}
                      className="btn-premium min-h-11 text-sm"
                    >
                      Copy hook
                    </button>
                  </div>
                  <Disclosure title="Why this hook?">
                    <p className="text-sm leading-relaxed text-white/65">{recommended.rationale}</p>
                  </Disclosure>
                </>
              ) : (
                <p className="mt-3 text-sm text-white/55">No hook on this brief.</p>
              )}

              {alternatives.length > 0 && (
                <Disclosure title="Try another hook">
                  <ul className="space-y-3">
                    {alternatives.map((hook) => {
                      const entry = matchHookInLibrary(hook.hook, hookLookup);
                      return (
                        <li key={hook.rank} className="app-inset rounded-xl px-3 py-3">
                          <p className="text-sm font-medium text-white/90">“{hook.hook}”</p>
                          {hook.rationale && (
                            <Disclosure title="Why this version">
                              <p className="text-sm text-white/65">{hook.rationale}</p>
                            </Disclosure>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={promoting}
                              onClick={() => useHook(hook.rank)}
                              className="min-h-10 rounded-lg px-3 text-xs font-semibold text-accent hover:bg-white/5 disabled:opacity-50"
                            >
                              Use this hook
                            </button>
                            <HookRowActions hookText={hook.hook} hookEntry={entry} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Disclosure>
              )}

              <RemixRow
                actions={HOOK_REMIX}
                pending={pending}
                onRemix={remix}
              />
            </section>

            <section id="script" className="dash-card scroll-mt-24 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-white">Script</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyText(doc.script, "Script copied.")}
                    className="btn-premium min-h-11 text-sm"
                  >
                    Copy script
                  </button>
                  {showRecording && (
                    <button
                      type="button"
                      onClick={() => setRecording(true)}
                      className="btn-outline min-h-11 text-sm"
                    >
                      Recording mode
                    </button>
                  )}
                </div>
              </div>
              <BeatList beats={beats} />
              <RemixRow actions={SCRIPT_REMIX} pending={pending} onRemix={remix} />
            </section>

            <section id="shoot" className="dash-card scroll-mt-24 px-4 py-4 sm:px-5">
              <h2 className="font-display text-lg font-semibold text-white">Shoot this</h2>
              <ol className="mt-3 space-y-2">
                {shots.map((shot) => (
                  <ShotItem key={shot.shotNumber} shot={shot} />
                ))}
              </ol>
              <RemixRow actions={SHOT_REMIX} pending={pending} onRemix={remix} />

              {(notes.items.length > 0 || notes.extra) && (
                <div className="mt-5 border-t border-white/10 pt-4">
                  {notes.items.length > 0 && (
                    <>
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                        Recording checklist
                      </h3>
                      <ul className="mt-2 space-y-1.5">
                        {notes.items.map((item) => (
                          <li key={item} className="flex gap-2 text-sm text-white/80">
                            <span className="text-accent" aria-hidden>
                              ✓
                            </span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {notes.extra && (
                    <Disclosure title="Advanced filming tips">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/65">
                        {notes.extra}
                      </p>
                    </Disclosure>
                  )}
                </div>
              )}
            </section>

            <section id="post" className="dash-card scroll-mt-24 px-4 py-4 sm:px-5">
              <h2 className="font-display text-lg font-semibold text-white">CTA</h2>
              <p className="mt-3 text-base font-medium text-white">
                {doc.ctaGuidance.primary}
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => copyText(doc.ctaGuidance.primary, "CTA copied.")}
                  className="btn-outline min-h-11 text-sm"
                >
                  Copy CTA
                </button>
              </div>
              {(doc.ctaGuidance.alternative ||
                doc.ctaGuidance.placement ||
                doc.ctaGuidance.rationale) && (
                <Disclosure title="Why this CTA?">
                  <div className="space-y-2 text-sm text-white/65">
                    {doc.ctaGuidance.alternative && (
                      <p>Backup: {doc.ctaGuidance.alternative}</p>
                    )}
                    {doc.ctaGuidance.placement && <p>{doc.ctaGuidance.placement}</p>}
                    {doc.ctaGuidance.rationale && <p>{doc.ctaGuidance.rationale}</p>}
                  </div>
                </Disclosure>
              )}
            </section>

            {avoidVisible.length > 0 && (
              <section className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-4 sm:px-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                  Avoid
                </h2>
                <ul className="mt-3 space-y-2">
                  {avoidVisible.map((item) => (
                    <AvoidItem key={item} item={item} />
                  ))}
                </ul>
                {avoidRest.length > 0 && (
                  <Disclosure title="See full guidance">
                    <ul className="space-y-2">
                      {avoidRest.map((item) => (
                        <AvoidItem key={item} item={item} />
                      ))}
                    </ul>
                  </Disclosure>
                )}
              </section>
            )}

            <Disclosure title="Why this brief" prominent>
              <dl className="space-y-3 text-sm text-white/70">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    Angle
                  </dt>
                  <dd className="mt-1 text-white/85">{doc.angle.explanation}</dd>
                </div>
                {rationaleRest && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                      Why this angle
                    </dt>
                    <dd className="mt-1">{rationaleRest}</dd>
                  </div>
                )}
                {doc.header.targetAudience && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                      Audience
                    </dt>
                    <dd className="mt-1">
                      {doc.header.targetAudience}
                      {doc.header.audienceTemperature
                        ? ` · ${doc.header.audienceTemperature}`
                        : ""}
                    </dd>
                  </div>
                )}
                {doc.angle.belief && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                      Belief
                    </dt>
                    <dd className="mt-1">{doc.angle.belief}</dd>
                  </div>
                )}
                {doc.angle.emotion && !tone && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                      Tone
                    </dt>
                    <dd className="mt-1">{doc.angle.emotion}</dd>
                  </div>
                )}
              </dl>
            </Disclosure>

            <p className="px-1 pb-2 text-sm text-white/40 print:hidden">
              Filmed it?{" "}
              <Link href={analysisUrl} className="text-accent hover:underline">
                Run the ad through analysis
              </Link>
            </p>
          </div>
        </div>
      </div>

      {recording && (
        <RecordingMode beats={beats} script={doc.script} onClose={() => setRecording(false)} onCopy={() => copyText(doc.script, "Script copied.")} />
      )}
    </PageShell>
  );
}

function scrollToBriefSection(id: string) {
  const node = document.getElementById(id);
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "start" });
}

function AvoidItem({ item }: { item: string }) {
  return (
    <li className="flex gap-3 rounded-xl border border-amber-400/20 bg-[#120e08]/80 px-3 py-2.5 text-sm leading-relaxed text-white/90">
      <span
        aria-hidden
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-400/15 text-[11px] font-bold text-amber-300"
      >
        !
      </span>
      <span>{item}</span>
    </li>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="insight-chip text-[11px] font-medium">
      <span className="text-white/45">{label}: </span>
      {value}
    </span>
  );
}

function Flow({
  steps,
  active,
}: {
  steps: readonly { id: string; label: string }[];
  active: string;
}) {
  return (
    <p className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35 lg:hidden">
      {steps.map((step, index) => (
        <span key={step.id} className="inline-flex items-center gap-1.5">
          {index > 0 && <span aria-hidden>→</span>}
          <button
            type="button"
            onClick={() => scrollToBriefSection(step.id)}
            className={active === step.id ? "text-white" : "hover:text-white/70"}
            aria-current={active === step.id ? "location" : undefined}
          >
            {step.label}
          </button>
        </span>
      ))}
    </p>
  );
}

function BeatList({ beats }: { beats: ScriptBeat[] }) {
  if (beats.length === 0) {
    return <p className="mt-4 text-sm text-white/50">No script yet.</p>;
  }
  return (
    <ol className="mt-4 space-y-4">
      {beats.map((beat, index) => (
        <li key={`${beat.label}-${index}`}>
          <div className="flex items-baseline gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
            {beat.timeLabel && <span>{beat.timeLabel}</span>}
            <span>{beat.label}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-white/90">
            {beat.text}
          </p>
        </li>
      ))}
    </ol>
  );
}

function ShotItem({
  shot,
}: {
  shot: ReturnType<typeof shotRows>[number];
}) {
  const hasDetail = Boolean(shot.detail || shot.overlay);
  const [open, setOpen] = useState(false);
  const number = String(shot.shotNumber).padStart(2, "0");

  return (
    <li className="app-inset rounded-xl">
      {hasDetail ? (
        <button
          type="button"
          className="flex w-full items-start gap-3 px-3 py-3 text-left"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <ShotSummary shot={shot} number={number} />
          <span className="mt-1 text-xs text-white/40">{open ? "Hide" : "Details"}</span>
        </button>
      ) : (
        <div className="px-3 py-3">
          <ShotSummary shot={shot} number={number} />
        </div>
      )}
      {open && (
        <div className="space-y-1 border-t border-white/10 px-3 py-3 text-sm text-white/60">
          {shot.detail && <p>{shot.detail}</p>}
          {shot.overlay && <p>On-screen text: {shot.overlay}</p>}
        </div>
      )}
    </li>
  );
}

function ShotSummary({
  shot,
  number,
}: {
  shot: ReturnType<typeof shotRows>[number];
  number: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-white">
        {number} — {shot.name}
      </p>
      {shot.timeLabel && <p className="text-xs text-white/40">{shot.timeLabel}</p>}
      <p className="mt-1 line-clamp-2 text-sm text-white/70">{shot.action}</p>
    </div>
  );
}

function Disclosure({
  title,
  children,
  prominent = false,
}: {
  title: string;
  children: React.ReactNode;
  prominent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={prominent ? "dash-card px-4 py-3 sm:px-5" : "mt-4"}>
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
      {open && <div className="mt-3 pb-1">{children}</div>}
    </div>
  );
}

function RemixRow({
  actions,
  pending,
  onRemix,
}: {
  actions: { kind: BriefRemixKind; label: string }[];
  pending: BriefRemixKind | null;
  onRemix: (kind: BriefRemixKind) => void;
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
            className="min-h-10 rounded-full border border-white/10 px-3 text-xs font-medium text-white/60 hover:border-white/25 hover:text-white disabled:opacity-50"
          >
            {busy ? "Updating…" : action.label}
          </button>
        );
      })}
    </div>
  );
}

function RecordingMode({
  beats,
  script,
  onClose,
  onCopy,
}: {
  beats: ScriptBeat[];
  script: string;
  onClose: () => void;
  onCopy: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recording mode"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#09080e] px-4 py-5"
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <button type="button" onClick={onClose} className="min-h-11 text-sm text-white/70">
          Close
        </button>
        <button type="button" onClick={onCopy} className="btn-premium min-h-11 text-sm">
          Copy script
        </button>
      </div>
      <div className="mx-auto mt-6 max-w-lg">
        {beats.length > 0 ? (
          <BeatList beats={beats} />
        ) : (
          <p className="whitespace-pre-wrap text-lg leading-relaxed text-white">{script}</p>
        )}
      </div>
    </div>
  );
}
