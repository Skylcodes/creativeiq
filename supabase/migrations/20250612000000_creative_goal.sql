-- Creative goal drives agent evaluation criteria and scoring calibration.
alter table public.analyses
  add column if not exists creative_goal text not null default 'drive_purchases';

alter table public.analyses
  add constraint analyses_creative_goal_check
  check (
    creative_goal in (
      'drive_purchases',
      'generate_leads',
      'build_brand_awareness',
      'promote_sale',
      'launch_product',
      'retarget_warm'
    )
  );

create index if not exists analyses_creative_goal_idx
  on public.analyses (creative_goal);
