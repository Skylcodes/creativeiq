"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatAnalysisDateTime } from "@/lib/analyses/utils";
import { getBriefPlatforms } from "@/lib/briefs/constants";
import { briefToPlainText, downloadBriefPdf } from "@/lib/briefs/export";
import type { CreativeBrief, CreativeBriefDocument } from "@/lib/types/brief";
import type { HookLibraryEntry } from "@/lib/types/hook";
import { buildHookLookup } from "@/lib/hooks/utils";
import {
  HookRowActions,
  matchHookInLibrary,
} from "@/components/hooks/hook-row-actions";
import { useToast } from "@/components/shared/toast";
import { PageShell } from "@/components/ui/page-shell";

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
    <section className="border-b border-white/[0.08] pb-10 last:border-0">
      <h2 className="font-display text-xl font-semibold tracking-tight text-white">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const briefBody = "text-[15px] leading-[1.72] text-white/85";
const briefSupport = "text-sm leading-relaxed text-white/55";
const briefMeta = "text-xs text-white/45";
const briefLabel = "text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40";

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
  const primaryPlatform = getBriefPlatforms(input)[0] ?? "";
  const analysisUrl = `/analyses/new?platform=${encodeURIComponent(primaryPlatform)}&landing=${encodeURIComponent(input.landingPageUrl)}`;

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
    <PageShell grid={false} className="pb-24 print:bg-white print:p-0">
      <div className="relative mx-auto max-w-5xl">
        {/* Toolbar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link
            href="/brief"
            className="text-sm text-white/45 hover:text-white"
          >
            ← All briefs
          </Link>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={copying}
              className="btn-outline text-xs"
            >
              {copying ? "Copying…" : "Copy Brief"}
            </button>
            <button
              type="button"
              onClick={handlePdf}
              disabled={downloading}
              className="btn-outline text-xs"
            >
              {downloading ? "Generating…" : "Download PDF"}
            </button>
          </div>
        </div>

        {/* Document */}
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="dash-card px-8 py-10 md:px-12 md:py-14 print:shadow-none"
        >
          <header className="border-b border-white/[0.08] pb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-400">
              Creative Brief · {workspaceName}
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
              {doc.angle.name}
            </h1>
            <p className={`mt-4 ${briefBody}`}>
              {doc.header.strategicRationale}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                doc.header.campaignGoal,
                doc.header.platform,
                doc.header.audienceTemperature,
                doc.header.productionResources,
              ].map((tag) => (
                <span
                  key={tag}
                  className="insight-chip text-[11px] font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className={`mt-4 ${briefMeta}`}>
              Generated{" "}
              {formatAnalysisDateTime(brief.completed_at ?? brief.created_at)}
            </p>
          </header>

          <div className="mt-10 space-y-10">
            <Section title="The Angle">
              <p className={briefBody}>{doc.angle.explanation}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="app-inset rounded-xl p-4">
                  <p className={briefLabel}>Emotion</p>
                  <p className="mt-1 text-sm font-medium text-white/85">
                    {doc.angle.emotion}
                  </p>
                </div>
                <div className="app-inset rounded-xl p-4">
                  <p className={briefLabel}>Belief</p>
                  <p className="mt-1 text-sm font-medium text-white/85">
                    {doc.angle.belief}
                  </p>
                </div>
              </div>
            </Section>

            <Section title="Hook Options">
              <div className="space-y-4">
                {doc.hookOptions.map((h) => {
                  const entry = matchHookInLibrary(h.hook, hookLookup);
                  return (
                    <div
                      key={h.rank}
                      className="app-inset rounded-xl p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 font-display text-sm font-bold text-accent">
                            {h.rank}
                          </span>
                          <div>
                            <p className="font-medium text-white/85">
                              &ldquo;{h.hook}&rdquo;
                            </p>
                            {h.openingVisual && (
                              <p className={`mt-2 ${briefMeta}`}>
                                <span className="font-semibold text-white/55">
                                  Opening frame:
                                </span>{" "}
                                {h.openingVisual}
                              </p>
                            )}
                            <p className={`mt-2 ${briefSupport}`}>
                              {h.rationale}
                            </p>
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
              <pre className={`whitespace-pre-wrap font-sans ${briefBody}`}>
                {doc.script}
              </pre>
            </Section>

            <Section title="Shot List / Production Guide">
              <ol className="space-y-4">
                {doc.shotList.map((s) => (
                  <li
                    key={s.shotNumber}
                    className="flex gap-4 app-inset rounded-xl p-4"
                  >
                    <span className="font-display text-lg font-bold text-accent">
                      {s.shotNumber}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white/85">
                        {s.onScreen}
                      </p>
                      {s.textOverlay && (
                        <p className={`mt-1 ${briefMeta}`}>
                          Overlay: {s.textOverlay}
                        </p>
                      )}
                      {s.durationSeconds != null && (
                        <p className={`mt-1 ${briefMeta}`}>
                          {s.durationSeconds}s
                        </p>
                      )}
                      <p className={`mt-2 ${briefSupport}`}>
                        {s.direction}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>

            <Section title="Production Notes">
              <p className={`whitespace-pre-wrap ${briefBody}`}>
                {doc.productionNotes}
              </p>
            </Section>

            <Section title="CTA Guidance">
              <div className="app-inset rounded-xl p-5">
                <p className="text-sm font-semibold text-white/85">
                  Primary: {doc.ctaGuidance.primary}
                </p>
                <p className={`mt-2 ${briefSupport}`}>
                  Alternative: {doc.ctaGuidance.alternative}
                </p>
                <p className={`mt-2 ${briefMeta}`}>
                  {doc.ctaGuidance.placement}
                </p>
                <p className={`mt-3 ${briefSupport}`}>
                  {doc.ctaGuidance.rationale}
                </p>
              </div>
            </Section>

            <Section title="What To Avoid">
              <ul className="space-y-2">
                {doc.whatToAvoid.map((item, i) => (
                  <li
                    key={i}
                    className={`flex gap-2 ${briefSupport}`}
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ef4444]" />
                    {item}
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </motion.article>

        {/* Loop close */}
        <div className="dash-card mt-10 p-6 text-center print:hidden">
          <p className={briefSupport}>
            Filmed your ad? Run it through Advara to see how it performs
            before you spend.
          </p>
          <Link
            href={analysisUrl}
            className="btn-premium mt-4 inline-flex text-sm"
          >
            Generate New Analysis From This Brief
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
