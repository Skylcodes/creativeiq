-- Migration: Add verdict and verdict_rationale columns to analyses table
alter table public.analyses add column if not exists verdict text;
alter table public.analyses add column if not exists verdict_rationale text;
