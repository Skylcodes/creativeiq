# CSV Outcome Import (Slice 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let workspace owners bulk-import ad results from an Advara CSV template or a best-effort Meta Ads Manager export on the Performance page, with dry-run preview and idempotent confirm.

**Architecture:** Extend `lib/outcomes/` with a `csv/` submodule (parse → detect → map → match → import). Add `outcome_imports` ledger table. Server actions `previewCsvImport` / `confirmCsvImport` write nothing on preview. UI: import modal + template download on Performance; source badges on outcomes.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS), server actions, Vitest, existing dark `modal-panel` patterns.

**Spec:** `docs/superpowers/specs/2026-07-17-csv-outcome-import-design.md`

## Global Constraints

- Preview never writes to the database.
- Predicted Advara scores and imported actuals must never be merged into one number.
- Matching order only: `launch_id` → `analysis_id`+`variant_id` → `platform`+`external_ad_id`. No ad-name matching.
- Auto-create launch only when CSV has valid owned `analysis_id` (+ variant for comparisons); otherwise skip.
- Formats: Advara template (primary) + Meta export (best-effort). No TikTok CSV. No Meta column-mapper wizard.
- Windows: `3d`/`7d`/`14d` plus `custom` when start/end present and duration is not exactly those.
- Limits: 1MB file, 500 data rows; strip formula prefixes `=`, `+`, `-`, `@`.
- Outcome upsert key: `(launch_id, window_type)`; `source = 'csv'`; `source_ref = import id`.
- Do not modify `lib/ai/*` scoring pipelines.
- Import modal must use `modal-overlay` / `modal-panel` (readable dark inputs).
- Manual `recordOutcome` stays on fixed windows only; `custom` is CSV-path only.

## File map

| File | Role |
|------|------|
| `supabase/migrations/20260719000000_outcome_imports.sql` | Ledger table + RLS |
| `lib/types/outcome.ts` | CSV/import types; widen window helpers |
| `lib/outcomes/validation.ts` | `resolveOutcomeWindow` supporting custom |
| `lib/outcomes/csv/parse.ts` | CSV parse + limits + formula strip |
| `lib/outcomes/csv/template.ts` | Canonical headers + sample CSV |
| `lib/outcomes/csv/detect.ts` | `advara` \| `meta` \| `unknown` |
| `lib/outcomes/csv/meta-map.ts` | Meta header aliases → normalized fields |
| `lib/outcomes/csv/normalize.ts` | Advara row → `NormalizedImportRow` |
| `lib/outcomes/csv/match.ts` | Classify rows against launches/analyses |
| `lib/outcomes/csv/import.ts` | Pure preview builder from normalized rows |
| `lib/outcomes/csv/hash.ts` | Content hash helper |
| `lib/outcomes/actions.ts` | `previewCsvImport`, `confirmCsvImport` |
| `components/outcomes/import-results-modal.tsx` | Upload → preview → confirm UI |
| `components/performance/launch-outcomes-section.tsx` | Import actions + source badge |
| `components/performance/performance-view.tsx` | Pass workspaceId into section |
| `lib/outcomes/__tests__/csv-*.test.ts` | Unit tests |

---

### Task 1: Custom window resolution + CSV types

**Files:**
- Modify: `lib/types/outcome.ts`
- Modify: `lib/outcomes/validation.ts`
- Test: `lib/outcomes/__tests__/validation.test.ts`

**Interfaces:**
- Produces:
  - `OutcomeWindowType` stays `"3d" \| "7d" \| "14d"` for manual UI.
  - `ImportWindowType = OutcomeWindowType | "custom"`
  - `resolveOutcomeWindow(args: { launchedAt: string; windowType: ImportWindowType; windowStart?: string; windowEnd?: string }): { windowStart: string; windowEnd: string; windowType: ImportWindowType }`
  - Keep existing `resolveWindow(launchedAt, OutcomeWindowType)` as a thin wrapper calling the fixed-window path (so manual actions keep working).

- [ ] **Step 1: Extend types in `lib/types/outcome.ts`**

Add (do not remove existing exports):

