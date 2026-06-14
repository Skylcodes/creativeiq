-- Creative Director chat sessions and messages

create table if not exists public.creative_director_chats (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  analysis_id uuid references public.analyses (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One workspace-wide chat per user; one chat per analysis per user
create unique index if not exists creative_director_chats_workspace_user_idx
  on public.creative_director_chats (workspace_id, user_id)
  where analysis_id is null;

create unique index if not exists creative_director_chats_analysis_user_idx
  on public.creative_director_chats (workspace_id, user_id, analysis_id)
  where analysis_id is not null;

create index if not exists creative_director_chats_workspace_idx
  on public.creative_director_chats (workspace_id);

create table if not exists public.creative_director_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.creative_director_chats (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists creative_director_messages_chat_idx
  on public.creative_director_messages (chat_id, created_at);

alter table public.creative_director_chats enable row level security;
alter table public.creative_director_messages enable row level security;

create policy "Users can view own chats"
  on public.creative_director_chats for select
  using (auth.uid() = user_id);

create policy "Users can create own chats"
  on public.creative_director_chats for insert
  with check (auth.uid() = user_id);

create policy "Users can update own chats"
  on public.creative_director_chats for update
  using (auth.uid() = user_id);

create policy "Users can delete own chats"
  on public.creative_director_chats for delete
  using (auth.uid() = user_id);

create policy "Users can view messages in own chats"
  on public.creative_director_messages for select
  using (
    exists (
      select 1 from public.creative_director_chats c
      where c.id = chat_id and c.user_id = auth.uid()
    )
  );

create policy "Users can insert messages in own chats"
  on public.creative_director_messages for insert
  with check (
    exists (
      select 1 from public.creative_director_chats c
      where c.id = chat_id and c.user_id = auth.uid()
    )
  );

create policy "Users can delete messages in own chats"
  on public.creative_director_messages for delete
  using (
    exists (
      select 1 from public.creative_director_chats c
      where c.id = chat_id and c.user_id = auth.uid()
    )
  );
