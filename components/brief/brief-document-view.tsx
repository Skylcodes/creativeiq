"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatAnalysisDateTime } from "@/lib/analyses/utils";
import { briefToPlainText, downloadBriefPdf } from "@/lib/briefs/export";
import type { CreativeBrief, CreativeBriefDocument } from "@/lib/types/brief";
import type { HookLibraryEntry } from "@/lib/types/hook";
import { buildHookLookup } from "@/lib/hooks/utils";
import { HookRowActions, matchHookInLibrary } from "@/components/hooks/hook-row-actions";
import { useToast } from "@/components/shared/toast";

type BriefDocumentViewProps = {
  brief: CreativeBrief;
  workspaceName: string;
  savedHooks?: HookLibraryEntry[];
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-black/[0.06] pb-10 last:border-0">
      <h2 className="font-display text-xl font-semibold tracking-tight text-text-primary">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function BriefDocumentView({
  brief,
  workspaceName,
  savedHooks = [],
}: BriefDocumentViewProps) {
  const hookLookup = buildHookLookup(savedHooks);
  const { showToast } = useToast();
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const doc = brief.brief as CreativeBriefDocument | null;
  if (!doc) return null;

  const input = brief.input;
  const analysisUrl = `/analyses/new?platform=${encodeURIComponent(input.platform)}&landing=${encodeURIComponent(input.landingPageUrl)}`;

  async function handleCopy() {
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

  return (
    <div className="relative min-h-full bg-[#fafaf9]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-linear-to-b from-white to-transparent" />

      <div className="relative mx-auto max-w-3xl px-5 pb-24 pt-6 md:px-8 md:pt-10">
        {/* Toolbar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link href="/brief" className="text-sm text-text-muted hover:text-text-primary">
            ← All briefs
          </Link>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleCopy} disabled={copying} className="btn-secondary text-xs">
              {copying ? "Copying…" : "Copy Brief"}
            </button>
            <button type="button" onClick={handlePdf} disabled={downloading} className="btn-secondary text-xs">
              {downloading ? "Generating…" : "Download PDF"}
            </button>
          </div>
        </div>

        {/* Document */}
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white px-8 py-10 shadow-[0_4px_40px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] md:px-12 md:py-14 print:shadow-none print:ring-0"
        >
          <header className="border-b border-black/[0.08] pb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d97706]">
              Creative Brief · {workspaceName}
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
              {doc.angle.name}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              {doc.header.strategicRationale}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[doc.header.campaignGoal, doc.header.platform, doc.header.audienceTemperature, doc.header.productionResources].map((tag) => (
                <span key={tag} className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-medium text-text-secondary">
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs text-text-muted">
              Generated {formatAnalysisDateTime(brief.completed_at ?? brief.created_at)}
            </p>
          </header>

          <div className="mt-10 space-y-10">
            <Section title="The Angle">
              <p className="text-sm leading-relaxed text-text-secondary">{doc.angle.explanation}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-black/[0.02] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">Emotion</p>
                  <p className="mt-1 text-sm text-text-primary">{doc.angle.emotion}</p>
                </div>
                <div className="rounded-xl bg-black/[0.02] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">Belief</p>
                  <p className="mt-1 text-sm text-text-primary">{doc.angle.belief}</p>
                </div>
              </div>
            </Section>

            <Section title="Hook Options">
              <div className="space-y-4">
                {doc.hookOptions.map((h) => {
                  const entry = matchHookInLibrary(h.hook, hookLookup);
                  return (
                  <div key={h.rank} className="rounded-2xl border border-black/[0.06] p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 font-display text-sm font-bold text-accent">
                          {h.rank}
                        </span>
                        <div>
                          <p className="font-medium text-text-primary">&ldquo;{h.hook}&rdquo;</p>
                          {h.openingVisual && (
                            <p className="mt-2 text-xs text-text-muted">
                              <span className="font-semibold">Opening frame:</span> {h.openingVisual}
                            </p>
                          )}
                          <p className="mt-2 text-sm text-text-secondary">{h.rationale}</p>
                        </div>
                      </div>
                      <HookRowActions hookText={h.hook} hookEntry={entry} />
                    </div>
                  </div>
                );
                })}
              </div>
            </Section>

            <Section title="The Script">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-primary">
                {doc.script}
              </pre>
            </Section>

            <Section title="Shot List / Production Guide">
              <ol className="space-y-4">
                {doc.shotList.map((s) => (
                  <li key={s.shotNumber} className="flex gap-4 rounded-xl bg-black/[0.02] p-4">
                    <span className="font-display text-lg font-bold text-accent/60">{s.shotNumber}</span>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{s.onScreen}</p>
                      {s.textOverlay && <p className="mt-1 text-xs text-text-muted">Overlay: {s.textOverlay}</p>}
                      {s.durationSeconds != null && (
                        <p className="mt-1 text-xs text-text-muted">{s.durationSeconds}s</p>
                      )}
                      <p className="mt-2 text-sm text-text-secondary">{s.direction}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>

            <Section title="Production Notes">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                {doc.productionNotes}
              </p>
            </Section>

            <Section title="CTA Guidance">
              <div className="rounded-2xl bg-accent/[0.04] p-5 ring-1 ring-accent/10">
                <p className="text-sm font-semibold text-text-primary">Primary: {doc.ctaGuidance.primary}</p>
                <p className="mt-2 text-sm text-text-secondary">Alternative: {doc.ctaGuidance.alternative}</p>
                <p className="mt-2 text-xs text-text-muted">{doc.ctaGuidance.placement}</p>
                <p className="mt-3 text-sm text-text-secondary">{doc.ctaGuidance.rationale}</p>
              </div>
            </Section>

            <Section title="What To Avoid">
              <ul className="space-y-2">
                {doc.whatToAvoid.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-text-secondary">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ef4444]" />
                    {item}
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </motion.article>

        {/* Loop close */}
        <div className="mt-10 rounded-2xl bg-white p-6 text-center ring-1 ring-black/[0.04] print:hidden">
          <p className="text-sm text-text-secondary">
            Filmed your ad? Run it through CreativeIQ to see how it performs before you spend.
          </p>
          <Link
            href={analysisUrl}
            className="btn-primary mt-4 inline-flex text-sm"
          >
            Generate New Analysis From This Brief
          </Link>
        </div>
      </div>
    </div>
  );
}
