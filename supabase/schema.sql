-- SYSTEM: esquema inicial versionado do Supabase
-- Seguro para executar novamente: cria objetos ausentes e recria apenas as políticas abaixo.
-- Execute antes de supabase/friends.sql no SQL Editor do Supabase.

create table if not exists public.system_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  rank text not null default 'E' check (rank in ('E','D','C','B','A','S')),
  share_progress boolean not null default true,
  created_at timestamptz not null default now(),
  constraint system_profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint system_profiles_display_name_length check (char_length(display_name) between 1 and 40)
);

create table if not exists public.system_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.system_profiles(user_id) on delete cascade,
  recipient_id uuid not null references public.system_profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  constraint system_friendships_not_self check (requester_id <> recipient_id),
  constraint system_friendships_pair_unique unique (requester_id, recipient_id)
);

create index if not exists system_friendships_requester_idx
  on public.system_friendships(requester_id, status);
create index if not exists system_friendships_recipient_idx
  on public.system_friendships(recipient_id, status);

alter table public.system_profiles enable row level security;
alter table public.system_friendships enable row level security;

drop policy if exists "Read own SYSTEM profile" on public.system_profiles;
create policy "Read own SYSTEM profile"
  on public.system_profiles for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Create own SYSTEM profile" on public.system_profiles;
create policy "Create own SYSTEM profile"
  on public.system_profiles for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Update own SYSTEM profile" on public.system_profiles;
create policy "Update own SYSTEM profile"
  on public.system_profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.system_profiles to authenticated;
revoke all on public.system_friendships from anon, authenticated;

-- As operações sociais são executadas pelas funções SECURITY DEFINER
-- definidas em friends.sql; o cliente não recebe acesso direto à tabela.
