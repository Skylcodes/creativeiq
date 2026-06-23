import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AdDeconstruction } from "@/lib/types/deconstruction";

export async function getDeconstructionsForUser(
  userId: string
): Promise<AdDeconstruction[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ad_deconstructions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdDeconstruction[];
}

export async function getDeconstructionById(
  id: string,
  userId: string
): Promise<AdDeconstruction | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ad_deconstructions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as AdDeconstruction) ?? null;
}

export async function getSignedCreativeUrl(
  storagePath: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("analysis-creatives")
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
