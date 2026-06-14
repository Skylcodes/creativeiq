-- CreativeIQ: Analyses
-- Run in Supabase Dashboard → SQL Editor after workspaces migration

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  funnel_score integer check (funnel_score >= 0 and funnel_score <= 100),
  creative_type text not null default 'image' check (creative_type in ('image', 'video', 'script')),
  thumbnail_url text,
  status text not null default 'completed' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analyses_workspace_id_idx on public.analyses (workspace_id);
create index if not exists analyses_user_id_idx on public.analyses (user_id);
create index if not exists analyses_created_at_idx on public.analyses (created_at desc);

alter table public.analyses enable row level security;

create policy "Users can view own analyses"
  on public.analyses for select
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = analyses.workspace_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can create own analyses"
  on public.analyses for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can update own analyses"
  on public.analyses for update
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = analyses.workspace_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can delete own analyses"
  on public.analyses for delete
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = analyses.workspace_id
        and w.user_id = auth.uid()
    )
  );
