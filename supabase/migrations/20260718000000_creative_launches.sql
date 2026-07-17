-- Advara: Creative launches + manual outcome tracking (Slice 1)
-- Run in Supabase Dashboard → SQL Editor.

create table if not exists public.creative_launches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  variant_id uuid,
  platform text not null check (platform in ('meta', 'tiktok', 'other')),
  launched_at timestamptz not null,
  external_campaign_id text,
  external_ad_id text,
  notes text,
  source text not null default 'manual' check (source in ('manual', 'csv', 'api')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creative_launches_workspace_idx
  on public.creative_launches (workspace_id, launched_at desc);
create index if not exists creative_launches_analysis_idx
  on public.creative_launches (analysis_id);

-- Prevent duplicate external ad ids per workspace+platform (when provided).
create unique index if not exists creative_launches_external_ad_idx
  on public.creative_launches (workspace_id, platform, external_ad_id)
  where external_ad_id is not null;

create table if not exists public.launch_outcomes (
  id uuid primary key default gen_random_uuid(),
  launch_id uuid not null references public.creative_launches (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  window_type text not null check (window_type in ('3d', '7d', '14d', 'custom')),
  window_start timestamptz not null,
  window_end timestamptz not null,
  currency text not null default 'USD',
  spend numeric check (spend is null or spend >= 0),
  impressions bigint check (impressions is null or impressions >= 0),
  clicks bigint check (clicks is null or clicks >= 0),
  purchases bigint check (purchases is null or purchases >= 0),
  leads bigint check (leads is null or leads >= 0),
  revenue numeric check (revenue is null or revenue >= 0),
  outcome_label text check (
    outcome_label is null
    or outcome_label in ('winner', 'break_even', 'loser', 'killed_early')
  ),
  source text not null default 'manual' check (source in ('manual', 'csv', 'api')),
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (window_end > window_start)
);

-- One outcome per launch per window.
create unique index if not exists launch_outcomes_launch_window_idx
  on public.launch_outcomes (launch_id, window_type);

create index if not exists launch_outcomes_workspace_idx
  on public.launch_outcomes (workspace_id, created_at desc);

alter table public.creative_launches enable row level security;
alter table public.launch_outcomes enable row level security;

create policy "Users manage own creative launches"
  on public.creative_launches
  for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = creative_launches.workspace_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = creative_launches.workspace_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users manage own launch outcomes"
  on public.launch_outcomes
  for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = launch_outcomes.workspace_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = launch_outcomes.workspace_id
        and w.user_id = auth.uid()
    )
  );
