import { createClient } from "@/lib/supabase/server";
import type {
  AnalysesHistoryParams,
  PlatformFilter,
} from "@/lib/analyses/history";
import { ANALYSES_PAGE_SIZE, PLATFORM_FILTER_OPTIONS } from "@/lib/analyses/history";
import type {
  Analysis,
  AnalysisListItem,
  AnalysesHistoryMetrics,
  WorkspaceMetrics,
} from "@/lib/types/analysis";
import type { AnalysisReport } from "@/lib/types/report";
import type { ComparisonReport } from "@/lib/types/comparison";
import { isComparisonReport } from "@/lib/report/normalize-comparison";

const CREATIVE_BUCKET = "analysis-creatives";

function storagePathFromUrl(url: string): string | null {
  const match = url.match(/analysis-creatives\/(.+?)(?:\?|$)/);
  return match?.[1] ?? null;
}

function thumbnailStoragePath(analysis: Analysis): string | null {
  // Prefer dedicated thumbnail objects. Do not use creative_storage_path —
  // originals are deleted after analysis completes/fails.
  if (analysis.thumbnail_url) {
    return storagePathFromUrl(analysis.thumbnail_url);
  }
  return null;
}

async function attachSignedThumbnails(
  analyses: Analysis[]
): Promise<AnalysisListItem[]> {
  const supabase = await createClient();

  return Promise.all(
    analyses.map(async (analysis) => {
      const path = thumbnailStoragePath(analysis);
      if (!path) {
        return { ...analysis, signedThumbnailUrl: null };
      }

      const { data } = await supabase.storage
        .from(CREATIVE_BUCKET)
        .createSignedUrl(path, 3600);

      return {
        ...analysis,
        signedThumbnailUrl: data?.signedUrl ?? null,
      };
    })
  );
}

function platformFilterIds(platform: PlatformFilter): string[] | null {
  if (platform === "all") return null;
  return (
    PLATFORM_FILTER_OPTIONS.find((p) => p.id === platform)?.platformIds ?? null
  );
}

function matchesSearch(analysis: Analysis, search: string): boolean {
  if (!search) return true;

  const needle = search.toLowerCase();
  const report = analysis.report;
  const funnelReport = report as AnalysisReport | null;
  const comparisonReport = isComparisonReport(report)
    ? (report as ComparisonReport)
    : null;
  const headline = funnelReport?.headline?.toLowerCase() ?? "";
  const verdict = funnelReport?.rawAgents?.verdict?.toLowerCase() ?? "";
  const winnerVerdict = comparisonReport?.winnerVerdict?.toLowerCase() ?? "";
  const title = analysis.title.toLowerCase();
  const platforms = analysis.platforms.join(" ").toLowerCase();
  const platformOther = analysis.platform_other?.toLowerCase() ?? "";

  return (
    title.includes(needle) ||
    headline.includes(needle) ||
    verdict.includes(needle) ||
    winnerVerdict.includes(needle) ||
    platforms.includes(needle) ||
    platformOther.includes(needle)
  );
}

export async function getAnalysesHistoryMetrics(
  workspaceId: string
): Promise<AnalysesHistoryMetrics> {
  const supabase = await createClient();

  const { count: totalAnalyses, error: countError } = await supabase
    .from("analyses")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (countError) {
    throw new Error(countError.message);
  }

  const { data: scored, error: scoredError } = await supabase
    .from("analyses")
    .select("funnel_score")
    .eq("workspace_id", workspaceId)
    .eq("status", "completed")
    .not("funnel_score", "is", null);

  if (scoredError) {
    throw new Error(scoredError.message);
  }

  const scores = (scored ?? [])
    .map((row) => row.funnel_score)
    .filter((s): s is number => s !== null);

  const averageFunnelScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : null;

  const highestFunnelScore =
    scores.length > 0 ? Math.max(...scores) : null;

  return {
    totalAnalyses: totalAnalyses ?? 0,
    averageFunnelScore,
    highestFunnelScore,
  };
}

export async function getAnalysesHistoryPage(
  workspaceId: string,
  params: AnalysesHistoryParams
): Promise<{ analyses: AnalysisListItem[]; totalCount: number }> {
  const supabase = await createClient();
  const platformIds = platformFilterIds(params.platform);
  const hasSearch = params.search.length > 0;

  // When searching report fields we filter in-app after fetch (jsonb text search is limited).
  if (hasSearch) {
    let query = supabase
      .from("analyses")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "completed");

    if (params.creativeType !== "all") {
      query = query.eq("creative_type", params.creativeType);
    }

    if (platformIds) {
      query = query.overlaps("platforms", platformIds);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let filtered = (data ?? []) as Analysis[];
    filtered = filtered.filter((a) => matchesSearch(a, params.search));

    filtered.sort((a, b) => {
      if (params.sort === "highest") {
        return (b.funnel_score ?? -1) - (a.funnel_score ?? -1);
      }
      if (params.sort === "lowest") {
        return (a.funnel_score ?? 101) - (b.funnel_score ?? 101);
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    const totalCount = filtered.length;
    const from = (params.page - 1) * ANALYSES_PAGE_SIZE;
    const pageSlice = filtered.slice(from, from + ANALYSES_PAGE_SIZE);
    const analyses = await attachSignedThumbnails(pageSlice);

    return { analyses, totalCount };
  }

  let query = supabase
    .from("analyses")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .eq("status", "completed");

  if (params.creativeType !== "all") {
    query = query.eq("creative_type", params.creativeType);
  }

  if (platformIds) {
    query = query.overlaps("platforms", platformIds);
  }

  if (params.sort === "highest") {
    query = query.order("funnel_score", { ascending: false, nullsFirst: false });
  } else if (params.sort === "lowest") {
    query = query.order("funnel_score", { ascending: true, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const from = (params.page - 1) * ANALYSES_PAGE_SIZE;
  const to = from + ANALYSES_PAGE_SIZE - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const analyses = await attachSignedThumbnails((data ?? []) as Analysis[]);

  return {
    analyses,
    totalCount: count ?? 0,
  };
}

export async function getRecentAnalyses(
  workspaceId: string,
  limit = 5
): Promise<AnalysisListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return attachSignedThumbnails((data ?? []) as Analysis[]);
}

export async function getWorkspaceMetrics(
  workspaceId: string
): Promise<WorkspaceMetrics> {
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: allAnalyses, error: allError } = await supabase
    .from("analyses")
    .select("funnel_score, created_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "completed");

  if (allError) {
    throw new Error(allError.message);
  }

  const analyses = allAnalyses ?? [];
  const totalAnalyses = analyses.length;

  const scores = analyses
    .map((a) => a.funnel_score)
    .filter((s): s is number => s !== null);

  const averageFunnelScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : null;

  const analysesThisMonth = analyses.filter(
    (a) => a.created_at >= monthStart
  ).length;

  return { totalAnalyses, averageFunnelScore, analysesThisMonth };
}

export async function getDashboardData(workspaceId: string) {
  const [metrics, recentAnalyses] = await Promise.all([
    getWorkspaceMetrics(workspaceId),
    getRecentAnalyses(workspaceId, 5),
  ]);

  return {
    metrics,
    recentAnalyses,
    hasAnalyses: metrics.totalAnalyses > 0,
  };
}
