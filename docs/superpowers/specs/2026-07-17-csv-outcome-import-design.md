# Ad Outcome Tracking — Slice 2: CSV Import Design

**Date:** 2026-07-17  
**Status:** Approved for planning  
**Parent:** `docs/superpowers/specs/2026-07-17-ad-outcome-tracking-design.md`  
**Depends on:** Slice 1 (manual launches + outcomes) — shipped

## Goal

Let workspace owners bulk-import real ad results from CSV on the Performance page, with a dry-run preview and idempotent confirm, without Meta/TikTok OAuth.

## Decisions (locked)

| Topic | Choice |
|--------|--------|
| Formats | Advara canonical template (primary) + Meta Ads Manager export (best-effort) |
| Meta depth | Try + preview; no column-mapper wizard. Unmatched Meta rows → skip with guidance to use template or Log launch |
| Missing launches | Auto-create launch only when CSV has valid `analysis_id` (+ `variant_id` for comparisons). Otherwise skip |
| Windows | `3d` / `7d` / `14d`, plus `custom` when start/end dates exist and duration is not exactly those |
| Architecture | Spec-aligned: parser/preview/match/confirm + `outcome_imports` ledger |
| Out of scope | TikTok export mapping, full Meta wizard, async job queue, AI calibration, partial preview writes |

## User flow

1. On Performance → **Download template** and/or **Import results**.
2. Upload a `.csv` file.
3. Server runs **preview only** (no writes): detect format, parse, validate, match.
4. UI shows row buckets: matched, will-create-launch, unmatched, invalid, duplicate.
5. User confirms → server upserts launches/outcomes (`source = 'csv'`), writes ledger row, returns summary.
6. Launch outcomes table shows source badge (`manual` | `csv`).

## Matching order

Deterministic, in order:

1. Existing `launch_id`
2. `analysis_id` + `variant_id` (variant required for comparison analyses; must be null/absent for funnel)
3. `platform` + `external_ad_id` against existing launches

**Ad-name-only matching is prohibited.**

### Createable vs skip

- **Createable:** row has `analysis_id` that belongs to the workspace user; analysis is `completed`; variant rules satisfied; enough fields to create a launch (platform + launched_at) and an outcome window.
- **Skip:** Meta (or template) row with only Ad ID / no analysis link and no existing launch match → explain “Log launch first or use Advara template with analysis_id”.

## Canonical Advara template

Required/optional columns (exact header names):

| Column | Required | Notes |
|--------|----------|--------|
| `launch_id` | no | UUID of existing launch |
| `analysis_id` | no* | UUID; needed to create launch when no launch match |
| `variant_id` | conditional | Required when analysis is comparison |
| `platform` | yes for create | `meta` \| `tiktok` \| `other` |
| `external_ad_id` | no | Used for match #3 |
| `external_campaign_id` | no | Stored on launch if creating |
| `launched_at` | yes for create | ISO date `YYYY-MM-DD` |
| `window` | yes** | `3d` \| `7d` \| `14d` \| `custom` |
| `window_start` | if custom | ISO datetime or date |
| `window_end` | if custom | Must be after start |
| `currency` | no | Default `USD` |
| `spend` | no | Non-negative number |
| `impressions` | no | Non-negative integer |
| `clicks` | no | Non-negative integer |
| `purchases` | no | Non-negative integer |
| `leads` | no | Non-negative integer |
| `revenue` | no | Non-negative number |
| `notes` | no | Launch notes if creating |

\* At least one of `launch_id`, (`analysis_id` [+ variant]), or (`platform` + `external_ad_id` matching an existing launch) must resolve, or the row is unmatched/skipped.  
\*\* If `window` omitted but `window_start`/`window_end` present, infer `3d`/`7d`/`14d` when duration matches exactly; else `custom`.

Unknown columns: ignore and list in preview notes.

## Meta export (best-effort)

Detect via known header fingerprints (e.g. `Amount spent`, `Ad ID`, `Reporting starts`, `Impressions`).

Map common aliases into raw metrics and identifiers:

- Ad ID → `external_ad_id`
- Amount spent / Spend → `spend`
- Impressions → `impressions`
- Link clicks / Clicks → `clicks`
- Purchases / Website purchases → `purchases`
- Leads / On-Facebook leads → `leads` (when present)
- Purchase conversion value / Website purchase ROAS value equivalents → `revenue` when a value column exists
- Reporting starts / ends → window inference (`custom` or exact 3/7/14)
- Platform assumed `meta`

If required Meta columns are missing or Ad ID is absent → invalid or skip with reason. No interactive column mapper in Slice 2.

## Architecture

Extend `lib/outcomes/`:

| Module | Responsibility |
|--------|----------------|
| `csv/template.ts` | Headers, sample CSV bytes, download helper |
| `csv/parse.ts` | Parse CSV text; enforce 1MB / 500-row limits; strip formula prefixes (`=`, `+`, `-`, `@`) |
| `csv/detect.ts` | `advara` \| `meta` \| `unknown` |
| `csv/meta-map.ts` | Header alias → normalized row fields |
| `csv/match.ts` | Matching + createable classification |
| `csv/import.ts` | Preview + confirm orchestration |
| Server actions | `previewCsvImport`, `confirmCsvImport` (and template download if needed) |

Reuse existing `validation.ts`, `calculations.ts`, `resolveWindow` patterns. Extend window resolution for `custom` when start/end provided.

### Data: `outcome_imports`

```sql
create table public.outcome_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  format text not null check (format in ('advara', 'meta')),
  content_hash text not null,
  row_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
-- RLS: workspace owner only (same pattern as creative_launches)
```

- `content_hash`: hash of normalized file bytes; re-confirm of identical file is safe (upsert outcomes, do not duplicate ledger spam — either skip second ledger insert or insert with same hash noted).
- Outcome rows set `source = 'csv'` and `source_ref` to import id (and/or stable row fingerprint).
- Upsert key remains `(launch_id, window_type)`.

## UI

- Performance header: Download template + Import results.
- Import modal uses existing dark `modal-panel` / `modal-overlay` patterns (readable inputs).
- Preview: compact row list with status chips; Confirm disabled when zero importable rows.
- Post-confirm summary counts: created launches, created outcomes, updated outcomes, skipped, invalid.
- Outcomes table: source badge.

## Guardrails

- Preview never writes.
- Confirm requires auth + workspace ownership for every analysis/launch touched.
- Size: max 1MB file, max 500 data rows.
- In-file duplicates (same match key + window): keep last, flag earlier as duplicate.
- Do not conflate Advara predicted scores with imported actuals on Performance.

## Testing (Vitest)

- Parser: malformed quotes, empty, oversized, formula-prefixed cells.
- Detect: Advara vs Meta fingerprints; unknown rejected.
- Meta map: alias headers → metrics; missing Ad ID → skip/invalid.
- Match: all three match paths; createable vs skip rules; comparison variant required.
- Windows: exact 7d vs custom span.
- Confirm idempotency: second import updates same `(launch_id, window_type)`; no duplicate outcomes.

## Success criteria

- User can download template, fill it, preview, and confirm imports.
- User can upload a recognizable Meta export and import rows that match by Ad ID (or create via template IDs).
- Re-importing the same logical rows updates rather than duplicates.
- Unmatched Meta rows never silently invent launches without `analysis_id`.
- Performance continues to separate predicted scores from real outcomes.

## Non-goals (explicit)

- TikTok CSV mapping
- Meta column-mapping wizard
- OAuth / API sync (Slice 4)
- Calibration UI or AI prompt injection (Slice 3)
