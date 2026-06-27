-- Account-level limit overrides (replaces per-workspace overrides).
-- Limits are pooled per subscriber across all brand workspaces.

create table if not exists public.account_limit_overrides (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users (id) on delete cascade,
  feature_key           text        not null,
  override_limit_value  integer     not null,
  reason                text        not null default '',
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  unique (user_id, feature_key)
);

create index if not exists account_limit_overrides_user_idx
  on public.account_limit_overrides (user_id);

-- Migrate existing workspace overrides → account owner (latest row wins per user+feature).
insert into public.account_limit_overrides (
  user_id,
  feature_key,
  override_limit_value,
  reason,
  expires_at,
  created_at
)
select distinct on (w.user_id, wlo.feature_key)
  w.user_id,
  wlo.feature_key,
  wlo.override_limit_value,
  wlo.reason,
  wlo.expires_at,
  wlo.created_at
from public.workspace_limit_overrides wlo
join public.workspaces w on w.id = wlo.workspace_id
order by w.user_id, wlo.feature_key, wlo.created_at desc
on conflict (user_id, feature_key) do nothing;

drop table if exists public.workspace_limit_overrides;

alter table public.account_limit_overrides enable row level security;
-- Admin access via service role only (no user policies).
