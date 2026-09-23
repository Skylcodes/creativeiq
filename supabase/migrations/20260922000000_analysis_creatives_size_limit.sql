-- Tighten analysis-creatives bucket: 100MB max, image/video MIME only.
-- Previously 500MB which allowed unbounded storage growth from large uploads.

update storage.buckets
set
  file_size_limit = 104857600,
  allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'video/mp4']
where id = 'analysis-creatives';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'analysis-creatives',
  'analysis-creatives',
  false,
  104857600,
  array['image/jpeg', 'image/jpg', 'image/png', 'video/mp4']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
