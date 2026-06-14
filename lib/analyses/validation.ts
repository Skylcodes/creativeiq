import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, MIN_SCRIPT_LENGTH } from "@/lib/analyses/constants";
import { normalizeBrandUrl, isValidBrandUrl } from "@/lib/workspaces/validation";

export function validateLandingPageUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "Landing page URL is required.";
  if (!isValidBrandUrl(trimmed)) {
    return "Enter a valid URL (e.g. yourstore.com/product or https://yourstore.com/product).";
  }
  return null;
}

export function normalizeLandingPageUrl(input: string): string {
  return normalizeBrandUrl(input);
}

export function validateScriptContent(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length < MIN_SCRIPT_LENGTH) {
    return `Script must be at least ${MIN_SCRIPT_LENGTH} characters.`;
  }
  return null;
}

export function validateImageFile(file: File): string | null {
  const allowed = ["image/jpeg", "image/png"];
  if (!allowed.includes(file.type)) {
    return "Only JPG and PNG images are supported.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Image must be under ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB. Compress the file or use a smaller creative.`;
  }
  return null;
}

export function validateVideoFile(file: File): string | null {
  if (file.type !== "video/mp4") {
    return "Only MP4 videos are supported.";
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return `Video must be under ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))}MB.`;
  }
  return null;
}
