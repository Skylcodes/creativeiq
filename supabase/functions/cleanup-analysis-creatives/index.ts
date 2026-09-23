// Supabase Edge Function backstop (optional alternative to Vercel Cron).
// Deploy: `supabase functions deploy cleanup-analysis-creatives`
// Schedule via Dashboard → Edge Functions → Schedules, or:
//   select cron.schedule(
//     'cleanup-analysis-creatives',
//     '0 7 * * *',
//     $$ select net.http_post(
//          url := '<project-url>/functions/v1/cleanup-analysis-creatives',
//          headers := '{"Authorization":"Bearer <service-role-key>"}'::jsonb
//        ); $$
//   );
//
// Prefer the Next.js route `/api/cron/cleanup-analysis-creatives` + vercel.json
// when the app is hosted on Vercel — that path shares the same cleanup logic.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const BUCKET = "analysis-creatives";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PAGE = 100;

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
  if (!url) {
    return new Response(JSON.stringify({ error: "Missing SUPABASE_URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const protectedPaths = new Set<string>();

  const { data: processing } = await supabase
    .from("analyses")
    .select("creative_storage_path, thumbnail_url, variants")
    .eq("status", "processing");

  for (const row of processing ?? []) {
    if (row.creative_storage_path) protectedPaths.add(row.creative_storage_path);
  }

  const { data: thumbs } = await supabase
    .from("analyses")
    .select("thumbnail_url")
    .not("thumbnail_url", "is", null);

  for (const row of thumbs ?? []) {
    const m = String(row.thumbnail_url ?? "").match(
      /analysis-creatives\/(.+?)(?:\?|$)/
    );
    if (m?.[1]) protectedPaths.add(decodeURIComponent(m[1]));
  }

  const { data: roots } = await supabase.storage.from(BUCKET).list("", {
    limit: PAGE,
  });

  const toDelete: string[] = [];
  let scanned = 0;

  for (const folder of roots ?? []) {
    if (folder.id != null || !folder.name) continue;
    const { data: objects } = await supabase.storage
      .from(BUCKET)
      .list(folder.name, { limit: PAGE });

    for (const obj of objects ?? []) {
      if (!obj.name || obj.id == null) continue;
      scanned += 1;
      const path = `${folder.name}/${obj.name}`;
      if (protectedPaths.has(path)) continue;
      const stamp = obj.created_at || obj.updated_at;
      if (!stamp) continue;
      if (Date.now() - new Date(stamp).getTime() < MAX_AGE_MS) continue;
      toDelete.push(path);
    }
  }

  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 50) {
    const chunk = toDelete.slice(i, i + 50);
    const { error } = await supabase.storage.from(BUCKET).remove(chunk);
    if (!error) deleted += chunk.length;
  }

  return new Response(
    JSON.stringify({ ok: true, scanned, deleted, candidates: toDelete.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
