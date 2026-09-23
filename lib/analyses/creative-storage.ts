import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Analysis } from "@/lib/types/analysis";
import type { StoredAnalysisVariant } from "@/lib/types/comparison";
import type { DeconstructionInput } from "@/lib/types/deconstruction";

export const ANALYSIS_CREATIVES_BUCKET = "analysis-creatives";

/** Allowed MIME types for analysis creatives (must match storage bucket allowlist). */
export const ALLOWED_CREATIVE_MIME_TYPES = {
  image: ["image/jpeg", "image/png", "image/jpg"] as const,
  video: ["video/mp4"] as const,
} as const;

export function storagePathFromCreativeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/analysis-creatives\/(.+?)(?:\?|$)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Collect creative object paths for an analysis.
 * By default excludes video thumbnails (small JPEGs kept for list UI).
 */
export function collectAnalysisCreativePaths(
  analysis: Pick<
    Analysis,
    "creative_storage_path" | "thumbnail_url" | "variants" | "creative_type"
  >,
  options?: { includeThumbnails?: boolean }
): string[] {
  const paths = new Set<string>();
  if (analysis.creative_storage_path) {
    paths.add(analysis.creative_storage_path);
  }

  const variants = (analysis.variants ?? []) as StoredAnalysisVariant[];
  for (const v of variants) {
    if (v.creative_storage_path) paths.add(v.creative_storage_path);
  }

  if (options?.includeThumbnails) {
    const thumb = storagePathFromCreativeUrl(analysis.thumbnail_url);
    if (thumb) paths.add(thumb);
    for (const v of variants) {
      const vThumb = storagePathFromCreativeUrl(v.thumbnail_url);
      if (vThumb) paths.add(vThumb);
    }
  }

  return [...paths];
}

export function collectDeconstructionCreativePaths(
  input: DeconstructionInput | null | undefined,
  options?: { includeThumbnails?: boolean }
): string[] {
  if (!input) return [];
  const paths = new Set<string>();
  if (input.creativeStoragePath) paths.add(input.creativeStoragePath);
  if (options?.includeThumbnails) {
    const thumb = storagePathFromCreativeUrl(input.thumbnailUrl);
    if (thumb) paths.add(thumb);
  }
  return [...paths];
}

/** Best-effort remove; never throws — storage cleanup must not fail the pipeline. */
export async function deleteCreativeStoragePaths(
  supabase: SupabaseClient,
  paths: string[]
): Promise<{ deleted: number; error?: string }> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return { deleted: 0 };

  const { error } = await supabase.storage
    .from(ANALYSIS_CREATIVES_BUCKET)
    .remove(unique);

  if (error) {
    console.error("[creative-storage] remove failed:", error.message, unique);
    return { deleted: 0, error: error.message };
  }

  return { deleted: unique.length };
}

/**
 * Delete large creative objects for an analysis and clear DB path fields so
 * retries / cron know the files are gone. Keeps thumbnail_url objects by default.
 */
export async function purgeAnalysisCreativesAfterTerminalStatus(
  supabase: SupabaseClient,
  analysis: Pick<
    Analysis,
    "id" | "creative_storage_path" | "thumbnail_url" | "variants" | "creative_type"
  >
): Promise<void> {
  const paths = collectAnalysisCreativePaths(analysis, { includeThumbnails: false });
  if (paths.length === 0) return;

  await deleteCreativeStoragePaths(supabase, paths);

  const variants = (analysis.variants ?? []) as StoredAnalysisVariant[];
  const clearedVariants =
    variants.length > 0
      ? variants.map((v) => ({ ...v, creative_storage_path: null }))
      : undefined;

  await supabase
    .from("analyses")
    .update({
      creative_storage_path: null,
      ...(clearedVariants ? { variants: clearedVariants } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", analysis.id);
}

export async function purgeDeconstructionCreativesAfterTerminalStatus(
  supabase: SupabaseClient,
  deconstructionId: string,
  input: DeconstructionInput | null | undefined
): Promise<void> {
  const paths = collectDeconstructionCreativePaths(input, { includeThumbnails: false });
  if (paths.length === 0 || !input) return;

  await deleteCreativeStoragePaths(supabase, paths);

  const clearedInput: DeconstructionInput = {
    ...input,
    creativeStoragePath: undefined,
  };

  await supabase
    .from("ad_deconstructions")
    .update({
      input: clearedInput,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deconstructionId);
}

/**
 * Server-side gate: verify the uploaded object exists, MIME is allowed, and
 * size is within limits — then reject (and delete) if not. Call after upload
 * lands and before/at analysis create.
 */
export async function assertUploadedCreativeAllowed(
  supabase: SupabaseClient,
  path: string,
  creativeType: "image" | "video",
  maxBytes: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!path || path.includes("..") || path.startsWith("/")) {
    return { ok: false, error: "Invalid creative storage path." };
  }

  const slash = path.indexOf("/");
  if (slash <= 0) {
    return { ok: false, error: "Invalid creative storage path." };
  }

  const folder = path.slice(0, slash);
  const fileName = path.slice(slash + 1);

  const { data: objects, error } = await supabase.storage
    .from(ANALYSIS_CREATIVES_BUCKET)
    .list(folder, { search: fileName, limit: 20 });

  if (error) {
    return { ok: false, error: `Could not verify upload: ${error.message}` };
  }

  const object = objects?.find((o) => o.name === fileName);
  if (!object) {
    return { ok: false, error: "Uploaded creative was not found in storage." };
  }

  const size =
    typeof object.metadata?.size === "number"
      ? object.metadata.size
      : null;

  if (size != null && size > maxBytes) {
    await deleteCreativeStoragePaths(supabase, [path]);
    return {
      ok: false,
      error: `File is too large (${(size / (1024 * 1024)).toFixed(1)}MB). Maximum is ${Math.round(maxBytes / (1024 * 1024))}MB.`,
    };
  }

  const mime =
    typeof object.metadata?.mimetype === "string"
      ? object.metadata.mimetype
      : typeof object.metadata?.contentType === "string"
        ? object.metadata.contentType
        : null;

  const allowed = ALLOWED_CREATIVE_MIME_TYPES[creativeType];
  if (mime && !(allowed as readonly string[]).includes(mime)) {
    await deleteCreativeStoragePaths(supabase, [path]);
    return {
      ok: false,
      error:
        creativeType === "video"
          ? "Only MP4 videos are supported."
          : "Only JPG and PNG images are supported.",
    };
  }

  return { ok: true };
}
