-- Advara: AI report fields + cached brand profile
-- Run in Supabase Dashboard → SQL Editor after the analysis wizard migration

-- Cache the AI-generated brand profile on the workspace so we don't
-- re-scrape / re-derive it on every analysis.
alter table public.workspaces
  add column if not exists brand_profile jsonb,
  add column if not exists brand_profile_generated_at timestamptz;

-- Structured AI report + scores + error state on each analysis
alter table public.analyses
  add column if not exists report jsonb,
  add column if not exists conversion_score integer
    check (conversion_score >= 0 and conversion_score <= 100),
  add column if not exists creative_strength_score integer
    check (creative_strength_score >= 0 and creative_strength_score <= 100),
  add column if not exists error_message text,
  add column if not exists completed_at timestamptz;
