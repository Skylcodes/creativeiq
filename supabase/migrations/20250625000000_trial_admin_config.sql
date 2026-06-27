-- Admin-configurable free trial duration and feature limits.

create table if not exists public.trial_settings (
  id             uuid        primary key default gen_random_uuid(),
  duration_days  integer     not null default 14 check (duration_days >= 1 and duration_days <= 90),
  updated_at     timestamptz not null default now()
);

insert into public.trial_settings (duration_days)
select 14
where not exists (select 1 from public.trial_settings);

create table if not exists public.trial_feature_limits (
  id                    uuid        primary key default gen_random_uuid(),
  feature_key           text        not null unique,
  limit_value           integer     not null,
  reset_period          text        not null default 'monthly'
                          check (reset_period in ('monthly', 'daily', 'lifetime')),
  ends_trial_on_exhaust boolean     not null default false,
  updated_at            timestamptz not null default now()
);

insert into public.trial_feature_limits (feature_key, limit_value, reset_period, ends_trial_on_exhaust)
values
  ('funnel_analyses',      2,   'monthly',  true),
  ('variant_comparisons',  0,   'monthly',  false),
  ('creative_briefs',      1,   'monthly',  true),
  ('ad_deconstructions',   0,   'monthly',  false),
  ('chat_messages',        20,  'daily',    false),
  ('workspaces',           1,   'lifetime', false),
  ('user_seats',           1,   'lifetime', false)
on conflict (feature_key) do nothing;

alter table public.trial_settings enable row level security;
alter table public.trial_feature_limits enable row level security;

create policy "Public read trial_settings"
  on public.trial_settings for select using (true);

create policy "Public read trial_feature_limits"
  on public.trial_feature_limits for select using (true);

-- New signups use the admin-configured trial length.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer;
begin
  select duration_days into v_days
  from public.trial_settings
  order by updated_at desc
  limit 1;

  v_days := coalesce(v_days, 14);

  insert into public.profiles (id, account_status, trial_ends_at)
  values (new.id, 'trialing', now() + make_interval(days => v_days))
  on conflict (id) do nothing;

  return new;
end;
$$;
