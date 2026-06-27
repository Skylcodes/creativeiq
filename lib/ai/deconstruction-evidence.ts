import "server-only";
import { tavily } from "@tavily/core";
import { scrapePage } from "@/lib/ai/scrape";
import { countAdvertiserActiveAds } from "@/lib/ai/meta-ads-library";
import type {
  DeconstructionInput,
  EvidenceConfidence,
  EvidenceReport,
  EvidenceSignals,
} from "@/lib/types/deconstruction";
import type { CompetitorAd } from "@/lib/types/report";

let _tavilyClient: ReturnType<typeof tavily> | null = null;

function getTavily() {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) return null;
  if (!_tavilyClient) _tavilyClient = tavily({ apiKey: key });
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
      timeRange: "year",
    });

    const answer = typeof res.answer === "string" ? res.answer.trim() : "";
    const snippets = res.results
      .slice(0, 3)
      .map((r) => `${r.title}: ${r.content.slice(0, 200).replace(/\n/g, " ")}`)
      .join("\n");

    return [answer, snippets].filter(Boolean).join("\n").trim();
  } catch {
    return "";
  }
}

function brandHintFromLandingUrl(url: string): string {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const host = new URL(normalized).hostname.replace(/^www\./, "");
    const segment = host.split(".")[0] ?? "";
    if (!segment || segment.length < 2) return "";
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  } catch {
    return "";
  }
}

async function resolveAdvertiserFromLandingPage(
  landingPageUrl: string
): Promise<string> {
  const fallback = brandHintFromLandingUrl(landingPageUrl);
  try {
    const lp = await scrapePage(landingPageUrl);
    if (!lp.ok || !lp.bodyText) return fallback;

    const titleMatch = lp.asPromptText?.match(/^#\s*(.+)/m);
    if (titleMatch?.[1]) {
      const title = titleMatch[1].split("|")[0]?.split("-")[0]?.trim();
      if (title && title.length > 2 && title.length < 60) return title;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

async function resolveAdvertiserAdSignals(
  advertiserName: string
): Promise<{ count: number; sampleCopy?: string; sampleAds: CompetitorAd[] }> {
  if (!advertiserName.trim()) return { count: 0, sampleAds: [] };

  try {
    const { count, sampleAds } = await countAdvertiserActiveAds(advertiserName);
    return {
      count,
      sampleCopy: sampleAds[0]?.copySnippet,
      sampleAds,
    };
  } catch {
    return { count: 0, sampleAds: [] };
  }
}

const PERFORMANCE_KEYWORDS =
  /\b(case study|performed well|top performer|winning ad|scaled|roas|cpa|conversion rate|viral|best.?performing|crushed it|record sales|sold out)\b/i;

async function searchPerformanceEvidence(
  advertiser: string,
  context?: string
): Promise<{ hasDirectEvidence: boolean; hasMention: boolean }> {
  const conceptPart = context ? ` ${context.slice(0, 80)}` : "";
  const query = `${advertiser}${conceptPart} ad campaign performance results case study winning creative DTC`;
  const text = await tavilySearch(query);

  if (!text) return { hasDirectEvidence: false, hasMention: false };

  const hasDirectEvidence =
    PERFORMANCE_KEYWORDS.test(text) &&
    (/\b(\d+%|\$\d|x roas|\d+ days)\b/i.test(text) ||
      /case study|stated results|reported/i.test(text));

  return { hasDirectEvidence, hasMention: PERFORMANCE_KEYWORDS.test(text) };
}

function computeConfidence(signals: EvidenceSignals): EvidenceConfidence {
  const { directPerformanceEvidence, establishedAdvertiser, tavilyPerformanceMention } =
    signals;

  if (directPerformanceEvidence) return "high";
  if (establishedAdvertiser && tavilyPerformanceMention) return "medium";
  if (establishedAdvertiser || tavilyPerformanceMention) return "medium";
  return "low";
}

function buildEvidenceReport(
  confidence: EvidenceConfidence,
  signals: EvidenceSignals,
  opts: {
    advertiser?: string;
    unverifiedUpload: boolean;
    adCopySnippet?: string;
    sampleAds?: CompetitorAd[];
  }
): EvidenceReport {
  const badges: string[] = [];
  const { advertiserAdCount, directPerformanceEvidence, establishedAdvertiser } = signals;

  if (directPerformanceEvidence) {
    badges.push("Public performance evidence found");
  }

  if (establishedAdvertiser && advertiserAdCount != null && advertiserAdCount >= 3) {
    badges.push(`${advertiserAdCount}+ active ads in Meta Ad Library`);
  }

  if (opts.advertiser) {
    badges.push(`Brand: ${opts.advertiser}`);
  }

  if (opts.unverifiedUpload) {
    badges.push("Uploaded creative — specific ad runtime unverified");
  }

  let summary: string;
  let caveat: string | undefined;

  if (confidence === "high") {
    summary =
      badges.length > 0
        ? badges.slice(0, 2).join(". ") + "."
        : "Strong performance signals verified for this brand.";
  } else if (confidence === "medium") {
    summary =
      "Limited evidence this specific uploaded ad is a proven winner — brand-level signals only.";
    caveat =
      "Limited evidence this specific ad is a proven winner. Treating this as a reasonable creative example rather than a confirmed top performer — recommendations are directional, not guaranteed.";
  } else {
    summary = opts.advertiser
      ? "Could not verify strong performance signals for this brand or ad."
      : "Could not identify the brand or verify performance data.";
  }

  return {
    confidence,
    summary,
    badges,
    signals,
    caveat,
    resolvedAdvertiser: opts.advertiser,
    adCopySnippet: opts.adCopySnippet,
    sampleAds: opts.sampleAds,
  };
}

/** Verify whether there is evidence the submitted ad / brand is actually performing. */
export async function verifyAdEvidence(
  input: DeconstructionInput
): Promise<EvidenceReport> {
  const signals: EvidenceSignals = {};
  const advertiser = await resolveAdvertiserFromLandingPage(input.landingPageUrl);

  if (!advertiser) {
    return buildEvidenceReport("low", signals, { unverifiedUpload: true });
  }

  const { count: adCount, sampleCopy, sampleAds } =
    await resolveAdvertiserAdSignals(advertiser);
  signals.advertiserAdCount = adCount;
  signals.establishedAdvertiser = adCount >= 3;
  signals.metaAdFound = adCount > 0;

  // Meta Ad Library is sufficient for established brands — skip Tavily when 5+ active ads
  if (adCount < 5) {
    const tavilyResult = await searchPerformanceEvidence(advertiser, input.userNotes);
    signals.tavilyPerformanceMention = tavilyResult.hasMention;
    signals.directPerformanceEvidence = tavilyResult.hasDirectEvidence;
  }

  let confidence = computeConfidence(signals);

  // Uploaded file — cannot verify THIS specific creative's runtime in Ad Library
  if (confidence === "high" && !signals.directPerformanceEvidence) {
    confidence = "medium";
  }
  if (!signals.establishedAdvertiser && !signals.directPerformanceEvidence) {
    confidence = "low";
  }

  return buildEvidenceReport(confidence, signals, {
    advertiser,
    unverifiedUpload: true,
    adCopySnippet: sampleCopy,
    sampleAds,
  });
}
