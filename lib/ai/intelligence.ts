import "server-only";
import { tavily } from "@tavily/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCompetitiveInsights,
  buildMarketPatterns,
  fetchMetaAdsLibrary,
  isMetaAdsLibraryConfigured,
} from "@/lib/ai/meta-ads-library";
import {
  enrichToleranceFromResearch,
  formatToleranceSignalsForPrompt,
} from "@/lib/ai/tolerance-signals";
import type { IntelligenceBrief, CompetitorAd, MarketPatterns } from "@/lib/types/report";

// ---------------------------------------------------------------------------
// API key setup
//
// Tavily:  https://app.tavily.com/home  →  API Keys → TAVILY_API_KEY
//
// Meta Ad Library (recommended — Apify):
//   APIFY_API_TOKEN — https://console.apify.com/account/integrations
//   Optional: APIFY_META_ADS_ACTOR_ID (default: apify/facebook-ads-scraper)
//
// Fallback Meta Graph API:
//   META_AD_LIBRARY_TOKEN — Facebook App with Ads Library API access
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let _tavilyClient: ReturnType<typeof tavily> | null = null;

function getTavily() {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return null;
  if (!_tavilyClient) {
    _tavilyClient = tavily({ apiKey: key });
  }
  return _tavilyClient;
}

async function tavilySearch(query: string): Promise<string> {
  const client = getTavily();
  if (!client) return "";

  try {
    const res = await client.search(query, {
      searchDepth: "basic",
      maxResults: 3,
      includeAnswer: "basic",
      timeRange: "month",
    });

    const answer = typeof res.answer === "string" ? res.answer.trim() : "";
    const snippets = res.results
      .slice(0, 3)
      .map((r) => `• ${r.title}: ${r.content.slice(0, 180).replace(/\n/g, " ")}`)
      .join("\n");

    return [answer, snippets].filter(Boolean).join("\n").trim();
  } catch {
    return "";
  }
}

async function runMarketCreativeSearch(
  category: string,
  platforms: string[]
): Promise<string> {
  const platformStr = platforms.slice(0, 2).join(" ") || "Meta TikTok";
  const query = `best performing ${platformStr} ${category} DTC ad hooks creative formats winning script opening lines competitor angles viral UGC examples 2025`;
  return tavilySearch(query);
}

async function runAudienceConversionSearch(
  category: string,
  platforms: string[]
): Promise<string> {
  const platform = platforms[0] || "TikTok";
  const query = `${category} ${platform} buyer psychology objections ad fatigue DTC landing page conversion offers customer complaints frustrations Reddit reviews what brands get wrong 2025`;
  return tavilySearch(query);
}

