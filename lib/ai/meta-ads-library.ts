import "server-only";
import { buildToleranceSignalsFromAds } from "@/lib/ai/tolerance-signals";
import type { CompetitorAd, MarketPatterns } from "@/lib/types/report";

// ---------------------------------------------------------------------------
// Meta Ad Library via official Graph API (primary) with Apify fallback.
// Keep limits low; callers should cache aggressively.
// ---------------------------------------------------------------------------

const DEFAULT_ACTOR = "apify/facebook-ads-scraper";
const APIFY_TIMEOUT_SEC = 55;
const FETCH_TIMEOUT_MS = 58_000;

export type MetaAdsSearchOptions = {
  /** Keyword or advertiser name */
  query: string;
  /** Max ads to bill for (Apify charges per result) */
  limit?: number;
  country?: string;
};

export type MetaAdsFetchResult = {
  ads: CompetitorAd[];
  patterns: MarketPatterns | null;
  source: "apify" | "graph_api" | "none";
  error?: string;
};

type RawApifyItem = Record<string, unknown>;

function apifyToken(): string | null {
  return process.env.APIFY_API_TOKEN?.trim() || null;
}

function graphToken(): string | null {
  return process.env.META_AD_LIBRARY_TOKEN?.trim() || null;
}

export function isMetaAdsLibraryConfigured(): boolean {
  return Boolean(apifyToken() || graphToken());
}

function actorId(): string {
  return process.env.APIFY_META_ADS_ACTOR_ID?.trim() || DEFAULT_ACTOR;
}

function encodeActorId(id: string): string {
  return id.replace("/", "~");
}

function buildAdLibrarySearchUrl(query: string, country = "US"): string {
  const params = new URLSearchParams({
    active_status: "active",
    ad_type: "all",
    country,
    q: query.trim(),
    search_type: "keyword_unordered",
    media_type: "all",
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

function pickString(obj: RawApifyItem, keys: string[]): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
    if (Array.isArray(val) && typeof val[0] === "string" && val[0].trim()) {
      return val[0].trim();
    }
  }
  return "";
}

function pickStringArray(obj: RawApifyItem, keys: string[]): string[] {
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) {
      return val.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    }
    if (typeof val === "string" && val.trim()) return [val.trim()];
  }
  return [];
}

function parseRunningDays(raw: RawApifyItem): number | undefined {
  const startRaw =
    pickString(raw, [
      "adDeliveryStartTime",
      "ad_delivery_start_time",
      "startDate",
      "start_date",
      "deliveryStartTime",
    ]) || "";

  if (startRaw) {
    const start = new Date(startRaw).getTime();
    if (!Number.isNaN(start)) {
      return Math.max(0, Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24)));
    }
  }

  const days = raw.runningDays ?? raw.running_days;
  if (typeof days === "number" && days >= 0) return days;

  return undefined;
}

