-- Advara: Infrastructure hardening
-- Brand profile generation status + analysis watchdog timestamps

alter table public.workspaces
  add column if not exists brand_profile_status text not null default 'pending'
    check (brand_profile_status in ('pending', 'processing', 'complete', 'failed', 'manual_required')),
  add column if not exists brand_profile_progress jsonb,
  add column if not exists brand_profile_error text;

alter table public.analyses
  add column if not exists processing_started_at timestamptz;

-- Backfill processing_started_at for any in-flight analyses
update public.analyses
set processing_started_at = updated_at
where status = 'processing' and processing_started_at is null;