```ts
export type ImportWindowType = OutcomeWindowType | "custom";

export type CsvFormat = "advara" | "meta";

export type NormalizedImportRow = {
  rowIndex: number; // 1-based data row number for UI
  launchId: string | null;
  analysisId: string | null;
  variantId: string | null;
  platform: LaunchPlatform | null;
  externalAdId: string | null;
  externalCampaignId: string | null;
  launchedAt: string | null; // yyyy-mm-dd
  windowType: ImportWindowType | null;
  windowStart: string | null;
  windowEnd: string | null;
  currency: string;
  metrics: RawOutcomeMetrics;
  notes: string | null;
  unknownColumns: string[];
};

export type ImportRowStatus =
  | "matched"
  | "create_launch"
  | "unmatched"
  | "invalid"
  | "duplicate";

export type ImportPreviewRow = {
  rowIndex: number;
  status: ImportRowStatus;
  reason: string | null;
  normalized: NormalizedImportRow;
  matchedLaunchId: string | null;
};

export type ImportPreviewResult = {
  format: CsvFormat;
  contentHash: string;
  filename: string;
  unknownColumns: string[];
  rows: ImportPreviewRow[];
  counts: {
    matched: number;
    createLaunch: number;
    unmatched: number;
    invalid: number;
    duplicate: number;
    importable: number;
  };
};
```

- [ ] **Step 2: Write failing tests for custom windows**

Append to `lib/outcomes/__tests__/validation.test.ts`:

```ts
import { resolveOutcomeWindow } from "@/lib/outcomes/validation";

describe("resolveOutcomeWindow", () => {
  it("resolves fixed 7d from launch date", () => {
    const w = resolveOutcomeWindow({
      launchedAt: "2026-07-01",
      windowType: "7d",
    });
    expect(w.windowType).toBe("7d");
    expect(w.windowStart).toBe("2026-07-01T00:00:00.000Z");
    expect(w.windowEnd).toBe("2026-07-08T00:00:00.000Z");
  });

  it("accepts custom start/end", () => {
    const w = resolveOutcomeWindow({
      launchedAt: "2026-07-01",
      windowType: "custom",
      windowStart: "2026-07-01",
      windowEnd: "2026-07-06",
    });
    expect(w.windowType).toBe("custom");
    expect(w.windowEnd > w.windowStart).toBe(true);
  });

  it("infers 7d when start/end span exactly 7 days and windowType omitted via custom dates matching", () => {
    const w = resolveOutcomeWindow({
      launchedAt: "2026-07-01",
      windowType: "custom",
      windowStart: "2026-07-01T00:00:00.000Z",
      windowEnd: "2026-07-08T00:00:00.000Z",
    });
    // Still custom if caller passed custom; inference happens in normalize, not here.
    expect(w.windowType).toBe("custom");
  });
});
```

- [ ] **Step 3: Implement `resolveOutcomeWindow`**

In `lib/outcomes/validation.ts`:

```ts
export function resolveOutcomeWindow(args: {
  launchedAt: string;
  windowType: "3d" | "7d" | "14d" | "custom";
  windowStart?: string | null;
  windowEnd?: string | null;
}): { windowStart: string; windowEnd: string; windowType: "3d" | "7d" | "14d" | "custom" } {
  if (args.windowType !== "custom") {
    const fixed = resolveWindow(args.launchedAt, args.windowType);
    return { ...fixed, windowType: args.windowType };
  }
  if (!args.windowStart || !args.windowEnd) {
    throw new Error("Custom window requires start and end.");
  }
  const start = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(args.windowStart)
      ? `${args.windowStart}T00:00:00.000Z`
      : args.windowStart
  );
  const end = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(args.windowEnd)
      ? `${args.windowEnd}T00:00:00.000Z`
      : args.windowEnd
  );
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new Error("Invalid custom window.");
  }
  return {
    windowType: "custom",
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
  };
}
```

Keep `resolveWindow` unchanged for manual path. Update `validateOutcomeInput` to still reject `custom` (manual only).

- [ ] **Step 4: Run tests**

Run: `npm test -- lib/outcomes/__tests__/validation.test.ts`  
Expected: PASS (existing + new).

- [ ] **Step 5: Commit**

```bash
git add lib/types/outcome.ts lib/outcomes/validation.ts lib/outcomes/__tests__/validation.test.ts
git commit -m "feat: custom outcome window resolution and CSV import types"
```

---

### Task 2: `outcome_imports` migration

**Files:**
- Create: `supabase/migrations/20260719000000_outcome_imports.sql`

**Interfaces:**
- Produces: table `public.outcome_imports` with RLS matching `creative_launches`.

- [ ] **Step 1: Write migration**

```sql
-- Advara: CSV outcome import ledger (Slice 2)

create table if not exists public.outcome_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  format text not null check (format in ('advara', 'meta')),
  content_hash text not null,
  row_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists outcome_imports_workspace_idx
  on public.outcome_imports (workspace_id, created_at desc);

alter table public.outcome_imports enable row level security;

create policy "Users manage own outcome imports"
  on public.outcome_imports
  for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = outcome_imports.workspace_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = outcome_imports.workspace_id
        and w.user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260719000000_outcome_imports.sql
git commit -m "feat: outcome_imports ledger table for CSV imports"
```

