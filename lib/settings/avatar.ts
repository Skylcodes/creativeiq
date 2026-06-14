import { createClient } from "@/lib/supabase/client";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadAvatarFile(
  file: File
): Promise<{ publicUrl: string } | { error: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Please upload a JPG, PNG, or WebP image." };
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Profile photo must be 5MB or smaller." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  return { publicUrl: `${data.publicUrl}?t=${Date.now()}` };
}

export function getInitials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email.charAt(0) || "U").toUpperCase();
}
