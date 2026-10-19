import type { CreativeBriefDocument } from "@/lib/types/brief";
import { createTextPdf, slugifyFilename } from "@/lib/export/pdf";

export function briefToPlainText(doc: CreativeBriefDocument): string {
  const lines: string[] = [
    "CREATIVE BRIEF",
    "==============",
    "",
    "CAMPAIGN OVERVIEW",
    `Goal: ${doc.header.campaignGoal}`,
    `Platform: ${doc.header.platform}`,
    `Audience: ${doc.header.targetAudience}`,
    `Temperature: ${doc.header.audienceTemperature}`,
    `Production: ${doc.header.productionResources}`,
    "",
    `Strategic rationale: ${doc.header.strategicRationale}`,
    "",
    "THE ANGLE",
    `${doc.angle.name}`,
    doc.angle.explanation,
    `Emotion: ${doc.angle.emotion}`,
    `Belief: ${doc.angle.belief}`,
    "",
    "HOOK OPTIONS",
    ...doc.hookOptions.map(
      (h) =>
        `#${h.rank} ${h.hook}\n   Visual: ${h.openingVisual ?? "—"}\n   Why: ${h.rationale}`
    ),
    "",
    "SCRIPT",
    doc.script,
    "",
    "SHOT LIST",
    ...doc.shotList.map(
      (s) =>
        `Shot ${s.shotNumber} (${s.durationSeconds ?? "?"}s): ${s.onScreen}${s.textOverlay ? ` | Text: ${s.textOverlay}` : ""}\n   ${s.direction}`
    ),
    "",
    "PRODUCTION NOTES",
    doc.productionNotes,
    "",
    "CTA GUIDANCE",
    `Primary: ${doc.ctaGuidance.primary}`,
    `Alternative: ${doc.ctaGuidance.alternative}`,
    `Placement: ${doc.ctaGuidance.placement}`,
    `Why: ${doc.ctaGuidance.rationale}`,
    "",
    "WHAT TO AVOID",
    ...doc.whatToAvoid.map((w) => `• ${w}`),
  ];

  return lines.join("\n");
}

export async function downloadBriefPdf(
  doc: CreativeBriefDocument,
  filename?: string
): Promise<void> {
  const pdf = await createTextPdf();
  const name =
    filename ??
    `creative-brief-${slugifyFilename(doc.angle.name)}.pdf`;

  pdf.addHeading("Creative Brief", 18);
  pdf.addBody(doc.header.strategicRationale);

  pdf.addHeading("Campaign Overview");
  pdf.addBody(
    `Goal: ${doc.header.campaignGoal} · Platform: ${doc.header.platform}\nAudience: ${doc.header.targetAudience} · ${doc.header.audienceTemperature}\nProduction: ${doc.header.productionResources}`
  );

  pdf.addHeading("The Angle");
  pdf.addBody(`${doc.angle.name}\n${doc.angle.explanation}`);

  pdf.addHeading("Hook Options");
  for (const h of doc.hookOptions) {
    pdf.addBody(`#${h.rank} — ${h.hook}\n${h.rationale}`);
  }

  pdf.addHeading("Script");
  pdf.addBody(doc.script);

  pdf.addHeading("Shot List");
  for (const s of doc.shotList) {
    pdf.addBody(
      `Shot ${s.shotNumber}: ${s.onScreen}${s.textOverlay ? ` [${s.textOverlay}]` : ""} — ${s.direction}`
    );
  }

  pdf.addHeading("Production Notes");
  pdf.addBody(doc.productionNotes);

  pdf.addHeading("CTA Guidance");
  pdf.addBody(
    `Primary: ${doc.ctaGuidance.primary}\nAlternative: ${doc.ctaGuidance.alternative}\n${doc.ctaGuidance.placement}`
  );

  pdf.addHeading("What To Avoid");
  pdf.addBody(doc.whatToAvoid.map((w) => `• ${w}`).join("\n"));

  pdf.save(name);
}
