-- Advara: Workspaces + User Profiles
-- Run this in Supabase Dashboard → SQL Editor

-- Workspaces: one per brand
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  brand_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists workspaces_user_id_idx on public.workspaces (user_id);

-- Profiles: onboarding state + active workspace
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  onboarding_complete boolean not null default false,
  active_workspace_id uuid references public.workspaces (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Row Level Security
alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;

create policy "Users can view own workspaces"
  on public.workspaces for select
  using (auth.uid() = user_id);

create policy "Users can create own workspaces"
  on public.workspaces for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workspaces"
  on public.workspaces for update
  using (auth.uid() = user_id);

create policy "Users can delete own workspaces"
  on public.workspaces for delete
  using (auth.uid() = user_id);

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
