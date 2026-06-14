import type { CreativeType } from "@/lib/types/analysis";

export const ANALYSES_PAGE_SIZE = 20;

export type AnalysesSort = "recent" | "highest" | "lowest";

export type PlatformFilter =
  | "all"
  | "meta"
  | "tiktok"
  | "instagram"
  | "youtube"
  | "organic";

export type CreativeTypeFilter = "all" | CreativeType;

export type AnalysesHistoryParams = {
  page: number;
  sort: AnalysesSort;
  platform: PlatformFilter;
  creativeType: CreativeTypeFilter;
  search: string;
};

export const PLATFORM_FILTER_OPTIONS: {
  id: PlatformFilter;
  label: string;
  platformIds?: string[];
}[] = [
  { id: "all", label: "All platforms" },
  { id: "meta", label: "Meta", platformIds: ["meta_feed", "meta_stories"] },
  { id: "tiktok", label: "TikTok", platformIds: ["tiktok"] },
  { id: "instagram", label: "Instagram", platformIds: ["instagram"] },
  { id: "youtube", label: "YouTube", platformIds: ["youtube"] },
  { id: "organic", label: "Organic", platformIds: ["other"] },
];

export const SORT_OPTIONS: { id: AnalysesSort; label: string }[] = [
  { id: "recent", label: "Most recent" },
  { id: "highest", label: "Highest score" },
  { id: "lowest", label: "Lowest score" },
];

export const CREATIVE_TYPE_FILTER_OPTIONS: {
  id: CreativeTypeFilter;
  label: string;
}[] = [
  { id: "all", label: "All types" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "script", label: "Script" },
];

export function parseAnalysesHistoryParams(
  searchParams: Record<string, string | string[] | undefined>
): AnalysesHistoryParams {
  const rawPage = Number(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const sortRaw = Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort;
  const sort: AnalysesSort =
    sortRaw === "highest" || sortRaw === "lowest" ? sortRaw : "recent";

  const platformRaw = Array.isArray(searchParams.platform)
    ? searchParams.platform[0]
    : searchParams.platform;
  const platform: PlatformFilter =
    platformRaw === "meta" ||
    platformRaw === "tiktok" ||
    platformRaw === "instagram" ||
    platformRaw === "youtube" ||
    platformRaw === "organic"
      ? platformRaw
      : "all";

  const typeRaw = Array.isArray(searchParams.type) ? searchParams.type[0] : searchParams.type;
  const creativeType: CreativeTypeFilter =
    typeRaw === "image" || typeRaw === "video" || typeRaw === "script"
      ? typeRaw
      : "all";

  const searchRaw = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const search = (searchRaw ?? "").trim().slice(0, 120);

  return { page, sort, platform, creativeType, search };
}

export function buildAnalysesHistoryQueryString(
  params: AnalysesHistoryParams
): string {
  const qs = new URLSearchParams();
  if (params.page > 1) qs.set("page", String(params.page));
  if (params.sort !== "recent") qs.set("sort", params.sort);
  if (params.platform !== "all") qs.set("platform", params.platform);
  if (params.creativeType !== "all") qs.set("type", params.creativeType);
  if (params.search) qs.set("q", params.search);
  const str = qs.toString();
  return str ? `?${str}` : "";
}
