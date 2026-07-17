-- Advara: CSV outcome import ledger (Slice 2)

create table if not exists public.outcome_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  format text not null check (format in ('advara', 'meta')),
  content_hash text not null,
  row_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists outcome_imports_workspace_idx
  on public.outcome_imports (workspace_id, created_at desc);

alter table public.outcome_imports enable row level security;

create policy "Users manage own outcome imports"
  on public.outcome_imports
  for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = outcome_imports.workspace_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = outcome_imports.workspace_id
        and w.user_id = auth.uid()
    )
  );
