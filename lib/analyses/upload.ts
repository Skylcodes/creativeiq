import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  RESUMABLE_UPLOAD_THRESHOLD_BYTES,
} from "@/lib/analyses/constants";
import type { CreativeType } from "@/lib/types/analysis";

const BUCKET = "analysis-creatives";

/** Supabase Free plan hard-caps global uploads at 50MB (not changeable via SQL). */
const SUPABASE_FREE_TIER_MAX_BYTES = 50 * 1024 * 1024;

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
}

function getResumableEndpoint(): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) return null;

  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
  } catch {
    return `${supabaseUrl}/storage/v1/upload/resumable`;
  }
}

function maxBytesForType(creativeType: "image" | "video"): number {
  return creativeType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

function sizeExceededMessage(file: File, maxBytes: number): string {
  const fileMb = (file.size / (1024 * 1024)).toFixed(1);

  if (file.size > SUPABASE_FREE_TIER_MAX_BYTES) {
    return `Your video is ${fileMb}MB, but Supabase Free projects cannot upload files over 50MB — that limit is enforced server-side and cannot be raised with SQL. Either compress the video under 50MB, or upgrade to Supabase Pro and set Storage → Settings → Global file size limit to ${formatMegabytes(maxBytes)} (and re-run migration 005 for the bucket).`;
  }

  return `This file is too large (${fileMb}MB). Raise the global limit in Supabase → Storage → Settings, then ensure the analysis-creatives bucket limit is at least ${formatMegabytes(maxBytes)}.`;
}

function friendlyStorageError(
  message: string,
  file: File,
  maxBytes: number
): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("maximum allowed size") ||
    lower.includes("maximum size exceeded") ||
    lower.includes("payload too large") ||
    lower.includes("response code: 413")
  ) {
    return sizeExceededMessage(file, maxBytes);
  }
  if (message.includes("mime type") || message.includes("not allowed")) {
    return "This file type isn't allowed. Use JPG/PNG for images or MP4 for video.";
  }
  return message;
}

async function uploadResumable(
  file: File,
  path: string,
  accessToken: string
): Promise<{ error?: string }> {
  const endpoint = getResumableEndpoint();
  if (!endpoint) {
    return { error: "Supabase URL is not configured." };
  }

  return new Promise((resolve) => {
    const upload = new tus.Upload(file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET,
        objectName: path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      chunkSize: RESUMABLE_UPLOAD_THRESHOLD_BYTES,
      onError: (error) => {
        resolve({
          error: friendlyStorageError(
            error.message,
            file,
            file.type.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
          ),
        });
      },
      onSuccess: () => {
        resolve({});
      },
    });

    upload.start();
  });
}

async function uploadStandard(
  file: File,
  path: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    return {
      error: friendlyStorageError(
        error.message,
        file,
        file.type.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
      ),
    };
  }
  return {};
}

export async function uploadCreativeFile(
  file: File,
  creativeType: Extract<CreativeType, "image" | "video">
): Promise<{ path: string; publicUrl?: string } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const maxBytes = maxBytesForType(creativeType);

  if (creativeType === "image") {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      return { error: "Only JPG and PNG images are supported." };
    }
  } else if (file.type !== "video/mp4") {
    return { error: "Only MP4 videos are supported." };
  }

  if (file.size > maxBytes) {
    return {
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum is ${formatMegabytes(maxBytes)}.`,
    };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${Date.now()}-${safeName || `creative.${ext}`}`;

  const useResumable =
    file.size > RESUMABLE_UPLOAD_THRESHOLD_BYTES ||
    creativeType === "video";

  let uploadError: string | undefined;

  if (useResumable) {
    if (!session?.access_token) {
      return { error: "Session expired. Please sign in again." };
    }
    const result = await uploadResumable(file, path, session.access_token);
    uploadError = result.error;
  } else {
    const result = await uploadStandard(file, path);
    uploadError = result.error;

    // Bucket limits or flaky standard uploads — retry with TUS.
    if (uploadError && session?.access_token) {
      const retry = await uploadResumable(file, path, session.access_token);
      uploadError = retry.error;
    }
  }

  if (uploadError) {
    return { error: uploadError };
  }

  if (creativeType === "image") {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
  }

  return { path };
}

/** Upload a small JPEG thumbnail to storage (avoids huge data URLs in server actions). */
export async function uploadVideoThumbnail(
  dataUrl: string
): Promise<{ url: string } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!user || !session?.access_token) {
    return { error: "You must be signed in." };
  }

  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const path = `${user.id}/${Date.now()}-thumb.jpg`;
    const file = new File([blob], "thumb.jpg", { type: "image/jpeg" });

    const result =
      blob.size > RESUMABLE_UPLOAD_THRESHOLD_BYTES
        ? await uploadResumable(file, path, session.access_token)
        : await uploadStandard(file, path);

    if (result.error) {
      return { error: result.error };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl };
  } catch {
    return { error: "Could not upload video thumbnail." };
  }
}

export async function createVideoThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 4);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxWidth = 640;
        const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
        canvas.width = Math.round((video.videoWidth || maxWidth) * scale);
        canvas.height = Math.round((video.videoHeight || 360) * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } catch {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
  });
}