- [ ] **Step 3: Apply to Supabase**

Run the SQL in Supabase SQL Editor (or CLI if linked). Verify with a service-role select on `outcome_imports` returning `[]` (not schema cache error).

---

### Task 3: CSV parse + hash + limits

**Files:**
- Create: `lib/outcomes/csv/parse.ts`
- Create: `lib/outcomes/csv/hash.ts`
- Test: `lib/outcomes/__tests__/csv-parse.test.ts`

**Interfaces:**
- Produces:
  - `stripFormula(value: string): string`
  - `parseCsv(text: string): { headers: string[]; rows: string[][] }` throws on empty
  - `assertCsvLimits(text: string, rowCount: number): void` — throws if `text.length > 1_000_000` or `rowCount > 500`
  - `hashCsvContent(text: string): string` — sha256 hex via `node:crypto`

- [ ] **Step 1: Write failing tests**

`lib/outcomes/__tests__/csv-parse.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseCsv, stripFormula, assertCsvLimits } from "@/lib/outcomes/csv/parse";
import { hashCsvContent } from "@/lib/outcomes/csv/hash";

describe("stripFormula", () => {
  it("strips leading formula chars", () => {
    expect(stripFormula("=1+1")).toBe("1+1");
    expect(stripFormula("+123")).toBe("123");
    expect(stripFormula("-5")).toBe("5");
    expect(stripFormula("@cmd")).toBe("cmd");
  });
});

describe("parseCsv", () => {
  it("parses simple rows", () => {
    const { headers, rows } = parseCsv("a,b\n1,2\n3,4\n");
    expect(headers).toEqual(["a", "b"]);
    expect(rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("handles quoted commas", () => {
    const { rows } = parseCsv('a,b\n"1,2",3\n');
    expect(rows[0]).toEqual(["1,2", "3"]);
  });
});

describe("assertCsvLimits", () => {
  it("rejects too many rows", () => {
    expect(() => assertCsvLimits("x", 501)).toThrow(/500/);
  });
});

describe("hashCsvContent", () => {
  it("is stable", () => {
    expect(hashCsvContent("a")).toBe(hashCsvContent("a"));
    expect(hashCsvContent("a")).not.toBe(hashCsvContent("b"));
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- lib/outcomes/__tests__/csv-parse.test.ts`  
Expected: FAIL module not found.

- [ ] **Step 3: Implement**

`lib/outcomes/csv/hash.ts`:

```ts
import { createHash } from "node:crypto";

export function hashCsvContent(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
```

`lib/outcomes/csv/parse.ts` — implement a small RFC4180-ish parser (no new dependency):

```ts
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
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm test -- lib/outcomes/__tests__/csv-parse.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/outcomes/csv/parse.ts lib/outcomes/csv/hash.ts lib/outcomes/__tests__/csv-parse.test.ts
git commit -m "feat: CSV parse, formula strip, size limits, and content hash"
```

---

### Task 4: Template + format detect + Advara normalize

**Files:**
- Create: `lib/outcomes/csv/template.ts`
- Create: `lib/outcomes/csv/detect.ts`
- Create: `lib/outcomes/csv/normalize.ts`
- Create: `lib/outcomes/csv/windows.ts` — `inferWindowType(start, end)`
- Test: `lib/outcomes/__tests__/csv-detect-normalize.test.ts`

**Interfaces:**
- Produces:
  - `ADVARA_CSV_HEADERS: string[]`
  - `buildAdvaraTemplateCsv(): string`
  - `detectCsvFormat(headers: string[]): "advara" | "meta" | "unknown"`
  - `inferWindowType(startIso: string, endIso: string): ImportWindowType` — exact 3/7/14 days → that type, else `custom`
  - `normalizeAdvaraRows(headers: string[], rows: string[][]): { rows: NormalizedImportRow[]; unknownColumns: string[] }`

Canonical headers (exact):

```ts
export const ADVARA_CSV_HEADERS = [
  "launch_id",
  "analysis_id",
  "variant_id",
  "platform",
  "external_ad_id",
  "external_campaign_id",
  "launched_at",
  "window",
  "window_start",
  "window_end",
  "currency",
  "spend",
  "impressions",
  "clicks",
  "purchases",
  "leads",
  "revenue",
  "notes",
] as const;
```

