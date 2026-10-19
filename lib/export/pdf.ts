type PdfDoc = {
  addHeading: (text: string, size?: number) => void;
  addBody: (text: string, size?: number) => void;
  addSpacer: (pt?: number) => void;
  save: (filename: string) => void;
};

/** Minimal multi-page text PDF builder used by report / brief / decon exports. */
export async function createTextPdf(): Promise<PdfDoc> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const write = (text: string, size: number, bold: boolean) => {
    if (!text?.trim()) return;
    pdf.setFontSize(size);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    const lines = pdf.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      ensureSpace(size * 1.35);
      pdf.text(line, margin, y);
      y += size * 1.35;
    }
    y += 6;
  };

  return {
    addHeading(text, size = 13) {
      y += 4;
      write(text, size, true);
    },
    addBody(text, size = 10) {
      write(text, size, false);
    },
    addSpacer(pt = 8) {
      y += pt;
    },
    save(filename) {
      pdf.save(filename);
    },
  };
}

export function slugifyFilename(value: string, fallback = "export"): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || fallback;
}
