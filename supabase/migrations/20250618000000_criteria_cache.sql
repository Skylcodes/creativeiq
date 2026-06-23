-- Add performance criteria cache columns to workspaces table.
-- Stores the generated evaluation criteria checklist (static + dynamic),
-- keyed by workspace_id + category, with a 7-day TTL enforced in app code.

alter table public.workspaces
  add column if not exists criteria_cache             jsonb,
  add column if not exists criteria_cache_updated_at  timestamptz;
