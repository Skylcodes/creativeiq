-- Workspace hook library — auto-captured and manual hooks.

create table if not exists public.hook_library (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  hook_text text not null,
  platform text,
  angle_tags text[] not null default '{}',
  source_type text not null
    check (source_type in ('advara_generated', 'manual')),
  manual_source_category text
    check (
      manual_source_category is null
      or manual_source_category in (
        'my_own_idea',
        'competitor_ad',
        'inspiration',
        'advara_generated'
      )
    ),
  source_kind text
    check (
      source_kind is null
      or source_kind in ('analysis', 'comparison', 'brief')
    ),
  source_analysis_id uuid references public.analyses (id) on delete set null,
  source_brief_id uuid references public.creative_briefs (id) on delete set null,
  source_score integer,
  notes text,
  is_favorited boolean not null default false,
  custom_tags text[] not null default '{}',
  is_in_test_queue boolean not null default false,
  capture_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists hook_library_capture_key_idx
  on public.hook_library (workspace_id, capture_key);

create index if not exists hook_library_workspace_idx
  on public.hook_library (workspace_id);
create index if not exists hook_library_platform_idx
  on public.hook_library (workspace_id, platform);
create index if not exists hook_library_created_idx
  on public.hook_library (workspace_id, created_at desc);
create index if not exists hook_library_favorited_idx
  on public.hook_library (workspace_id, is_favorited)
  where is_favorited = true;
create index if not exists hook_library_test_queue_idx
  on public.hook_library (workspace_id, is_in_test_queue)
  where is_in_test_queue = true;

create index if not exists hook_library_angle_tags_gin
  on public.hook_library using gin (angle_tags);
create index if not exists hook_library_custom_tags_gin
  on public.hook_library using gin (custom_tags);

-- Workspace-specific custom tags for organization.
create table if not exists public.hook_library_tags (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  tag_name text not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, tag_name)
);

create index if not exists hook_library_tags_workspace_idx
  on public.hook_library_tags (workspace_id);

alter table public.hook_library enable row level security;
alter table public.hook_library_tags enable row level security;

create policy "Users manage own hook library"
  on public.hook_library
  for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = hook_library.workspace_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = hook_library.workspace_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users manage own hook library tags"
  on public.hook_library_tags
  for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = hook_library_tags.workspace_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = hook_library_tags.workspace_id
        and w.user_id = auth.uid()
    )
  );
