-- One-shot self-heal marker: status poll may re-trigger a worker that never
-- locked. A second poll must not keep dispatching.
alter table public.analyses
  add column if not exists worker_retriggered_at timestamptz;
