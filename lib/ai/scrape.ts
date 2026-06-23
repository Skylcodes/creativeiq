import "server-only";

export type ScrapeResult = {
  ok: boolean;
  url: string;
  title: string;
  metaDescription: string;
  headings: string[];
  ctas: string[];
  bodyText: string;
  /** A single text block ready to drop into a prompt. */
  asPromptText: string;
  error?: string;
};

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BODY_CHARS = 8000;
export const MIN_SCRAPE_CHARS = 200;

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");
}

function matchAll(html: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = decodeEntities(m[1].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (text) out.push(text);
  }
  return out;
}

function extractMetaMap(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const patterns = [
    /<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']*)["'][^>]*>/gi,
    /<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']([^"']+)["'][^>]*>/gi,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const key = m[1].toLowerCase();
      const value = decodeEntities(m[2]).trim();
      if (key && value && !map.has(key)) {
        map.set(key, value);
      }
    }
  }

  return map;
}

function metaGet(map: Map<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = map.get(key.toLowerCase());
    if (value) return value;
  }
  return "";
}

type StructuredPageData = {
  productName?: string;
  description?: string;
  brand?: string;
  price?: string;
  currency?: string;
  availability?: string;
  rating?: string;
  reviewCount?: string;
  sku?: string;
  category?: string;
  bulletPoints: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  const record = asRecord(value);
  if (record && typeof record.name === "string") return record.name.trim();
  return "";
}

function isProductType(type: unknown): boolean {
  if (typeof type === "string") {
    return type === "Product" || type.endsWith("Product");
  }
  if (Array.isArray(type)) {
    return type.some(isProductType);
  }
  return false;
}

function collectJsonLdNodes(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.flatMap((item) => collectJsonLdNodes(item));
  }
  const record = asRecord(data);
  if (!record) return [];

  if (Array.isArray(record["@graph"])) {
    return record["@graph"].flatMap((item) => collectJsonLdNodes(item));
  }

  return [record];
}

function readOffer(offer: unknown): { price?: string; currency?: string; availability?: string } {
  const record = asRecord(offer);
  if (!record) return {};

  if (Array.isArray(offer)) {
    return readOffer(offer[0]);
  }

  return {
    price: readText(record.price ?? record.lowPrice),
    currency: readText(record.priceCurrency),
    availability: readText(record.availability),
  };
}

function mergeStructured(target: StructuredPageData, source: Partial<StructuredPageData>): void {
  if (source.productName && !target.productName) target.productName = source.productName;
  if (source.description && !target.description) target.description = source.description;
  if (source.brand && !target.brand) target.brand = source.brand;
  if (source.price && !target.price) target.price = source.price;
  if (source.currency && !target.currency) target.currency = source.currency;
  if (source.availability && !target.availability) target.availability = source.availability;
  if (source.rating && !target.rating) target.rating = source.rating;
  if (source.reviewCount && !target.reviewCount) target.reviewCount = source.reviewCount;
  if (source.sku && !target.sku) target.sku = source.sku;
  if (source.category && !target.category) target.category = source.category;
  if (source.bulletPoints?.length) {
    target.bulletPoints.push(...source.bulletPoints);
  }
}

function structuredFromJsonLdNode(node: Record<string, unknown>): Partial<StructuredPageData> | null {
  if (!isProductType(node["@type"])) return null;

  const offer = readOffer(node.offers);
  const rating = asRecord(node.aggregateRating);

  return {
    productName: readText(node.name),
    description: readText(node.description),
    brand: readText(node.brand),
    price: offer.price,
    currency: offer.currency,
    availability: offer.availability,
    rating: rating ? readText(rating.ratingValue) : undefined,
    reviewCount: rating ? readText(rating.reviewCount) : undefined,
    sku: readText(node.sku),
    category: readText(node.category),
  };
}

