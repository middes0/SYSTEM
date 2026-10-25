create table if not exists public.system_player_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  constraint system_player_state_state_object check (jsonb_typeof(state) = 'object')
);
alter table public.system_player_state enable row level security;
revoke all on public.system_player_state from anon;
grant select, insert, update, delete on public.system_player_state to authenticated;
drop policy if exists "Players can read own saved progress" on public.system_player_state;
create policy "Players can read own saved progress" on public.system_player_state for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Players can insert own saved progress" on public.system_player_state;
create policy "Players can insert own saved progress" on public.system_player_state for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Players can update own saved progress" on public.system_player_state;
create policy "Players can update own saved progress" on public.system_player_state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Players can delete own saved progress" on public.system_player_state;
create policy "Players can delete own saved progress" on public.system_player_state for delete to authenticated using (auth.uid() = user_id);
