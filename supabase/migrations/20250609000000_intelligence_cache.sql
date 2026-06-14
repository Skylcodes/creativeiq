-- Add intelligence cache columns to workspaces table.
-- Stores the Tavily + Meta Ad Library brief, keyed by workspace_id + category,
-- with a 24-hour TTL enforced in application code.

alter table public.workspaces
  add column if not exists intelligence_cache        jsonb,
  add column if not exists intelligence_cache_updated_at timestamptz;
