export function stripFormula(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if ("=+-@".includes(v[0])) return v.slice(1).trim();
  return v;
}

export function assertCsvLimits(text: string, rowCount: number): void {
  if (text.length > 1_000_000) throw new Error("CSV must be under 1MB.");
  if (rowCount > 500) throw new Error("CSV can have at most 500 data rows.");
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const normalized = text.replace(/^\uFEFF/, "");
  if (!normalized.trim()) throw new Error("CSV is empty.");
  const table = parseCsvTable(normalized);
  if (table.length === 0) throw new Error("CSV is empty.");
  const headers = table[0].map((h) => stripFormula(h));
  const rows = table.slice(1).map((r) => {
    const padded = [...r];
    while (padded.length < headers.length) padded.push("");
    return padded.slice(0, headers.length).map(stripFormula);
  }).filter((r) => r.some((c) => c !== ""));
  assertCsvLimits(normalized, rows.length);
  return { headers, rows };
}

function parseCsvTable(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  row.push(cell);
  if (row.length > 1 || row[0] !== "" || rows.length === 0) rows.push(row);
  return rows;
}
