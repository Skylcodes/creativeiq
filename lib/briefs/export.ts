import type { CreativeBriefDocument } from "@/lib/types/brief";

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
  filename: string
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const addText = (text: string, size = 10, bold = false) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    const lines = pdf.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      if (y > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += size * 1.35;
    }
    y += 6;
  };

  addText("CREATIVE BRIEF", 18, true);
  addText(doc.header.strategicRationale, 10);
  y += 4;

  addText("Campaign Overview", 13, true);
  addText(
    `Goal: ${doc.header.campaignGoal} · Platform: ${doc.header.platform}\nAudience: ${doc.header.targetAudience} · ${doc.header.audienceTemperature}\nProduction: ${doc.header.productionResources}`
  );

  addText("The Angle", 13, true);
  addText(`${doc.angle.name}\n${doc.angle.explanation}`);

  addText("Hook Options", 13, true);
  for (const h of doc.hookOptions) {
    addText(`#${h.rank} — ${h.hook}\n${h.rationale}`);
  }

  addText("Script", 13, true);
  addText(doc.script);

  addText("Shot List", 13, true);
  for (const s of doc.shotList) {
    addText(
      `Shot ${s.shotNumber}: ${s.onScreen}${s.textOverlay ? ` [${s.textOverlay}]` : ""} — ${s.direction}`
    );
  }

  addText("Production Notes", 13, true);
  addText(doc.productionNotes);

  addText("CTA Guidance", 13, true);
  addText(
    `Primary: ${doc.ctaGuidance.primary}\nAlternative: ${doc.ctaGuidance.alternative}\n${doc.ctaGuidance.placement}`
  );

  addText("What To Avoid", 13, true);
  addText(doc.whatToAvoid.map((w) => `• ${w}`).join("\n"));

  pdf.save(filename);
}