function truncateForPrompt(text: string, maxLen = 720): string {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen).trim()}…`;
}

function formatCompetitorAdLine(ad: CompetitorAd): string {
  const duration = ad.runningDays != null ? ` — ${ad.runningDays}d running` : "";
  const cta = ad.cta ? ` — CTA: ${ad.cta}` : "";
  const signal =
    ad.qualitySignal === "high"
      ? " [high-signal]"
      : ad.qualitySignal === "low"
        ? " [weak-signal]"
        : "";
  const formats = ad.formatSignals?.length
    ? ` — ${ad.formatSignals.join(", ")}`
    : "";
  return `  ${ad.advertiser}${duration}${cta}${signal}${formats}: "${ad.copySnippet}"`;
}

export function formatIntelligenceForPrompt(brief: IntelligenceBrief): string {
  if (!brief) return "";

  const lines: string[] = ["=== REAL WORLD INTELLIGENCE BRIEF ==="];

  const marketBlock = brief.platformTrends?.trim();
  const audienceBlock = brief.audienceContent?.trim();
  const conversionBlock = brief.categoryConversion?.trim();

  if (marketBlock) {
    lines.push(
      `\nMarket & creative intelligence (${brief.platforms.join(", ")} — hooks, competitor angles, winning scripts):\n${truncateForPrompt(marketBlock, 900)}`
    );
  }

  if (audienceBlock) {
    lines.push(
      `\nAudience behavior & buyer psychology:\n${truncateForPrompt(audienceBlock, 900)}`
    );
  }

  if (conversionBlock) {
    lines.push(
      `\nCategory conversion patterns & unaddressed customer frustrations:\n${truncateForPrompt(conversionBlock, 900)}`
    );
  }

  if (brief.marketPatterns?.summary) {
    lines.push(
      `\nMETA AD LIBRARY PATTERNS (${brief.category}):\n${truncateForPrompt(brief.marketPatterns.summary, 900)}`
    );

    if (brief.marketPatterns.saturationNotes.length) {
      lines.push(
        `Saturation signals: ${brief.marketPatterns.saturationNotes.slice(0, 2).join(" ")}`
      );
    }
    if (brief.marketPatterns.differentiationOpportunities.length) {
      lines.push(
        `Differentiation opportunities: ${brief.marketPatterns.differentiationOpportunities.slice(0, 2).join(" ")}`
      );
    }
    if (brief.marketPatterns.engagementBenchmarks?.length) {
      lines.push(
        `\nENGAGEMENT BENCHMARKS (high-signal Meta ads in this niche):`
      );
      for (const b of brief.marketPatterns.engagementBenchmarks.slice(0, 4)) {
        lines.push(`  • ${b}`);
      }
    }
  }

  const qualityAds = brief.competitorAds.filter((a) => a.qualitySignal !== "low");
  const adsToShow = (qualityAds.length >= 3 ? qualityAds : brief.competitorAds).slice(
    0,
    8
  );

  if (adsToShow.length > 0) {
    lines.push(
      `\nACTIVE COMPETITOR ADS (${brief.category} — Meta Ad Library, ${brief.competitorAds.length} found):`
    );
    for (const ad of adsToShow) {
      lines.push(formatCompetitorAdLine(ad));
    }
    lines.push(
      "Quality rule: [high-signal] = long runtime or heavy advertiser repetition. [weak-signal] = treat as noise. Do NOT copy — use for competitive benchmarking only."
    );
  }

  if (brief.competitiveInsights?.length) {
    lines.push("\nCOMPETITIVE INTELLIGENCE SEEDS:");
    for (const insight of brief.competitiveInsights.slice(0, 4)) {
      lines.push(`  • ${insight}`);
    }
  }

  const toleranceBlock = formatToleranceSignalsForPrompt(
    brief.toleranceSignals ?? brief.marketPatterns?.toleranceSignals ?? []
  );
  if (toleranceBlock) {
    lines.push("", toleranceBlock);
  }

  lines.push(
    "\n=== COMPETITIVE EVALUATION MANDATE ===",
    "Compare the user's ad against these market examples on: (1) hook strength vs common openings, (2) creative style/format vs what scaled advertisers run, (3) messaging/angle vs competitor copy.",
    "Do NOT imitate competitors. Evaluate whether THIS creative is competitive, differentiated, or at risk of fatigue.",
    "\n=== END INTELLIGENCE BRIEF ==="
  );

  return lines.join("\n");
}

function cacheKey(workspaceId: string, category: string): string {
  return `${workspaceId}:${category.toLowerCase().trim()}:v5`;
}

export async function buildIntelligenceBrief(
  supabase: SupabaseClient,
  workspaceId: string,
  category: string,
  platforms: string[]
): Promise<IntelligenceBrief | null> {
  const key = cacheKey(workspaceId, category);

  try {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("intelligence_cache, intelligence_cache_updated_at")
      .eq("id", workspaceId)
      .single();

    if (ws?.intelligence_cache && ws.intelligence_cache_updated_at) {
      const age = Date.now() - new Date(ws.intelligence_cache_updated_at).getTime();
      const cached = ws.intelligence_cache as { key?: string; brief?: IntelligenceBrief };
      if (age < CACHE_TTL_MS && cached?.key === key && cached?.brief) {
        return cached.brief;
      }
    }
  } catch {
    // Cache miss — proceed to gather
  }

  const tavilyEnabled = Boolean(process.env.TAVILY_API_KEY?.trim());
  const metaEnabled = isMetaAdsLibraryConfigured();

  if (!tavilyEnabled && !metaEnabled) return null;

  const [marketCreative, audienceConversion, metaResult] = await Promise.all([
    tavilyEnabled
      ? runMarketCreativeSearch(category, platforms)
      : Promise.resolve(""),
    tavilyEnabled
      ? runAudienceConversionSearch(category, platforms)
      : Promise.resolve(""),
    metaEnabled
      ? fetchMetaAdsLibrary({ query: category, limit: 12 })
      : Promise.resolve({ ads: [] as CompetitorAd[], patterns: null, source: "none" as const }),
  ]);

  const competitorAds = metaResult.ads;
  const marketPatterns = metaResult.patterns ?? undefined;
  const competitiveInsights = buildCompetitiveInsights(competitorAds, metaResult.patterns);

  const researchBlob = [marketCreative, audienceConversion].filter(Boolean).join("\n");
  const toleranceSignals = enrichToleranceFromResearch(
    marketPatterns?.toleranceSignals ?? [],
    researchBlob
  );

  const brief: IntelligenceBrief = {
    gatheredAt: new Date().toISOString(),
    category,
    platforms,
    platformTrends: marketCreative,
    competitorAngles: marketCreative,
    categoryConversion: audienceConversion,
    customerFrustrations: audienceConversion,
    audienceContent: audienceConversion,
    winningScriptPatterns: marketCreative,
    nicheSophistication: audienceConversion,
    competitorAds,
    marketPatterns: marketPatterns
      ? { ...marketPatterns, toleranceSignals: toleranceSignals.length ? toleranceSignals : marketPatterns.toleranceSignals }
      : undefined,
    competitiveInsights,
    toleranceSignals: toleranceSignals.length ? toleranceSignals : undefined,
    sources: {
      tavilyEnabled,
      metaEnabled,
      apifyEnabled: Boolean(process.env.APIFY_API_TOKEN?.trim()),
      metaSource: metaResult.source,
      adsFound: competitorAds.length,
      adsHighQuality: competitorAds.filter((a) => a.qualitySignal === "high").length,
      searchesRun: tavilyEnabled ? 2 : 0,
    },
  };

  try {
    await supabase
      .from("workspaces")
      .update({
        intelligence_cache: { key, brief },
        intelligence_cache_updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId);
  } catch {
    // Cache write failure is non-fatal
  }

  return brief;
}

/** Targeted market context for deconstruction — advertiser + optional category. */
export async function buildDeconstructionMarketContext(
  advertiser: string,
  category?: string,
  preloadedAdvertiserAds?: CompetitorAd[]
): Promise<{
  marketContextText: string;
  competitorAds: CompetitorAd[];
  patternsSummary?: string;
  competitiveInsights: string[];
}> {
  if (!isMetaAdsLibraryConfigured()) {
    return { marketContextText: "", competitorAds: [], competitiveInsights: [] };
  }

  const [advertiserResult, categoryResult] = await Promise.all([
    preloadedAdvertiserAds?.length
      ? Promise.resolve({
          ads: preloadedAdvertiserAds,
          patterns: null as MarketPatterns | null,
          source: "none" as const,
        })
      : fetchMetaAdsLibrary({ query: advertiser, limit: 15 }),
    category && category.toLowerCase() !== advertiser.toLowerCase()
      ? fetchMetaAdsLibrary({ query: category, limit: 10 })
      : Promise.resolve({ ads: [] as CompetitorAd[], patterns: null, source: "none" as const }),
  ]);

  const merged = [...advertiserResult.ads];
  const seen = new Set(merged.map((a) => `${a.advertiser}:${a.copySnippet.slice(0, 60)}`));
  for (const ad of categoryResult.ads) {
    const k = `${ad.advertiser}:${ad.copySnippet.slice(0, 60)}`;
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(ad);
    }
  }

  const patterns =
    advertiserResult.patterns ??
    (preloadedAdvertiserAds?.length
      ? buildMarketPatterns(preloadedAdvertiserAds, advertiser)
      : null) ??
    categoryResult.patterns ??
    null;
  const insights = buildCompetitiveInsights(merged, patterns);

  const lines: string[] = ["=== MARKET CONTEXT (Meta Ad Library) ==="];
  if (patterns?.summary) {
    lines.push(patterns.summary);
  }
  if (merged.length) {
    lines.push(`\nSample active ads (${merged.length}):`);
    for (const ad of merged.slice(0, 6)) {
      lines.push(formatCompetitorAdLine(ad));
    }
  }
  if (insights.length) {
    lines.push("\nMarket signals:");
    for (const i of insights) lines.push(`  • ${i}`);
  }
  lines.push(
    "\nUse this to explain WHY the reference ad's approach works or differs vs the market. Do not assume every scraped ad is a winner."
  );

  return {
    marketContextText: merged.length || patterns ? lines.join("\n") : "",
    competitorAds: merged,
    patternsSummary: patterns?.summary,
    competitiveInsights: insights,
  };
}
