import type {
  AdDeconstruction,
  DeconstructionReport,
} from "@/lib/types/deconstruction";
import { createTextPdf, slugifyFilename } from "@/lib/export/pdf";

export function deconstructionToPlainText(
  deconstruction: AdDeconstruction,
  report: DeconstructionReport
): string {
  const lines: string[] = [
    "ADVARA AD DECONSTRUCTION",
    "========================",
    "",
    deconstruction.title,
    `Mode: ${report.mode}`,
    `Landing page: ${deconstruction.input.landingPageUrl}`,
    `Confidence: ${report.evidence.confidence}`,
    report.evidence.summary,
    "",
  ];

  if (report.evidence.badges?.length) {
    lines.push("Evidence badges:", ...report.evidence.badges.map((b) => `• ${b}`), "");
  }
  if (report.evidence.caveat) {
    lines.push(`Caveat: ${report.evidence.caveat}`, "");
  }

  if (report.mode === "honest_analysis" && report.honestAnalysis) {
    const h = report.honestAnalysis;
    lines.push("HEADLINE", h.headline, "");
    if (h.strengths.length) {
      lines.push("WHAT WORKS", ...h.strengths.map((s) => `• ${s}`), "");
    }
    if (h.weaknesses.length) {
      lines.push("WEAKNESSES", ...h.weaknesses.map((w) => `• ${w}`), "");
    }
    if (h.lessonsExtracted.length) {
      lines.push("LESSONS", ...h.lessonsExtracted.map((l) => `• ${l}`), "");
    }
    if (h.criteriaChecklist.length) {
      lines.push("CRITERIA");
      for (const c of h.criteriaChecklist) {
        const mark =
          c.pass === true ? "PASS" : c.pass === false ? "FAIL" : "N/A";
        lines.push(`[${mark}] ${c.label}${c.note ? ` — ${c.note}` : ""}`);
      }
    }
  }

  if (report.mode === "deconstruction" && report.deconstruction) {
    const d = report.deconstruction;
    lines.push(
      "PSYCHOLOGICAL TRIGGER",
      d.psychologicalTrigger,
      "",
      "STRUCTURAL FRAMEWORK",
      ...d.structuralFramework.map(
        (beat, i) => `Beat ${i + 1} · ${beat.role}\n  ${beat.description}`
      ),
      "",
      "OFFER MECHANICS",
      d.offerMechanics,
      "",
      "VISUAL & PRODUCTION",
      d.visualProduction
    );
    if (d.marketComparison) {
      lines.push("", "MARKET COMPARISON", d.marketComparison);
    }
    if (d.competitiveInsights?.length) {
      lines.push(
        "",
        "COMPETITIVE INSIGHTS",
        ...d.competitiveInsights.map((i) => `• ${i}`)
      );
    }
  }

  if (report.brandTranslation) {
    const t = report.brandTranslation;
    lines.push(
      "",
      "BRAND TRANSLATION",
      `Hook: ${t.hook}`,
      "",
      "Structural outline:",
      ...t.structuralOutline.map((b) => `• ${b.role}: ${b.description}`),
      "",
      "Offer translation:",
      t.offerTranslation,
      "",
      t.disclaimer
    );
  }

  return lines.filter((l) => l !== undefined).join("\n");
}

export async function downloadDeconstructionPdf(
  deconstruction: AdDeconstruction,
  report: DeconstructionReport,
  filename?: string
): Promise<void> {
  const pdf = await createTextPdf();
  const name =
    filename ??
    `advara-deconstruction-${slugifyFilename(deconstruction.title, deconstruction.id.slice(0, 8))}.pdf`;

  pdf.addHeading("Advara Ad Deconstruction", 18);
  pdf.addBody(deconstruction.title, 12);
  pdf.addBody(
    `${report.mode} · Confidence: ${report.evidence.confidence}\n${deconstruction.input.landingPageUrl}`
  );
  pdf.addBody(report.evidence.summary);
  pdf.addSpacer();

  if (report.mode === "honest_analysis" && report.honestAnalysis) {
    const h = report.honestAnalysis;
    pdf.addHeading("Headline");
    pdf.addBody(h.headline);
    if (h.strengths.length) {
      pdf.addHeading("What Works");
      pdf.addBody(h.strengths.map((s) => `• ${s}`).join("\n"));
    }
    if (h.weaknesses.length) {
      pdf.addHeading("Weaknesses");
      pdf.addBody(h.weaknesses.map((w) => `• ${w}`).join("\n"));
    }
    if (h.lessonsExtracted.length) {
      pdf.addHeading("Lessons");
      pdf.addBody(h.lessonsExtracted.map((l) => `• ${l}`).join("\n"));
    }
  }

  if (report.mode === "deconstruction" && report.deconstruction) {
    const d = report.deconstruction;
    pdf.addHeading("Psychological Trigger");
    pdf.addBody(d.psychologicalTrigger);
    pdf.addHeading("Structural Framework");
    for (const [i, beat] of d.structuralFramework.entries()) {
      pdf.addBody(`Beat ${i + 1} · ${beat.role}\n${beat.description}`);
    }
    pdf.addHeading("Offer Mechanics");
    pdf.addBody(d.offerMechanics);
    pdf.addHeading("Visual & Production");
    pdf.addBody(d.visualProduction);
    if (d.marketComparison) {
      pdf.addHeading("Market Comparison");
      pdf.addBody(d.marketComparison);
    }
  }

  if (report.brandTranslation) {
    const t = report.brandTranslation;
    pdf.addHeading("Brand Translation");
    pdf.addBody(`Hook: "${t.hook}"`);
    pdf.addBody(
      t.structuralOutline.map((b) => `• ${b.role}: ${b.description}`).join("\n")
    );
    pdf.addBody(t.offerTranslation);
    pdf.addBody(t.disclaimer);
  }

  pdf.save(name);
}
