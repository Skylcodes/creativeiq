-- Winning Ad Deconstructor: competitor ad teardown + brand translation.

create table if not exists public.ad_deconstructions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  input jsonb not null default '{}',
  report jsonb,
  confidence_level text
    check (confidence_level is null or confidence_level in ('high', 'medium', 'low')),
  error_message text,
  processing_started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ad_deconstructions_workspace_idx
  on public.ad_deconstructions (workspace_id);
create index if not exists ad_deconstructions_user_idx
  on public.ad_deconstructions (user_id);
create index if not exists ad_deconstructions_created_idx
  on public.ad_deconstructions (created_at desc);

alter table public.ad_deconstructions enable row level security;

create policy "Users can view own deconstructions"
  on public.ad_deconstructions for select
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = ad_deconstructions.workspace_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can create own deconstructions"
  on public.ad_deconstructions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can update own deconstructions"
  on public.ad_deconstructions for update
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = ad_deconstructions.workspace_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can delete own deconstructions"
  on public.ad_deconstructions for delete
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = ad_deconstructions.workspace_id
        and w.user_id = auth.uid()
    )
  );