Detect Advara if ≥4 of `{launch_id, analysis_id, spend, window, platform}` present (case-insensitive).  
Detect Meta if headers include `Ad ID` (or `ad id`) AND (`Amount spent` OR `Impressions`).  
Else `unknown`.

- [ ] **Step 1: Write failing tests** covering detect Advara/Meta/unknown, inferWindow 7d vs custom, normalize parses spend and unknown columns.

- [ ] **Step 2: Implement modules**

`inferWindowType`: compute whole-day difference; if 3/7/14 return that; else `custom`.

`normalizeAdvaraRows`: map header index (case-sensitive exact for Advara template); parse numbers with `Number` / empty → null; validate platform enum; if `window` empty and both dates present, set `windowType = inferWindowType(...)`.

- [ ] **Step 3: Run tests PASS + commit**

```bash
git commit -m "feat: Advara CSV template, detect, and row normalization"
```

---

### Task 5: Meta header map

**Files:**
- Create: `lib/outcomes/csv/meta-map.ts`
- Test: `lib/outcomes/__tests__/csv-meta-map.test.ts`

**Interfaces:**
- Produces: `normalizeMetaRows(headers: string[], rows: string[][]): { rows: NormalizedImportRow[]; unknownColumns: string[] }`

Alias map (lowercase trim keys):

| Alias | Field |
|-------|--------|
| ad id | externalAdId |
| amount spent | spend |
| amount spent (usd) | spend |
| spend | spend |
| impressions | impressions |
| link clicks | clicks |
| clicks (all) | clicks |
| clicks | clicks |
| purchases | purchases |
| website purchases | purchases |
| leads | leads |
| on-facebook leads | leads |
| website purchases conversion value | revenue |
| purchase conversion value | revenue |
| reporting starts | windowStart |
| reporting ends | windowEnd |

Always set `platform: "meta"`.  
`launchedAt` ← date part of `windowStart` if present.  
`windowType` ← `inferWindowType` when both ends present.  
Never map a column whose name contains `roas` (case-insensitive) to revenue.  
If `externalAdId` missing → still emit row; match step marks invalid/unmatched.

- [ ] **Step 1: Failing tests** for aliases, ROAS-not-revenue, missing Ad ID still returns row.

- [ ] **Step 2: Implement + PASS + commit**

```bash
git commit -m "feat: best-effort Meta Ads Manager CSV column mapping"
```

---

### Task 6: Match + preview builder

**Files:**
- Create: `lib/outcomes/csv/match.ts`
- Create: `lib/outcomes/csv/import.ts`
- Test: `lib/outcomes/__tests__/csv-match.test.ts`

**Interfaces:**
- Consumes: `NormalizedImportRow`, launch/analysis lookups
- Produces:

```ts
export type MatchContext = {
  launchesById: Map<string, { id: string; analysis_id: string; platform: string; external_ad_id: string | null; variant_id: string | null }>;
  launchesByExternal: Map<string, string>; // `${platform}:${external_ad_id}` → launch id
  analysesById: Map<string, { id: string; status: string; analysis_mode: string; variants: Array<{ id: string }> }>;
};

export function classifyImportRows(
  rows: NormalizedImportRow[],
  ctx: MatchContext
): ImportPreviewRow[];

export function buildPreviewCounts(rows: ImportPreviewRow[]): ImportPreviewResult["counts"];
```

Classification rules:
1. Metric/window validation failures → `invalid` with reason.
2. Duplicate in-file key `${matchedOrCreateKey}|${windowType}` → earlier rows `duplicate`, keep last as active.
3. `launch_id` hit in map → `matched`.
4. Else `platform`+`external_ad_id` hit → `matched`.
5. Else valid `analysis_id` in map, status `completed`, variant rules OK, `platform`+`launchedAt`+resolvable window → `create_launch`.
6. Else → `unmatched` with guidance string from spec.

Importable = `matched` + `create_launch` (non-duplicate survivors).

- [ ] **Step 1: Failing tests** for each match path, create_launch, skip Meta-without-launch, comparison variant required, in-file duplicate.

- [ ] **Step 2: Implement + PASS + commit**

```bash
git commit -m "feat: CSV import matching and preview classification"
```

---

### Task 7: Server actions — preview + confirm

**Files:**
- Modify: `lib/outcomes/actions.ts`
- Optionally create: `lib/outcomes/csv/pipeline.ts` exporting `buildImportPreviewFromCsvText(...)` used by both actions

**Interfaces:**
- Produces:

