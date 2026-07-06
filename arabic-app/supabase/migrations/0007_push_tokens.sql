-- ============================================================================
-- 0007 — Remote push notifications (Phase 15)
-- ============================================================================
-- Stores each device's Expo push token so the send-push Edge Function can
-- reach users who opted into notifications (win-back campaigns, announcements).
-- A user can have several rows (phone + tablet); tokens are unique per device.
-- ============================================================================

create table if not exists public.push_tokens (
  token text primary key, -- ExponentPushToken[...] — unique per device install
  user_id uuid not null references public.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- Own-rows only, for every operation: a user registers/refreshes/removes the
-- tokens of their own devices and can never see anyone else's. The send-push
-- Edge Function reads with the service role, which bypasses RLS.
drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own" on public.push_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own" on public.push_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own" on public.push_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own" on public.push_tokens
  for delete using (auth.uid() = user_id);
