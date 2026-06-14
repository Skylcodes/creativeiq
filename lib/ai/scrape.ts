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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CreativeIQ-Bot/1.0; +https://creativeiq.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      return {
        ...base,
        asPromptText: buildPromptText(base),
        error: `Landing page returned HTTP ${res.status}.`,
      };
    }

    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch
      ? decodeEntities(titleMatch[1]).replace(/\s+/g, " ").trim()
      : "";

    const descMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i
    );
    const ogDescMatch = html.match(
      /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i
    );
    const metaDescription = decodeEntities(
      (descMatch?.[1] || ogDescMatch?.[1] || "").trim()
    );

    const headings = [
      ...matchAll(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi),
      ...matchAll(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi),
      ...matchAll(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi),
    ];

    const ctas = [
      ...matchAll(html, /<button[^>]*>([\s\S]*?)<\/button>/gi),
      ...matchAll(html, /<a[^>]+class=["'][^"']*(?:btn|button|cta)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi),
    ].filter((t) => t.length <= 60);

    // Body text: drop scripts/styles/noscript, strip tags, collapse.
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ");
    const bodyText = decodeEntities(cleaned)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_BODY_CHARS);

    const result: Omit<ScrapeResult, "asPromptText"> = {
      ok: true,
      url,
      title,
      metaDescription,
      headings,
      ctas,
      bodyText,
    };

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