function extractJsonLd(html: string): StructuredPageData {
  const structured: StructuredPageData = { bulletPoints: [] };
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      for (const node of collectJsonLdNodes(parsed)) {
        const product = structuredFromJsonLdNode(node);
        if (product) mergeStructured(structured, product);

        if (isProductType(node["@type"]) && Array.isArray(node.additionalProperty)) {
          for (const prop of node.additionalProperty) {
            const record = asRecord(prop);
            const name = readText(record?.name);
            const value = readText(record?.value);
            if (name && value) {
              structured.bulletPoints.push(`${name}: ${value}`);
            }
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  }

  return structured;
}

function extractEmbeddedProductJson(html: string): Partial<StructuredPageData> | null {
  const scriptPatterns = [
    /<script[^>]*type=["']application\/json["'][^>]*data-product-json[^>]*>([\s\S]*?)<\/script>/i,
    /<script[^>]*id=["']ProductJson[^"']*["'][^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i,
  ];

  for (const pattern of scriptPatterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;

    try {
      const product = JSON.parse(match[1]) as Record<string, unknown>;
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const firstVariant = asRecord(variants[0]);
      const description = readText(product.description)?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

      return {
        productName: readText(product.title ?? product.name),
        description,
        brand: readText(product.vendor),
        price: readText(firstVariant?.price ?? product.price),
        currency: readText(product.currency),
        sku: readText(firstVariant?.sku ?? product.sku),
        bulletPoints: [],
      };
    } catch {
      // try next pattern
    }
  }

  const shopifyMatch = html.match(
    /ShopifyAnalytics\.meta\.product\s*=\s*({[\s\S]*?});/
  );
  if (shopifyMatch?.[1]) {
    try {
      const product = JSON.parse(shopifyMatch[1]) as Record<string, unknown>;
      return {
        productName: readText(product.title ?? product.name),
        description: readText(product.description),
        brand: readText(product.vendor),
        price: readText(product.price),
        sku: readText(product.id),
        bulletPoints: [],
      };
    } catch {
      // ignore
    }
  }

  return null;
}

function structuredFromMeta(meta: Map<string, string>): Partial<StructuredPageData> {
  const price = metaGet(meta, "product:price:amount", "og:price:amount");
  const currency = metaGet(meta, "product:price:currency", "og:price:currency");

  return {
    productName: metaGet(meta, "og:title", "twitter:title"),
    description: metaGet(meta, "og:description", "twitter:description", "description"),
    price: price || undefined,
    currency: currency || undefined,
    bulletPoints: [],
  };
}

function formatStructuredBlock(
  structured: StructuredPageData,
  meta: Map<string, string>
): string {
  const lines: string[] = [
    "STRUCTURED PAGE DATA (JSON-LD / product meta — common on Shopify and JS storefronts):",
  ];

  const productName =
    structured.productName || metaGet(meta, "og:title", "twitter:title");
  if (productName) lines.push(`Product / page name: ${productName}`);
  if (structured.brand) lines.push(`Brand: ${structured.brand}`);
  if (structured.price) {
    const currency = structured.currency ? ` ${structured.currency}` : "";
    lines.push(`Price: ${structured.price}${currency}`.trim());
  }
  if (structured.availability) lines.push(`Availability: ${structured.availability}`);
  if (structured.rating) {
    const reviews = structured.reviewCount
      ? ` (${structured.reviewCount} reviews)`
      : "";
    lines.push(`Rating: ${structured.rating}${reviews}`);
  }
  if (structured.sku) lines.push(`SKU: ${structured.sku}`);
  if (structured.category) lines.push(`Category: ${structured.category}`);

  const description =
    structured.description || metaGet(meta, "og:description", "description");
  if (description) lines.push(`Description: ${description}`);

  const bullets = [...new Set(structured.bulletPoints)].slice(0, 12);
  if (bullets.length) {
    lines.push("Product details:");
    bullets.forEach((point) => lines.push(`  - ${point}`));
  }

  return lines.length > 1 ? lines.join("\n") : "";
}

function buildPromptText(r: Omit<ScrapeResult, "asPromptText">): string {
  const lines: string[] = [];
  lines.push(`URL: ${r.url}`);
  if (r.title) lines.push(`PAGE TITLE: ${r.title}`);
  if (r.metaDescription) lines.push(`META DESCRIPTION: ${r.metaDescription}`);
  if (r.headings.length) {
    lines.push(`HEADINGS (in order):`);
    r.headings.slice(0, 25).forEach((h) => lines.push(`  - ${h}`));
  }
  if (r.ctas.length) {
    lines.push(`CTA / BUTTON TEXT:`);
    [...new Set(r.ctas)].slice(0, 20).forEach((c) => lines.push(`  - ${c}`));
  }
  if (r.bodyText) {
    lines.push(`BODY COPY (truncated):`);
    lines.push(r.bodyText);
  }
  return lines.join("\n");
}

export function isScrapeContentSufficient(
  result: Pick<ScrapeResult, "ok" | "bodyText">
): boolean {
  return result.ok && result.bodyText.trim().length >= MIN_SCRAPE_CHARS;
}

function parseHtml(url: string, html: string): Omit<ScrapeResult, "asPromptText"> {
  const meta = extractMetaMap(html);

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let title = titleMatch
    ? decodeEntities(titleMatch[1]).replace(/\s+/g, " ").trim()
    : "";
  if (!title) {
    title = metaGet(meta, "og:title", "twitter:title");
  }

  let metaDescription = metaGet(meta, "description", "og:description", "twitter:description");

  const headings = [
    ...matchAll(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi),
    ...matchAll(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi),
    ...matchAll(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi),
  ];

  const ctas = [
    ...matchAll(html, /<button[^>]*>([\s\S]*?)<\/button>/gi),
    ...matchAll(html, /<a[^>]+class=["'][^"']*(?:btn|button|cta)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi),
  ].filter((t) => t.length <= 60);

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const visibleBody = decodeEntities(cleaned)
    .replace(/\s+/g, " ")
    .trim();

  const structured = extractJsonLd(html);
  mergeStructured(structured, structuredFromMeta(meta));
  const embedded = extractEmbeddedProductJson(html);
  if (embedded) mergeStructured(structured, embedded);

  const structuredBlock = formatStructuredBlock(structured, meta);

  if (!metaDescription) {
    metaDescription = structured.description || metaGet(meta, "og:description");
  }

  if (headings.length === 0 && structured.productName) {
    headings.push(structured.productName);
  }

  const bodyText = [visibleBody, structuredBlock]
    .filter(Boolean)
    .join("\n\n")
    .trim()
    .slice(0, MAX_BODY_CHARS);

  return {
    ok: true,
    url,
    title,
    metaDescription,
    headings,
    ctas,
    bodyText,
  };
}

async function fetchHtml(url: string): Promise<{ html: string; status: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    return { html: await res.text(), status: res.status };
  } finally {
    clearTimeout(timeout);
  }
}

export async function scrapePage(rawUrl: string): Promise<ScrapeResult> {
  const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

  const base: Omit<ScrapeResult, "asPromptText"> = {
    ok: false,
    url,
    title: "",
    metaDescription: "",
    headings: [],
    ctas: [],
    bodyText: "",
  };

  try {
    const { html, status } = await fetchHtml(url);

    if (!status || status >= 400) {
      return {
        ...base,
        asPromptText: buildPromptText(base),
        error: `Landing page returned HTTP ${status}.`,
      };
    }

    const result = parseHtml(url, html);
    return { ...result, asPromptText: buildPromptText(result) };
  } catch (err) {
    const error =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Landing page request timed out."
          : err.message
        : "Unknown scraping error.";
    return { ...base, asPromptText: buildPromptText(base), error };
  }
}