function inferFormatSignals(copy: string): string[] {
  const lower = copy.toLowerCase();
  const signals: string[] = [];
  if (/\b(ugc|pov|storytime|grwm|get ready with me)\b/.test(lower)) signals.push("UGC-native");
  if (/\b(i |i'|my |honestly|real talk|not sponsored)\b/.test(lower)) signals.push("creator-voice");
  if (/\b(before and after|transformation|results)\b/.test(lower)) signals.push("transformation");
  if (/\b(\d+%|\$\d|off|free shipping|guarantee)\b/.test(lower)) signals.push("offer-led");
  if (/\b(how to|here's why|the reason)\b/.test(lower)) signals.push("educational");
  if (/\b(founder|we started|our story)\b/.test(lower)) signals.push("founder-story");
  return signals;
}

function hookFromCopy(copy: string): string {
  const line = copy.split(/\n/)[0]?.trim() || copy.trim();
  const words = line.split(/\s+/).slice(0, 10).join(" ");
  return words.length > 8 ? `${words}…` : words;
}

function qualityTier(
  runningDays: number | undefined,
  copyLen: number,
  advertiserAdCount: number
): { tier: CompetitorAd["qualitySignal"]; note: string } {
  let score = 0;
  if (runningDays != null) {
    if (runningDays >= 45) score += 35;
    else if (runningDays >= 21) score += 25;
    else if (runningDays >= 7) score += 12;
  }
  if (copyLen >= 80) score += 15;
  if (advertiserAdCount >= 5) score += 30;
  else if (advertiserAdCount >= 3) score += 20;
  else if (advertiserAdCount >= 2) score += 10;

  if (score >= 45) {
    return {
      tier: "high",
      note: "Likely scaled — long runtime and/or heavy advertiser repetition in library.",
    };
  }
  if (score >= 22) {
    return {
      tier: "medium",
      note: "Moderate signal — active but not enough data to call a proven winner.",
    };
  }
  return {
    tier: "low",
    note: "Weak longevity signal — treat as market noise, not a proven pattern.",
  };
}

function normalizeApifyItem(raw: RawApifyItem, advertiserCounts: Map<string, number>): CompetitorAd | null {
  const advertiser =
    pickString(raw, [
      "pageName",
      "page_name",
      "advertiserName",
      "advertiser",
      "pageTitle",
    ]) || "Unknown";

  const body = pickString(raw, [
    "adCreativeBody",
    "ad_creative_bodies",
    "body",
    "adCreativeBodies",
    "text",
    "primaryText",
  ]);
  const linkTitle = pickString(raw, [
    "adCreativeLinkTitle",
    "ad_creative_link_titles",
    "linkTitle",
    "headline",
    "title",
  ]);
  const copySnippet = (body || linkTitle).slice(0, 320);
  if (!copySnippet && advertiser === "Unknown") return null;

  const cta =
    pickString(raw, [
      "callToAction",
      "call_to_action_type",
      "ctaText",
      "cta",
    ]).replace(/_/g, " ") || "";

  const runningDays = parseRunningDays(raw);
  const platforms = pickStringArray(raw, [
    "publisherPlatform",
    "publisher_platforms",
    "platforms",
  ]);

  const advKey = advertiser.toLowerCase();
  const advertiserAdCount = advertiserCounts.get(advKey) ?? 1;
  const { tier, note } = qualityTier(runningDays, copySnippet.length, advertiserAdCount);

  return {
    advertiser,
    copySnippet,
    cta,
    runningDays,
    headline: linkTitle || undefined,
    platforms: platforms.length ? platforms : undefined,
    formatSignals: inferFormatSignals(copySnippet),
    hookPattern: hookFromCopy(copySnippet),
    qualitySignal: tier,
    qualityNote: note,
    advertiserAdCount,
  };
}

function normalizeApifyDataset(items: unknown[]): CompetitorAd[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const rawItems = items.filter(
    (item): item is RawApifyItem => typeof item === "object" && item !== null
  );

  const advertiserCounts = new Map<string, number>();
  for (const raw of rawItems) {
    const name =
      pickString(raw, ["pageName", "page_name", "advertiserName", "advertiser"]) ||
      "unknown";
    const key = name.toLowerCase();
    advertiserCounts.set(key, (advertiserCounts.get(key) ?? 0) + 1);
  }

  const seen = new Set<string>();
  const ads: CompetitorAd[] = [];

  for (const raw of rawItems) {
    const ad = normalizeApifyItem(raw, advertiserCounts);
    if (!ad) continue;
    const dedupeKey = `${ad.advertiser}:${ad.copySnippet.slice(0, 80)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    ads.push(ad);
  }

  return ads.sort((a, b) => {
    const tierScore = (t?: CompetitorAd["qualitySignal"]) =>
      t === "high" ? 3 : t === "medium" ? 2 : 1;
    const diff = tierScore(b.qualitySignal) - tierScore(a.qualitySignal);
    if (diff !== 0) return diff;
    return (b.runningDays ?? 0) - (a.runningDays ?? 0);
  });
}

async function fetchViaApify(options: MetaAdsSearchOptions): Promise<CompetitorAd[]> {
  const token = apifyToken();
  if (!token) return [];

  const limit = Math.min(Math.max(options.limit ?? 12, 1), 30);
  const country = options.country ?? "US";
  const query = options.query.trim();
  if (!query) return [];

  const input = {
    startUrls: [{ url: buildAdLibrarySearchUrl(query, country) }],
    resultsLimit: limit,
    activeStatus: "active",
  };

  const actor = encodeActorId(actorId());
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=${APIFY_TIMEOUT_SEC}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return [];

    const items = (await res.json()) as unknown[];
    return normalizeApifyDataset(items).slice(0, limit);
  } catch {
    return [];
  }
}

type GraphAdRaw = {
  id?: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_delivery_start_time?: string;
  call_to_action_type?: string;
};

async function fetchViaGraphApi(options: MetaAdsSearchOptions): Promise<CompetitorAd[]> {
  const token = graphToken();
  if (!token) return [];

  const limit = Math.min(Math.max(options.limit ?? 12, 1), 25);
  const query = options.query.trim();
  if (!query) return [];

  try {
    const params = new URLSearchParams({
      access_token: token,
      ad_type: "ALL",
      ad_reached_countries: `["${options.country ?? "US"}"]`,
      search_terms: query,
      fields:
        "id,page_name,ad_creative_bodies,ad_creative_link_titles,ad_delivery_start_time,call_to_action_type",
      limit: String(limit),
      ad_active_status: "ACTIVE",
    });

    const url = `https://graph.facebook.com/v20.0/ads_archive?${params.toString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];

    const json = (await res.json()) as { data?: GraphAdRaw[] };
    if (!Array.isArray(json.data)) return [];

    const advertiserCounts = new Map<string, number>();
    for (const ad of json.data) {
      const name = (ad.page_name ?? "unknown").toLowerCase();
      advertiserCounts.set(name, (advertiserCounts.get(name) ?? 0) + 1);
    }

    return json.data
      .map((ad): CompetitorAd | null => {
        const copyText =
          ad.ad_creative_bodies?.[0] ?? ad.ad_creative_link_titles?.[0] ?? "";
        if (!copyText && !ad.page_name) return null;

        let runningDays: number | undefined;
        if (ad.ad_delivery_start_time) {
          const start = new Date(ad.ad_delivery_start_time).getTime();
          runningDays = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
        }

        const advertiser = ad.page_name ?? "Unknown";
        const advCount = advertiserCounts.get(advertiser.toLowerCase()) ?? 1;
        const snippet = copyText.slice(0, 320);
        const { tier, note } = qualityTier(runningDays, snippet.length, advCount);

        return {
          advertiser,
          copySnippet: snippet,
          cta: ad.call_to_action_type?.replace(/_/g, " ") ?? "",
          runningDays,
          headline: ad.ad_creative_link_titles?.[0],
          formatSignals: inferFormatSignals(snippet),
          hookPattern: hookFromCopy(snippet),
          qualitySignal: tier,
          qualityNote: note,
          advertiserAdCount: advCount,
        };
      })
      .filter((ad): ad is CompetitorAd => ad !== null);
  } catch {
    return [];
  }
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function topKeys(map: Map<string, number>, limit = 4): string[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => (count > 1 ? `${key} (${count} ads)` : key));
}

/** Deterministic pattern summary — no extra AI call. */
export function buildMarketPatterns(ads: CompetitorAd[], category: string): MarketPatterns {
  const qualityAds = ads.filter((a) => a.qualitySignal !== "low");
  const signalPool = qualityAds.length >= 3 ? qualityAds : ads;

  const hookCounts = countBy(signalPool, (a) => a.hookPattern?.toLowerCase() ?? "");
  const angleCounts = countBy(signalPool, (a) =>
    (a.formatSignals ?? []).join(",") || "unspecified"
  );
  const ctaCounts = countBy(
    signalPool.filter((a) => a.cta),
    (a) => a.cta.toLowerCase()
  );

  const longRunners = signalPool.filter((a) => (a.runningDays ?? 0) >= 21);
  const heavyAdvertisers = signalPool.filter((a) => (a.advertiserAdCount ?? 0) >= 3);

  const dominantHooks = topKeys(hookCounts, 5);
  const dominantAngles = topKeys(angleCounts, 4);
  const commonCtas = topKeys(ctaCounts, 3);

  const saturationNotes: string[] = [];
  if (dominantHooks.length >= 2) {
    saturationNotes.push(
      `Repeated opening patterns in library: ${dominantHooks.slice(0, 3).join("; ")}.`
    );
  }
  if (heavyAdvertisers.length >= 2) {
    saturationNotes.push(
      `${heavyAdvertisers.length} advertisers run 3+ active variants — category is actively tested.`
    );
  }
  if (longRunners.length >= 2) {
    saturationNotes.push(
      `${longRunners.length} ads show 21+ day runtime — likely scaled creatives in this niche.`
    );
  }

  const differentiationOpportunities: string[] = [];
  const allFormats = new Set(signalPool.flatMap((a) => a.formatSignals ?? []));
  if (!allFormats.has("founder-story")) {
    differentiationOpportunities.push("Few founder-story angles observed — potential differentiation.");
  }
  if (!allFormats.has("educational")) {
    differentiationOpportunities.push("Educational/mechanism hooks appear underused vs problem-led copy.");
  }
  if (qualityAds.length < ads.length / 2) {
    differentiationOpportunities.push(
      "Many scraped ads show weak longevity signals — focus on patterns from high-signal ads only."
    );
  }

  const highCount = ads.filter((a) => a.qualitySignal === "high").length;
  const engagementBenchmarks: string[] = [];
  const highSignal = signalPool.filter((a) => a.qualitySignal === "high");
  const formatPool = highSignal.length >= 2 ? highSignal : signalPool;

  const ugcCount = formatPool.filter((a) =>
    a.formatSignals?.includes("UGC-native")
  ).length;
  if (ugcCount >= Math.ceil(formatPool.length * 0.4)) {
    engagementBenchmarks.push(
      "Scaled ads in this niche skew UGC-native / creator-voice — feed-native energy expected."
    );
  }
  const offerLed = formatPool.filter((a) =>
    a.formatSignals?.includes("offer-led")
  ).length;
  if (offerLed >= Math.ceil(formatPool.length * 0.35)) {
    engagementBenchmarks.push(
      "Offer-led openings are common among long-running ads — value must land fast visually."
    );
  }
  if (longRunners.length >= 2 && dominantHooks.length) {
    engagementBenchmarks.push(
      `High-signal ads often open like: "${dominantHooks[0]}" — compare organic watchability, not just copy quality.`
    );
  }
  if (formatPool.length >= 3) {
    engagementBenchmarks.push(
      "Retention bar: would this creative earn watch time if posted as organic content in this niche — or does it smell like skippable ad creative?"
    );
  }

  const summary = [
    `Meta Ad Library scan for "${category}": ${ads.length} active ads, ${highCount} high-signal (long-running / heavy repetition).`,
    dominantHooks.length
      ? `Common hooks: ${dominantHooks.slice(0, 3).join(" | ")}.`
      : "Insufficient hook pattern data.",
    dominantAngles.length
      ? `Creative angles: ${dominantAngles.slice(0, 3).join(" | ")}.`
      : "",
    commonCtas.length ? `Common CTAs: ${commonCtas.join(", ")}.` : "",
    "Do NOT treat every scraped ad as a winner — weight long-running ads and heavy advertisers higher.",
  ]
    .filter(Boolean)
    .join(" ");

  const toleranceSignals = buildToleranceSignalsFromAds(ads);

  return {
    dominantHooks,
    dominantAngles,
    commonCtas,
    longRunningAdCount: longRunners.length,
    heavyAdvertiserCount: heavyAdvertisers.length,
    saturationNotes,
    differentiationOpportunities,
    engagementBenchmarks,
    toleranceSignals: toleranceSignals.length ? toleranceSignals : undefined,
    summary,
  };
}

export function buildCompetitiveInsights(
  ads: CompetitorAd[],
  patterns: MarketPatterns | null
): string[] {
  const insights: string[] = [];
  if (!ads.length) return insights;

  const high = ads.filter((a) => a.qualitySignal === "high");
  if (high.length >= 2 && patterns?.dominantHooks.length) {
    insights.push(
      `${high.length} long-running competitor ads use similar opening structures — compare your hook against: "${patterns.dominantHooks[0]}".`
    );
  }

  if (patterns?.differentiationOpportunities.length) {
    insights.push(patterns.differentiationOpportunities[0]);
  }

  if (patterns?.saturationNotes.length) {
    insights.push(patterns.saturationNotes[0]);
  }

  if (patterns?.engagementBenchmarks?.length) {
    insights.push(patterns.engagementBenchmarks[0]);
  }

  return insights.slice(0, 4);
}

/**
 * Fetch competitor ads — official Graph API first, Apify fallback.
 * Never throws; returns empty on failure.
 */
export async function fetchMetaAdsLibrary(
  options: MetaAdsSearchOptions
): Promise<MetaAdsFetchResult> {
  const query = options.query.trim();
  if (!query) {
    return { ads: [], patterns: null, source: "none" };
  }

  let ads: CompetitorAd[] = [];
  let source: MetaAdsFetchResult["source"] = "none";

  if (graphToken()) {
    ads = await fetchViaGraphApi(options);
    if (ads.length) source = "graph_api";
  }

  if (!ads.length && apifyToken()) {
    ads = await fetchViaApify(options);
    if (ads.length) source = "apify";
  }

  const patterns = ads.length ? buildMarketPatterns(ads, query) : null;

  return { ads, patterns, source };
}

/** Count active ads for an advertiser — lightweight query, low limit. */
export async function countAdvertiserActiveAds(
  advertiserName: string
): Promise<{ count: number; sampleAds: CompetitorAd[] }> {
  const name = advertiserName.trim();
  if (!name) return { count: 0, sampleAds: [] };

  const result = await fetchMetaAdsLibrary({ query: name, limit: 20 });
  const matching = result.ads.filter(
    (a) =>
      a.advertiser.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(a.advertiser.toLowerCase().split(" ")[0] ?? "")
  );

  const pool = matching.length ? matching : result.ads;
  return { count: pool.length, sampleAds: pool.slice(0, 5) };
}
