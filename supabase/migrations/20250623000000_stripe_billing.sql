-- Advara: Stripe billing + trial/paywall account state
-- Connects the dynamic tier system to real Stripe subscriptions and adds the
-- trial → active → paywalled / payment_failed lifecycle on the account (profile).

-- ─── Stripe price references on subscription_tiers ───────────────────────────
-- Stripe Prices are immutable; when an admin changes a tier price we create a
-- NEW Price and point these columns at it. Existing subscribers stay on the old
-- Price (standard Stripe behaviour) until they change plans.
alter table public.subscription_tiers
  add column if not exists stripe_product_id        text,
  add column if not exists stripe_monthly_price_id  text,
  add column if not exists stripe_annual_price_id   text,
  add column if not exists stripe_founding_price_id text;

-- ─── Account-level billing + lifecycle state on profiles ─────────────────────
-- account_status is INDEPENDENT of the tier system — it gates whether the user
-- can perform actions at all, regardless of which tier they sit on.
--   trialing       → time-boxed free trial (fixed trial limits apply)
--   active         → paying customer in good standing
--   paywalled      → trial expired / cancelled — read-only, all actions blocked
--   payment_failed → renewal failed — read-only + actions blocked, grace messaging
alter table public.profiles
  add column if not exists account_status text not null default 'trialing'
    check (account_status in ('trialing', 'active', 'paywalled', 'payment_failed')),
  add column if not exists trial_ends_at          timestamptz,
  add column if not exists payment_failed_at      timestamptz,
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_tier_key  text,
  add column if not exists subscription_interval  text
    check (subscription_interval in ('month', 'year')),
  add column if not exists current_period_end     timestamptz;

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id);

-- ─── Trial starts at signup: 14 days from profile creation ───────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, account_status, trial_ends_at)
  values (new.id, 'trialing', now() + interval '14 days')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill: give every existing account a clean 14-day trial window if unset.
update public.profiles
set trial_ends_at = now() + interval '14 days'
where trial_ends_at is null;

-- ─── Founding slot claim — atomic, race-safe ─────────────────────────────────
-- Returns true and decrements if a slot was available, false otherwise.
-- Uses SELECT ... FOR UPDATE so two simultaneous checkouts cannot both claim
-- the last slot.
create or replace function public.claim_founding_slot(p_tier_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slots integer;
begin
  select founding_slots into v_slots
  from public.subscription_tiers
  where key = p_tier_key
  for update;

  if v_slots is null or v_slots <= 0 then
    return false;
  end if;

  update public.subscription_tiers
  set founding_slots = founding_slots - 1,
      updated_at = now()
  where key = p_tier_key;

  return true;
end;
$$;
