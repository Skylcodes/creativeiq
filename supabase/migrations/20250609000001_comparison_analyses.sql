-- Variant comparison analyses: multi-creative head-to-head mode.

alter table public.analyses
  add column if not exists analysis_mode text not null default 'funnel'
    check (analysis_mode in ('funnel', 'comparison')),
  add column if not exists comparison_test_dimensions text[] default '{}',
  add column if not exists variants jsonb;

create index if not exists analyses_mode_idx on public.analyses (analysis_mode);
