import "server-only";
import { tavily } from "@tavily/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntelligenceBrief, CompetitorAd } from "@/lib/types/report";

// ---------------------------------------------------------------------------
// API key setup
//
// Tavily:  https://app.tavily.com/home  →  API Keys
//          Set TAVILY_API_KEY in .env.local
//
// Meta Ad Library:
//   1. Create a Facebook App at https://developers.facebook.com
//   2. Request "Ads Library API" product access
//   3. Generate a long-lived user/app token with `ads_read` permission
//   4. Set META_AD_LIBRARY_TOKEN in .env.local
//   Note: Basic ad creative fields (page_name, ad text, start date) are
//   available without researcher-level access. Spend/impressions require
//   special Meta research access approval.
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — invalidate via cache key bump on schema change

// ---------------------------------------------------------------------------
// Tavily client (lazy singleton)
// ---------------------------------------------------------------------------

let _tavilyClient: ReturnType<typeof tavily> | null = null;

function getTavily() {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return null;
  if (!_tavilyClient) {
    _tavilyClient = tavily({ apiKey: key });
  }
  return _tavilyClient;
}

// ---------------------------------------------------------------------------
// Tavily search helpers — each returns a compact text summary
// ---------------------------------------------------------------------------

async function tavilySearch(query: string): Promise<string> {
  const client = getTavily();
  if (!client) return "";

  try {
    const res = await client.search(query, {
      searchDepth: "basic",
      maxResults: 5,
      includeAnswer: "basic",
      timeRange: "month",
    });

    const answer = typeof res.answer === "string" ? res.answer.trim() : "";
    const snippets = res.results
      .slice(0, 4)
      .map((r) => `• ${r.title}: ${r.content.slice(0, 180).replace(/\n/g, " ")}`)
      .join("\n");

    return [answer, snippets].filter(Boolean).join("\n").trim();
  } catch {
    return "";
  }
}

/** Merged search 1: hooks, formats, competitor angles, winning scripts. */
async function runMarketCreativeSearch(
  category: string,
  platforms: string[]
): Promise<string> {
  const platformStr = platforms.slice(0, 2).join(" ") || "Meta TikTok";
  const query = `best performing ${platformStr} ${category} DTC ad hooks creative formats winning script opening lines competitor angles viral UGC examples 2025`;
  return tavilySearch(query);
}

/** Merged search 2: audience behavior + buyer psychology. */
async function runAudiencePsychologySearch(
  category: string,
  platforms: string[]
): Promise<string> {
  const platform = platforms[0] || "TikTok";
  const query = `${category} audience content ${platform} creator UGC trends buyer psychology objections market sophistication ad fatigue DTC 2025`;
  return tavilySearch(query);
}

/** Merged search 3: LP conversion patterns + customer frustrations. */
async function runConversionFrustrationSearch(category: string): Promise<string> {
  const query = `${category} DTC landing page conversion offers guarantees objections customer complaints frustrations Reddit Amazon reviews what brands get wrong 2025`;
  return tavilySearch(query);
}

// ---------------------------------------------------------------------------
// Meta Ad Library
// ---------------------------------------------------------------------------

type MetaAdRaw = {
  id?: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_delivery_start_time?: string;
  call_to_action_type?: string;
};

