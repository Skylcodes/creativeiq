import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ANALYSIS_CREATIVES_BUCKET,
  deleteCreativeStoragePaths,
  storagePathFromCreativeUrl,
} from "@/lib/analyses/creative-storage";
import type { StoredAnalysisVariant } from "@/lib/types/comparison";
import type { DeconstructionInput } from "@/lib/types/deconstruction";

const ORPHAN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const LIST_PAGE_SIZE = 100;

type StorageListedObject = {
  name: string;
  id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Paths still needed by an in-flight analysis/deconstruction — must not be deleted.
 */
async function collectProtectedPaths(
  supabase: SupabaseClient
): Promise<Set<string>> {
  const protectedPaths = new Set<string>();

  const { data: processingAnalyses } = await supabase
    .from("analyses")
    .select("creative_storage_path, thumbnail_url, variants")
    .eq("status", "processing");

  for (const row of processingAnalyses ?? []) {
    if (row.creative_storage_path) protectedPaths.add(row.creative_storage_path);
    const thumb = storagePathFromCreativeUrl(row.thumbnail_url);
    if (thumb) protectedPaths.add(thumb);
    for (const v of (row.variants ?? []) as StoredAnalysisVariant[]) {
      if (v.creative_storage_path) protectedPaths.add(v.creative_storage_path);
      const vThumb = storagePathFromCreativeUrl(v.thumbnail_url);
      if (vThumb) protectedPaths.add(vThumb);
    }
  }

  const { data: processingDecons } = await supabase
    .from("ad_deconstructions")
    .select("input")
    .eq("status", "processing");

  for (const row of processingDecons ?? []) {
    const input = row.input as DeconstructionInput | null;
    if (input?.creativeStoragePath) {
      protectedPaths.add(input.creativeStoragePath);
    }
    const thumb = storagePathFromCreativeUrl(input?.thumbnailUrl);
    if (thumb) protectedPaths.add(thumb);
  }

  // Keep video thumbnails referenced by completed/failed rows for dashboard cards.
  const { data: withThumbs } = await supabase
    .from("analyses")
    .select("thumbnail_url, variants")
    .not("thumbnail_url", "is", null)
    .in("status", ["completed", "failed"]);

  for (const row of withThumbs ?? []) {
    const thumb = storagePathFromCreativeUrl(row.thumbnail_url);
    if (thumb) protectedPaths.add(thumb);
    for (const v of (row.variants ?? []) as StoredAnalysisVariant[]) {
      const vThumb = storagePathFromCreativeUrl(v.thumbnail_url);
      if (vThumb) protectedPaths.add(vThumb);
    }
  }

  return protectedPaths;
}

async function listUserFolders(supabase: SupabaseClient): Promise<string[]> {
  const folders: string[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage
      .from(ANALYSIS_CREATIVES_BUCKET)
      .list("", { limit: LIST_PAGE_SIZE, offset });

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const item of data) {
      // Top-level entries are user-id folders (no id) or loose files.
      if (item.id == null && item.name) {
        folders.push(item.name);
      }
    }

    if (data.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }

  return folders;
}

async function listFolderObjects(
  supabase: SupabaseClient,
  folder: string
): Promise<StorageListedObject[]> {
  const objects: StorageListedObject[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage
      .from(ANALYSIS_CREATIVES_BUCKET)
      .list(folder, { limit: LIST_PAGE_SIZE, offset });

    if (error) throw new Error(`${folder}: ${error.message}`);
    if (!data?.length) break;

    objects.push(...(data as StorageListedObject[]));
    if (data.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }

  return objects;
}

function objectAgeMs(obj: StorageListedObject): number {
  const stamp = obj.created_at || obj.updated_at;
  if (!stamp) return Number.POSITIVE_INFINITY;
  return Date.now() - new Date(stamp).getTime();
}

export type CleanupCreativesResult = {
  scanned: number;
  deleted: number;
  skippedProtected: number;
  skippedYoung: number;
  errors: string[];
};

/**
 * Daily backstop: delete analysis-creatives objects older than 24h that are not
 * protected by an in-flight job or a retained thumbnail reference.
 */
export async function cleanupOrphanedAnalysisCreatives(
  supabase: SupabaseClient
): Promise<CleanupCreativesResult> {
  const result: CleanupCreativesResult = {
    scanned: 0,
    deleted: 0,
    skippedProtected: 0,
    skippedYoung: 0,
    errors: [],
  };

  const protectedPaths = await collectProtectedPaths(supabase);
  const folders = await listUserFolders(supabase);
  const toDelete: string[] = [];

  for (const folder of folders) {
    let objects: StorageListedObject[];
    try {
      objects = await listFolderObjects(supabase, folder);
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : String(err));
      continue;
    }

    for (const obj of objects) {
      if (!obj.name || obj.id == null) continue;
      result.scanned += 1;

      const path = `${folder}/${obj.name}`;
      if (protectedPaths.has(path)) {
        result.skippedProtected += 1;
        continue;
      }

      if (objectAgeMs(obj) < ORPHAN_MAX_AGE_MS) {
        result.skippedYoung += 1;
        continue;
      }

      toDelete.push(path);
    }
  }

  // Batch deletes (Supabase remove accepts arrays; chunk to stay safe).
  const CHUNK = 50;
  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const chunk = toDelete.slice(i, i + CHUNK);
    const { deleted, error } = await deleteCreativeStoragePaths(supabase, chunk);
    result.deleted += deleted;
    if (error) result.errors.push(error);
  }

  return result;
}
