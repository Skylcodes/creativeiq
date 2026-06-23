-- Allow multiple Creative Director chat sessions per workspace / analysis

drop index if exists public.creative_director_chats_workspace_user_idx;
drop index if exists public.creative_director_chats_analysis_user_idx;

alter table public.creative_director_chats
  add column if not exists title text;

create index if not exists creative_director_chats_user_workspace_updated_idx
  on public.creative_director_chats (user_id, workspace_id, updated_at desc);

create index if not exists creative_director_chats_user_analysis_updated_idx
  on public.creative_director_chats (user_id, workspace_id, analysis_id, updated_at desc)
  where analysis_id is not null;
