-- Advara: Subscription Tiers + Feature Limits + Workspace Overrides

-- ─── subscription_tiers ──────────────────────────────────────────────────────
create table if not exists public.subscription_tiers (
  id              uuid         primary key default gen_random_uuid(),
  key             text         not null unique,  -- "starter" | "growth" | "agency" — never changes
  display_name    text         not null,
  description     text         not null default '',
  monthly_price   numeric(10,2) not null default 0,
  annual_price    numeric(10,2) not null default 0,
  is_active       boolean      not null default true,
  is_featured     boolean      not null default false,
  sort_order      integer      not null default 0,
  founding_price  numeric(10,2),         -- null = founding pricing disabled
  founding_slots  integer,               -- null = not applicable; decrements on signup
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

-- ─── tier_feature_limits ─────────────────────────────────────────────────────
create table if not exists public.tier_feature_limits (
  id           uuid    primary key default gen_random_uuid(),
  tier_id      uuid    not null references public.subscription_tiers(id) on delete cascade,
  feature_key  text    not null,
  limit_value  integer not null,  -- -1 = unlimited
  reset_period text    not null default 'monthly'
                       check (reset_period in ('monthly', 'daily', 'lifetime')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(tier_id, feature_key)
);

create index if not exists tier_feature_limits_tier_idx on public.tier_feature_limits(tier_id);

-- ─── workspace_limit_overrides ───────────────────────────────────────────────
create table if not exists public.workspace_limit_overrides (
  id                   uuid    primary key default gen_random_uuid(),
  workspace_id         uuid    not null references public.workspaces(id) on delete cascade,
  feature_key          text    not null,
  override_limit_value integer not null,  -- -1 = unlimited
  reason               text    not null default '',
  expires_at           timestamptz,       -- null = permanent override
  created_at           timestamptz not null default now(),
  unique(workspace_id, feature_key)
);

create index if not exists workspace_limit_overrides_ws_idx on public.workspace_limit_overrides(workspace_id);

-- ─── Add subscription columns to workspaces ──────────────────────────────────
-- subscription_tier_key: which tier this workspace is on
-- subscription_limit_snapshot: limits locked in at last renewal (JSONB map of feature_key → limit_value)
alter table public.workspaces
  add column if not exists subscription_tier_key    text    not null default 'starter',
  add column if not exists subscription_limit_snapshot jsonb; -- null = use live tier limits

-- ─── RLS ─────────────────────────────────────────────────────────────────────

-- subscription_tiers: public read (shown on pricing page), no writes from users
alter table public.subscription_tiers enable row level security;

create policy "Public read subscription_tiers"
  on public.subscription_tiers for select
  using (true);

-- tier_feature_limits: public read
alter table public.tier_feature_limits enable row level security;

create policy "Public read tier_feature_limits"
  on public.tier_feature_limits for select
  using (true);

-- workspace_limit_overrides: admin only (accessed via service role from API routes)
alter table public.workspace_limit_overrides enable row level security;
-- No user-level policies — only service role can access this table

-- ─── Seed default tiers ──────────────────────────────────────────────────────
insert into public.subscription_tiers (key, display_name, description, monthly_price, annual_price, is_active, is_featured, sort_order)
values
  ('starter', 'Starter',  'For solo founders and small brands',                79.00,  790.00, true, false, 1),
  ('growth',  'Growth',   'For performance marketers and active DTC teams',   149.00, 1490.00, true, true,  2),
  ('agency',  'Agency',   'For creative strategists managing multiple brands', 349.00, 3490.00, true, false, 3)
on conflict (key) do nothing;

-- ─── Seed feature limits — Starter ───────────────────────────────────────────
insert into public.tier_feature_limits (tier_id, feature_key, limit_value, reset_period)
select t.id, v.feature_key, v.limit_value::integer, v.reset_period
from public.subscription_tiers t,
(values
  ('funnel_analyses',      40,  'monthly'),
  ('variant_comparisons',   8,  'monthly'),
  ('creative_briefs',       8,  'monthly'),
  ('ad_deconstructions',    6,  'monthly'),
  ('chat_messages',       100,  'daily'),
  ('workspaces',            1,  'lifetime'),
  ('user_seats',            1,  'lifetime')
) as v(feature_key, limit_value, reset_period)
where t.key = 'starter'
on conflict (tier_id, feature_key) do nothing;

-- ─── Seed feature limits — Growth ────────────────────────────────────────────
insert into public.tier_feature_limits (tier_id, feature_key, limit_value, reset_period)
select t.id, v.feature_key, v.limit_value::integer, v.reset_period
from public.subscription_tiers t,
(values
  ('funnel_analyses',     100, 'monthly'),
  ('variant_comparisons',  25, 'monthly'),
  ('creative_briefs',      20, 'monthly'),
  ('ad_deconstructions',   15, 'monthly'),
  ('chat_messages',       400, 'daily'),
  ('workspaces',            3, 'lifetime'),
  ('user_seats',            1, 'lifetime')
) as v(feature_key, limit_value, reset_period)
where t.key = 'growth'
on conflict (tier_id, feature_key) do nothing;

-- ─── Seed feature limits — Agency ────────────────────────────────────────────
insert into public.tier_feature_limits (tier_id, feature_key, limit_value, reset_period)
select t.id, v.feature_key, v.limit_value::integer, v.reset_period
from public.subscription_tiers t,
(values
  ('funnel_analyses',     300, 'monthly'),
  ('variant_comparisons',  75, 'monthly'),
  ('creative_briefs',      60, 'monthly'),
  ('ad_deconstructions',   45, 'monthly'),
  ('chat_messages',      1500, 'daily'),
  ('workspaces',           15, 'lifetime'),
  ('user_seats',            5, 'lifetime')
) as v(feature_key, limit_value, reset_period)
where t.key = 'agency'
on conflict (tier_id, feature_key) do nothing;
