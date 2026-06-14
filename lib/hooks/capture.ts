import "server-only";
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Analysis } from "@/lib/types/analysis";
import type { CreativeBriefDocument } from "@/lib/types/brief";
import type { ComparisonReport } from "@/lib/types/comparison";
import type { HookSourceKind } from "@/lib/types/hook";
import type { AnalysisReport } from "@/lib/types/report";

type CaptureRow = {
  hook_text: string;
  platform: string | null;
  angle_tags: string[];
  source_kind: HookSourceKind;
  source_analysis_id?: string | null;
  source_brief_id?: string | null;
  source_score: number | null;
  notes: string | null;
  capture_key: string;
};

function hashKey(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

function normalizeHook(text: string): string {
  return text.trim().replace(/^["'""]|["'""]$/g, "").replace(/\s+/g, " ");
}

/** Extract quoted hook from angle brief title format: Hook: "..." */
export function extractHookFromAngleString(angle: string): string | null {
  const match = angle.match(/Hook:\s*["']([^"']+)["']/i);
  if (match?.[1]) return normalizeHook(match[1]);
  const alt = angle.match(/Hook:\s*([^—]+)/i);
  if (alt?.[1]) return normalizeHook(alt[1]);
  return null;
}

function firstHookLine(text: string, maxLen = 280): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const line = trimmed.split(/\n/)[0]?.trim() ?? trimmed;
  const sentence = line.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() ?? line;
  const hook = normalizeHook(sentence);
  if (hook.length < 8) return null;
  return hook.length > maxLen ? `${hook.slice(0, maxLen).trim()}…` : hook;
}

function quotedStrings(text: string): string[] {
  const matches = [...text.matchAll(/["']([^"']{12,})["']/g)];
  return matches.map((m) => normalizeHook(m[1])).filter(Boolean);
}

export function extractHooksFromAnalysisReport(
  report: AnalysisReport,
  sourceId: string,
  platform: string | null,
  sourceScore: number | null
): CaptureRow[] {
  const rows: CaptureRow[] = [];
  const seen = new Set<string>();

  const push = (
    hookText: string,
    angleTags: string[] = [],
    notes: string | null = null,
    suffix = ""
  ) => {
    const hook = normalizeHook(hookText);
    if (hook.length < 8 || seen.has(hook.toLowerCase())) return;
    seen.add(hook.toLowerCase());
    rows.push({
      hook_text: hook,
      platform,
      angle_tags: angleTags,
      source_kind: "analysis",
      source_analysis_id: sourceId,
      source_score: sourceScore,
      notes,
      capture_key: hashKey(["analysis", sourceId, hook, suffix]),
    });
  };

  for (const hv of report.hookVariants ?? []) {
    push(hv.hook, report.angleTags ?? [], hv.rationale ?? null, `variant-${hv.rank}`);
  }

  for (const ar of report.angleRecommendations ?? []) {
    const hook = extractHookFromAngleString(ar.angle);
    if (hook) {
      push(hook, ar.angleTags ?? [], ar.rationale ?? null, `angle-${ar.rank}`);
    }
  }

  return rows;
}

export function extractHooksFromComparisonReport(
  report: ComparisonReport,
  analysisId: string,
  platform: string | null,
  sourceScore: number | null
): CaptureRow[] {
  const rows: CaptureRow[] = [];
  const seen = new Set<string>();

  const push = (hookText: string, notes: string | null, suffix: string) => {
    const hook = normalizeHook(hookText);
    if (hook.length < 8 || seen.has(hook.toLowerCase())) return;
    seen.add(hook.toLowerCase());
    rows.push({
      hook_text: hook,
      platform,
      angle_tags: [],
      source_kind: "comparison",
      source_analysis_id: analysisId,
      source_score: sourceScore,
      notes,
      capture_key: hashKey(["comparison", analysisId, hook, suffix]),
    });
  };

  if (report.recommendedHybrid?.script) {
    const line = firstHookLine(report.recommendedHybrid.script);
    if (line) {
      push(line, report.recommendedHybrid.productionNote ?? null, "hybrid");
    }
  }

  if (report.keyInsights?.nextTest) {
    const fromNext = extractHookFromAngleString(report.keyInsights.nextTest);
    if (fromNext) {
      push(fromNext, report.keyInsights.nextTest, "next-test");
    } else {
      const line = firstHookLine(report.keyInsights.nextTest);
      if (line) push(line, report.keyInsights.nextTest, "next-test-line");
    }
  }

  for (const detail of report.variantDetails ?? []) {
    if (detail.improvements) {
      for (const q of quotedStrings(detail.improvements)) {
        push(q, detail.improvements, `variant-${detail.variantId}`);
      }
    }
  }

  return rows;
}

export function extractHooksFromBriefDocument(
  doc: CreativeBriefDocument,
  briefId: string,
  platform: string | null
): CaptureRow[] {
  const rows: CaptureRow[] = [];

  for (const h of doc.hookOptions ?? []) {
    const hook = normalizeHook(h.hook);
    if (hook.length < 8) continue;
    const notes = [
      h.rationale,
      h.openingVisual ? `Opening frame: ${h.openingVisual}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    rows.push({
      hook_text: hook,
      platform,
      angle_tags: [],
      source_kind: "brief",
      source_brief_id: briefId,
      source_score: null,
      notes: notes || null,
      capture_key: hashKey(["brief", briefId, hook, `rank-${h.rank}`]),
    });
  }

  return rows;
}

function resolveAnalysisPlatform(analysis: Analysis): string | null {
  const p = analysis.platforms?.[0];
  if (!p || p === "other") return analysis.platform_other ?? null;
  return p;
}

function resolveAnalysisScore(
  analysis: Analysis,
  report?: AnalysisReport | ComparisonReport
): number | null {
  if (report && "overallFunnelScore" in report) {
    return report.overallFunnelScore ?? analysis.funnel_score ?? null;
  }
  if (report && "rankings" in report) {
    const top = report.rankings?.find((r) => r.rank === 1);
    return top?.score ?? analysis.funnel_score ?? null;
  }
  return analysis.funnel_score ?? analysis.creative_strength_score ?? null;
}

export async function captureHooksFromAnalysis(
  supabase: SupabaseClient,
  analysis: Analysis,
  report: AnalysisReport | ComparisonReport,
  userId: string
): Promise<void> {
  const platform = resolveAnalysisPlatform(analysis);
  const score = resolveAnalysisScore(analysis, report);

  const rows =
    analysis.analysis_mode === "comparison"
      ? extractHooksFromComparisonReport(
          report as ComparisonReport,
          analysis.id,
          platform,
          score
        )
      : extractHooksFromAnalysisReport(
          report as AnalysisReport,
          analysis.id,
          platform,
          score
        );

  if (rows.length === 0) return;

  const now = new Date().toISOString();
  const inserts = rows.map((r) => ({
    workspace_id: analysis.workspace_id,
    user_id: userId,
    hook_text: r.hook_text,
    platform: r.platform,
    angle_tags: r.angle_tags,
    source_type: "creativeiq_generated" as const,
    source_kind: r.source_kind,
    source_analysis_id: r.source_analysis_id ?? null,
    source_brief_id: null,
    source_score: r.source_score,
    notes: r.notes,
    is_favorited: false,
    custom_tags: [] as string[],
    is_in_test_queue: false,
    capture_key: r.capture_key,
    created_at: now,
    updated_at: now,
  }));

  const { error } = await supabase.from("hook_library").upsert(inserts, {
    onConflict: "workspace_id,capture_key",
    ignoreDuplicates: true,
  });

  if (error) {
    console.error("[hook_library] capture analysis failed:", error.message);
  }
}

export async function captureHooksFromBrief(
  supabase: SupabaseClient,
  briefId: string,
  workspaceId: string,
  userId: string,
  doc: CreativeBriefDocument,
  platform: string | null
): Promise<void> {
  const rows = extractHooksFromBriefDocument(doc, briefId, platform);
  if (rows.length === 0) return;

  const now = new Date().toISOString();
  const inserts = rows.map((r) => ({
    workspace_id: workspaceId,
    user_id: userId,
    hook_text: r.hook_text,
    platform: r.platform,
    angle_tags: r.angle_tags,
    source_type: "creativeiq_generated" as const,
    source_kind: r.source_kind,
    source_analysis_id: null,
    source_brief_id: r.source_brief_id ?? null,
    source_score: null,
    notes: r.notes,
    is_favorited: false,
    custom_tags: [] as string[],
    is_in_test_queue: false,
    capture_key: r.capture_key,
    created_at: now,
    updated_at: now,
  }));

  const { error } = await supabase.from("hook_library").upsert(inserts, {
    onConflict: "workspace_id,capture_key",
    ignoreDuplicates: true,
  });

  if (error) {
    console.error("[hook_library] capture brief failed:", error.message);
  }
}
