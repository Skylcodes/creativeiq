-- Account-pooled feature limits: one usage bucket per subscriber, shared across all workspaces.
-- AI feature caps (analyses, comparisons, briefs, decon, chat) live on the profile snapshot.
-- Workspace rows keep subscription_tier_key for display; limits are enforced at account level.

alter table public.profiles
  add column if not exists subscription_limit_snapshot jsonb;

-- Backfill snapshots for existing profiles from their tier (defaults to starter).
update public.profiles p
set subscription_limit_snapshot = sub.snapshot
from (
  select
    t.key as tier_key,
    jsonb_object_agg(tfl.feature_key, tfl.limit_value) as snapshot
  from public.subscription_tiers t
  join public.tier_feature_limits tfl on tfl.tier_id = t.id
  group by t.key
) sub
where coalesce(p.subscription_tier_key, 'starter') = sub.tier_key
  and p.subscription_limit_snapshot is null;
