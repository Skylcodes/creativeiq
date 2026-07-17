-- Advara: Worker durability
-- Adds single-flight lease timestamps so background workers cannot double-process
-- the same job, and so a stale lease can be reclaimed after a crash/timeout.
-- Run in Supabase Dashboard → SQL Editor.

alter table public.analyses
  add column if not exists worker_locked_at timestamptz;

alter table public.creative_briefs
  add column if not exists worker_locked_at timestamptz;

alter table public.ad_deconstructions
  add column if not exists worker_locked_at timestamptz;

alter table public.workspaces
  add column if not exists brand_profile_locked_at timestamptz;
