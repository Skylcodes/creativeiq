-- Advara: Analysis wizard fields + creative storage
-- Run in Supabase Dashboard → SQL Editor after analyses migration

alter table public.analyses
  add column if not exists platforms text[] not null default '{}',
  add column if not exists platform_other text,
  add column if not exists landing_page_url text,
  add column if not exists script_content text,
  add column if not exists creative_storage_path text,
  add column if not exists creative_file_name text,
  add column if not exists creative_mime_type text;

-- Storage bucket for ad creatives (images + videos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'analysis-creatives',
  'analysis-creatives',
  false,
  524288000,
  array['image/jpeg', 'image/png', 'video/mp4']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload own analysis creatives"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'analysis-creatives'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own analysis creatives"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'analysis-creatives'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own analysis creatives"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'analysis-creatives'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own analysis creatives"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'analysis-creatives'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
