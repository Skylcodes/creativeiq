-- Pre-launch creative briefs per workspace.

create table if not exists public.creative_briefs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  status text not null default 'processing'
    check (status in ('processing', 'awaiting_angle', 'completed', 'failed')),
  generation_phase text not null default 'angles'
    check (generation_phase in ('angles', 'full_brief')),
  input jsonb not null default '{}',
  angle_options jsonb,
  selected_angle_id text,
  brief jsonb,
  error_message text,
  processing_started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creative_briefs_workspace_idx
  on public.creative_briefs (workspace_id);
create index if not exists creative_briefs_user_idx
  on public.creative_briefs (user_id);
create index if not exists creative_briefs_created_idx
  on public.creative_briefs (created_at desc);

alter table public.creative_briefs enable row level security;

create policy "Users manage own briefs"
  on public.creative_briefs
  for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = creative_briefs.workspace_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = creative_briefs.workspace_id
        and w.user_id = auth.uid()
    )
  );
