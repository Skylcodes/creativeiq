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
      <h2 className="font-display text-xl font-semibold tracking-[-0.035em] text-text-primary">{title}</h2>
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
        <p className="text-text-secondary">Still processing…</p>
      </PageShell>
    );
  }

  if (deconstruction.status === "failed" || !report) {
    return (
      <PageShell>
        <h1 className="font-display text-2xl font-semibold text-text-primary">
          Deconstruction failed
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
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
        <h1 className="font-display text-2xl font-semibold tracking-[-0.045em] text-text-primary md:text-3xl">
          {deconstruction.title}
        </h1>
        <Link href="/deconstructor" className="btn-ghost text-sm">
          All deconstructions
        </Link>
      </div>

      {creativePreviewUrl && (
        <PremiumCard padding="md" className="mt-6 overflow-hidden">
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
                    <li key={s} className="premium-card premium-card-glass p-4 text-sm text-text-primary">
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
                    <li key={w} className="premium-card premium-card-glass p-4 text-sm text-text-primary">
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
                    <li key={l} className="premium-card premium-card-glass p-4 text-sm text-text-secondary">
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
              <PremiumCard padding="lg">
                <p className="text-[15px] leading-relaxed text-text-primary">
                  {report.deconstruction.psychologicalTrigger}
                </p>
              </PremiumCard>
            </Section>

            <Section title="Structural framework">
              <div className="space-y-3">
                {report.deconstruction.structuralFramework.map((beat, i) => (
                  <PremiumCard key={beat.role} padding="md">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                      Beat {i + 1} · {beat.role}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-text-primary">
                      {beat.description}
                    </p>
                  </PremiumCard>
                ))}
              </div>
            </Section>

            <Section title="Offer mechanics">
              <PremiumCard padding="lg">
                <p className="text-[15px] leading-relaxed text-text-primary">
                  {report.deconstruction.offerMechanics}
                </p>
              </PremiumCard>
            </Section>

            <Section title="Visual & production">
              <PremiumCard padding="lg">
                <p className="text-[15px] leading-relaxed text-text-primary">
                  {report.deconstruction.visualProduction}
                </p>
              </PremiumCard>
            </Section>
          </>
        )}

        {!isHonest && report.brandTranslation && (
          <Section title="Translated to your brand">
            <PremiumCard variant="accent" padding="lg" className="space-y-6">
              <p className="text-xs font-medium text-accent">
                Strategic translation — not a copy of the original ad
              </p>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  New hook for your brand
                </p>
                <p className="mt-2 text-lg font-medium leading-relaxed text-text-primary">
                  &ldquo;{report.brandTranslation.hook}&rdquo;
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Structural outline
                </p>
                <div className="mt-3 space-y-2">
                  {report.brandTranslation.structuralOutline.map((beat) => (
                    <div
                      key={beat.role}
                      className="surface-inset rounded-2xl px-4 py-3 text-sm"
                    >
                      <span className="font-semibold text-text-primary">{beat.role}:</span>{" "}
                      {beat.description}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Offer translation
                </p>
                <p className="mt-2 text-sm leading-relaxed text-text-primary">
                  {report.brandTranslation.offerTranslation}
                </p>
              </div>
              <p className="border-t border-white/65 pt-4 text-xs leading-relaxed text-text-muted">
                {report.brandTranslation.disclaimer}
              </p>
            </PremiumCard>
          </Section>
        )}
      </div>
    </PageShell>
  );
}
