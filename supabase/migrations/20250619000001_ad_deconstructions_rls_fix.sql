-- Fix RLS on ad_deconstructions (match analyses table pattern).

drop policy if exists "Users manage own deconstructions" on public.ad_deconstructions;

create policy "Users can view own deconstructions"
  on public.ad_deconstructions for select
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = ad_deconstructions.workspace_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can create own deconstructions"
  on public.ad_deconstructions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can update own deconstructions"
  on public.ad_deconstructions for update
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = ad_deconstructions.workspace_id
        and w.user_id = auth.uid()
    )
  );

create policy "Users can delete own deconstructions"
  on public.ad_deconstructions for delete
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = ad_deconstructions.workspace_id
        and w.user_id = auth.uid()
    )
  );
