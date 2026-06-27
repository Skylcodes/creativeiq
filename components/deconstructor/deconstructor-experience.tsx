"use client";

import Link from "next/link";
import { PremiumCard } from "@/components/ui/premium-card";
import { PageShell } from "@/components/ui/page-shell";
import type { AdDeconstruction, DeconstructionReport } from "@/lib/types/deconstruction";
import { CriteriaChecklist } from "@/components/report/shared/criteria-checklist";

type DeconstructorExperienceProps = {
  deconstruction: AdDeconstruction;
  creativePreviewUrl?: string | null;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold tracking-[-0.035em] text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DeconstructorExperience({
  deconstruction,
  creativePreviewUrl,
}: DeconstructorExperienceProps) {
  const report = deconstruction.report as DeconstructionReport | null;

  if (deconstruction.status === "processing") {
    return (
      <PageShell>
        <p className="text-white/55">Still processing…</p>
      </PageShell>
    );
  }

  if (deconstruction.status === "failed" || !report) {
    return (
      <PageShell>
        <h1 className="font-display text-2xl font-semibold text-white">
          Deconstruction failed
        </h1>
        <p className="mt-2 text-sm text-white/55">
          {deconstruction.error_message ?? "Something went wrong."}
        </p>
        <Link href="/deconstructor/new" className="btn-premium mt-6 inline-flex">
          Try again
        </Link>
      </PageShell>
    );
  }

  const { mode } = report;
  const isHonest = mode === "honest_analysis";

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.045em] text-white md:text-3xl">
          {deconstruction.title}
        </h1>
        <Link href="/deconstructor" className="btn-ghost text-sm">
          All deconstructions
        </Link>
      </div>

      {creativePreviewUrl && (
        <PremiumCard padding="md" className="dash-card mt-6 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={creativePreviewUrl}
            alt=""
            className="max-h-80 w-full rounded-2xl object-contain"
          />
        </PremiumCard>
      )}

      <div className="mt-8 space-y-10">
        {isHonest && report.honestAnalysis && (
          <>
            {report.honestAnalysis.strengths.length > 0 && (
              <Section title="What actually works">
                <ul className="space-y-2">
                  {report.honestAnalysis.strengths.map((s) => (
                    <li key={s} className="app-inset rounded-xl p-4 text-sm text-white/85">
                      {s}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {report.honestAnalysis.weaknesses.length > 0 && (
              <Section title="Weaknesses (plain assessment)">
                <ul className="space-y-2">
                  {report.honestAnalysis.weaknesses.map((w) => (
                    <li key={w} className="app-inset rounded-xl p-4 text-sm text-white/85">
                      {w}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {report.honestAnalysis.lessonsExtracted.length > 0 && (
              <Section title="Lessons worth extracting">
                <ul className="space-y-2">
                  {report.honestAnalysis.lessonsExtracted.map((l) => (
                    <li key={l} className="app-inset rounded-xl p-4 text-sm text-white/55">
                      {l}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {report.honestAnalysis.criteriaChecklist.length > 0 && (
              <CriteriaChecklist
                items={report.honestAnalysis.criteriaChecklist.map((c) => ({
                  ...c,
                  category: "creative" as const,
                }))}
              />
            )}
          </>
        )}

        {!isHonest && report.deconstruction && (
          <>
            <Section title="Psychological trigger">
              <PremiumCard padding="lg" className="dash-card">
                <p className="text-[15px] leading-relaxed text-white/85">
                  {report.deconstruction.psychologicalTrigger}
                </p>
              </PremiumCard>
            </Section>

            <Section title="Structural framework">
              <div className="space-y-3">
                {report.deconstruction.structuralFramework.map((beat, i) => (
                  <PremiumCard key={beat.role} padding="md" className="dash-card">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-accent-tertiary">
                      Beat {i + 1} · {beat.role}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white/85">
                      {beat.description}
                    </p>
                  </PremiumCard>
                ))}
              </div>
            </Section>

            <Section title="Offer mechanics">
              <PremiumCard padding="lg" className="dash-card">
                <p className="text-[15px] leading-relaxed text-white/85">
                  {report.deconstruction.offerMechanics}
                </p>
              </PremiumCard>
            </Section>

            <Section title="Visual & production">
              <PremiumCard padding="lg" className="dash-card">
                <p className="text-[15px] leading-relaxed text-white/85">
                  {report.deconstruction.visualProduction}
                </p>
              </PremiumCard>
            </Section>

            {(report.deconstruction.marketComparison ||
              (report.deconstruction.competitiveInsights?.length ?? 0) > 0) && (
              <Section title="Market comparison">
                <PremiumCard padding="lg" className="dash-card space-y-4">
                  {report.deconstruction.marketComparison && (
                    <p className="text-[15px] leading-relaxed text-white/85">
                      {report.deconstruction.marketComparison}
                    </p>
                  )}
                  {report.deconstruction.competitiveInsights &&
                    report.deconstruction.competitiveInsights.length > 0 && (
                      <ul className="space-y-2 border-t border-white/[0.08] pt-4">
                        {report.deconstruction.competitiveInsights.map((insight, i) => (
                          <li
                            key={i}
                            className="flex gap-2 text-sm text-white/55"
                          >
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    )}
                </PremiumCard>
              </Section>
            )}
          </>
        )}

        {!isHonest && report.brandTranslation && (
          <Section title="Translated to your brand">
            <PremiumCard variant="accent" padding="lg" className="dash-card space-y-6">
              <p className="text-xs font-medium text-accent-tertiary">
                Strategic translation — not a copy of the original ad
              </p>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  New hook for your brand
                </p>
                <p className="mt-2 text-lg font-medium leading-relaxed text-white">
                  &ldquo;{report.brandTranslation.hook}&rdquo;
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Structural outline
                </p>
                <div className="mt-3 space-y-2">
                  {report.brandTranslation.structuralOutline.map((beat) => (
                    <div
                      key={beat.role}
                      className="app-inset rounded-2xl px-4 py-3 text-sm"
                    >
                      <span className="font-semibold text-white">{beat.role}:</span>{" "}
                      {beat.description}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Offer translation
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/85">
                  {report.brandTranslation.offerTranslation}
                </p>
              </div>
              <p className="border-t border-white/[0.08] pt-4 text-xs leading-relaxed text-white/45">
                {report.brandTranslation.disclaimer}
              </p>
            </PremiumCard>
          </Section>
        )}
      </div>
    </PageShell>
  );
}
