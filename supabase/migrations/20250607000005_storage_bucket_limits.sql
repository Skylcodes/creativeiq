-- Bucket-level limit for analysis-creatives (500MB).
--
-- IMPORTANT: SQL alone cannot raise the project-wide cap.
-- Supabase Free plan: global max is 50MB (hard limit — videos over 50MB will 413).
-- Supabase Pro+: Dashboard → Storage → Settings → Global file size limit → set to 500MB+.
-- Then edit bucket analysis-creatives and ensure its limit ≤ global limit.

update storage.buckets
set
  file_size_limit = 524288000,
  allowed_mime_types = array['image/jpeg', 'image/png', 'video/mp4', 'image/jpg']
where id = 'analysis-creatives';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'analysis-creatives',
  'analysis-creatives',
  false,
  524288000,
  array['image/jpeg', 'image/png', 'video/mp4', 'image/jpg']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