```ts
export async function previewCsvImport(input: {
  workspaceId: string;
  filename: string;
  csvText: string;
}): Promise<
  | { success: true; preview: ImportPreviewResult }
  | { success: false; error: string }
>;

export async function confirmCsvImport(input: {
  workspaceId: string;
  filename: string;
  csvText: string;
}): Promise<
  | {
      success: true;
      summary: {
        importId: string;
        createdLaunches: number;
        createdOutcomes: number;
        updatedOutcomes: number;
        skipped: number;
        invalid: number;
      };
    }
  | { success: false; error: string }
>;
```

**Preview steps (no writes):**
1. Auth + workspace ownership (`workspaces.user_id = user.id`).
2. `parseCsv` → `detectCsvFormat` → if unknown return error.
3. Normalize via Advara or Meta mapper.
4. Load workspace launches (`id, analysis_id, platform, external_ad_id, variant_id`) and completed analyses (`id, status, analysis_mode, variants`).
5. `classifyImportRows` → return preview + `contentHash`.

**Confirm steps:**
1. Re-run the same preview pipeline (do not trust client status list).
2. Filter importable rows.
3. Insert `outcome_imports` ledger row; capture `id`.
4. For each importable row:
   - Resolve or insert launch (`source: 'csv'`).
   - `resolveOutcomeWindow`.
   - Upsert outcome with `source: 'csv'`, `source_ref: importId`, `onConflict: launch_id,window_type`.
   - Track created vs updated (check existing outcome before upsert, or compare `created_at`/`updated_at` if returned).
5. `revalidatePath("/performance")` and affected report paths.
6. Return summary counts.

- [ ] **Step 1: Implement pipeline helper + actions**

- [ ] **Step 2: Manual smoke (dev):** preview a tiny Advara CSV string via a temporary script or by wiring UI in Task 8; confirm does not insert on preview.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: previewCsvImport and confirmCsvImport server actions"
```

---

### Task 8: Import UI on Performance

**Files:**
- Create: `components/outcomes/import-results-modal.tsx`
- Modify: `components/performance/launch-outcomes-section.tsx`
- Modify: `components/performance/performance-view.tsx` (pass `workspaceId`)
- Modify: `app/(app)/performance/page.tsx` if section props need workspace id (already has it via view)

**UI behavior:**
- Buttons: **Download template** (client download of `buildAdvaraTemplateCsv()` as `advara-outcomes-template.csv`) and **Import results**.
- Modal: file input → read as text → `previewCsvImport` → show rows with status chips → Confirm calls `confirmCsvImport` → summary → `router.refresh()`.
- Use `modal-overlay` + `modal-panel` only (no light `premium-card` fields).
- Confirm disabled when `counts.importable === 0`.
- Outcomes table: badge `outcome.source` (`manual`/`csv`).

- [ ] **Step 1: Build modal + wire section header actions**

- [ ] **Step 2: Manual check in browser** — template downloads; Advara CSV previews; Meta-without-match shows skip; confirm writes and badge shows `csv`.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: CSV import modal and template download on Performance"
```

---

### Task 9: Idempotency test + final review

**Files:**
- Test: `lib/outcomes/__tests__/csv-idempotency.test.ts` — pure function test that two classifications of the same normalized rows produce the same match keys / window types (document that DB upsert is the idempotency mechanism). Optionally extract `outcomeUpsertKey(launchId, windowType)` helper and test it.

- [ ] **Step 1: Add key helper test**

```ts
export function outcomeUpsertKey(launchId: string, windowType: string): string {
  return `${launchId}:${windowType}`;
}
```

- [ ] **Step 2: Run full suite**

Run: `npm test`  
Expected: all PASS.

- [ ] **Step 3: Spec checklist**
  - Template download ✓
  - Meta best-effort ✓
  - Preview no writes ✓
  - Match order ✓
  - Create only with analysis_id ✓
  - Custom windows ✓
  - Ledger ✓
  - Source badges ✓
  - Limits + formula strip ✓

- [ ] **Step 4: Commit**

```bash
git commit -m "test: CSV import idempotency keys and Slice 2 verification"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Advara template download | 4, 8 |
| Meta best-effort map | 5 |
| Parse/validate/preview no writes | 3, 6, 7 |
| Match order + no ad-name | 6 |
| Auto-create only with analysis_id | 6, 7 |
| Custom windows | 1, 4 |
| `outcome_imports` ledger | 2, 7 |
| Idempotent upsert | 7, 9 |
| Limits + formula strip | 3 |
| Source badges | 8 |
| Performance Import UI | 8 |
| Vitest coverage listed in spec | 3–6, 9 |

No TikTok / Meta wizard / AI calibration tasks (explicit non-goals).