async function fetchMetaCompetitorAds(category: string): Promise<CompetitorAd[]> {
  const token = process.env.META_AD_LIBRARY_TOKEN?.trim();
  if (!token) return [];

  try {
    const params = new URLSearchParams({
      access_token: token,
      ad_type: "ALL",
      ad_reached_countries: '["US"]',
      search_terms: category,
      fields: "id,page_name,ad_creative_bodies,ad_creative_link_titles,ad_delivery_start_time,call_to_action_type",
      limit: "10",
      ad_active_status: "ACTIVE",
    });

    const url = `https://graph.facebook.com/v20.0/ads_archive?${params.toString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });

    if (!res.ok) return [];

    const json = (await res.json()) as { data?: MetaAdRaw[]; error?: { message: string } };
    if (json.error || !Array.isArray(json.data)) return [];

    return json.data
      .filter((ad) => ad.page_name || ad.ad_creative_bodies?.length)
      .slice(0, 10)
      .map((ad): CompetitorAd => {
        const copyText =
          ad.ad_creative_bodies?.[0] ??
          ad.ad_creative_link_titles?.[0] ??
          "";

        let runningDays: number | undefined;
        if (ad.ad_delivery_start_time) {
          const start = new Date(ad.ad_delivery_start_time).getTime();
          runningDays = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
        }

        return {
          advertiser: ad.page_name ?? "Unknown",
          copySnippet: copyText.slice(0, 300),
          cta: ad.call_to_action_type ?? "",
          runningDays,
        };
      })
      .filter((ad) => ad.copySnippet || ad.advertiser !== "Unknown");
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Format brief as prompt text — injected into every agent's context
// ---------------------------------------------------------------------------

function truncateForPrompt(text: string, maxLen = 720): string {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen).trim()}…`;
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

  if (brief.competitorAds.length > 0) {
    lines.push(`\nACTIVE COMPETITOR ADS (${brief.category} — from Meta Ad Library):`);
    for (const ad of brief.competitorAds) {
      const duration = ad.runningDays != null ? ` — Running ${ad.runningDays}d` : "";
      const cta = ad.cta ? ` — CTA: ${ad.cta}` : "";
      lines.push(`  ${ad.advertiser}${duration}${cta}: "${ad.copySnippet}"`);
    }
  }

  lines.push("\n=== END INTELLIGENCE BRIEF ===");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Cache key
// ---------------------------------------------------------------------------

function cacheKey(workspaceId: string, category: string): string {
  return `${workspaceId}:${category.toLowerCase().trim()}:v3`;
}

// ---------------------------------------------------------------------------
// Main entry point: gather or return cached brief
// ---------------------------------------------------------------------------

export async function buildIntelligenceBrief(
  supabase: SupabaseClient,
  workspaceId: string,
  category: string,
  platforms: string[]
): Promise<IntelligenceBrief | null> {
  const key = cacheKey(workspaceId, category);

  // Check cache in workspaces table
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

  // Determine if Tavily is configured
  const tavilyEnabled = Boolean(process.env.TAVILY_API_KEY?.trim());
  const metaEnabled = Boolean(process.env.META_AD_LIBRARY_TOKEN?.trim());

  if (!tavilyEnabled && !metaEnabled) return null;

  // Three merged Tavily queries (down from 7) + Meta Ad Library
  const [marketCreative, audiencePsychology, conversionFrustration, competitorAds] =
    await Promise.all([
      tavilyEnabled
        ? runMarketCreativeSearch(category, platforms)
        : Promise.resolve(""),
      tavilyEnabled
        ? runAudiencePsychologySearch(category, platforms)
        : Promise.resolve(""),
      tavilyEnabled
        ? runConversionFrustrationSearch(category)
        : Promise.resolve(""),
      metaEnabled ? fetchMetaCompetitorAds(category) : Promise.resolve([] as CompetitorAd[]),
    ]);

  const platformTrends = marketCreative;
  const competitorAngles = marketCreative;
  const winningScriptPatterns = marketCreative;
  const audienceContent = audiencePsychology;
  const nicheSophistication = audiencePsychology;
  const categoryConversion = conversionFrustration;
  const customerFrustrations = conversionFrustration;

  // If Meta returned nothing, use Tavily competitor results as fallback signal
  // (agents will get the text version from competitorAngles; no structural change needed)

  const brief: IntelligenceBrief = {
    gatheredAt: new Date().toISOString(),
    category,
    platforms,
    platformTrends,
    competitorAngles,
    categoryConversion,
    customerFrustrations,
    audienceContent,
    winningScriptPatterns,
    nicheSophistication,
    competitorAds,
    sources: {
      tavilyEnabled,
      metaEnabled,
      adsFound: competitorAds.length,
      searchesRun: tavilyEnabled ? 3 : 0,
    },
  };

  // Persist to cache
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
