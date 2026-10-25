-- SYSTEM: funções seguras para busca de jogadores e amizades
-- Execute depois do schema.sql inicial no Supabase SQL Editor.

create or replace function public.system_search_players(search_term text)
returns table (
  user_id uuid,
  username text,
  display_name text,
  level integer,
  rank text,
  already_connected boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  term text := lower(trim(coalesce(search_term, '')));
begin
  if auth.uid() is null then raise exception 'Faça login para procurar jogadores.'; end if;
  if length(term) < 3 then raise exception 'Digite pelo menos 3 caracteres.'; end if;

  return query
  select p.user_id, p.username, p.display_name,
    case when p.share_progress then p.level else null end,
    case when p.share_progress then p.rank else null end,
    exists (
      select 1 from public.system_friendships f
      where ((f.requester_id = auth.uid() and f.recipient_id = p.user_id)
          or (f.recipient_id = auth.uid() and f.requester_id = p.user_id))
    )
  from public.system_profiles p
  where p.user_id <> auth.uid()
    and p.username like term || '%'
  order by p.username
  limit 20;
end;
$$;

create or replace function public.system_send_friend_request(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro.'; end if;
  if target_user_id = auth.uid() then raise exception 'Você não pode adicionar a si mesmo.'; end if;
  if not exists (select 1 from public.system_profiles p where p.user_id = target_user_id) then
    raise exception 'Jogador não encontrado.';
  end if;
  if exists (
    select 1 from public.system_friendships f
    where (f.requester_id = auth.uid() and f.recipient_id = target_user_id)
       or (f.requester_id = target_user_id and f.recipient_id = auth.uid())
  ) then raise exception 'Já existe uma solicitação ou amizade com esse jogador.'; end if;

  insert into public.system_friendships(requester_id, recipient_id, status)
  values (auth.uid(), target_user_id, 'pending')
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.system_respond_friend_request(friendship_id uuid, accept_request boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Faça login primeiro.'; end if;
  if accept_request then
    update public.system_friendships f
       set status = 'accepted'
     where f.id = friendship_id and f.recipient_id = auth.uid() and f.status = 'pending';
    if not found then raise exception 'Solicitação não encontrada ou já respondida.'; end if;
  else
    delete from public.system_friendships f
     where f.id = friendship_id and f.recipient_id = auth.uid() and f.status = 'pending';
    if not found then raise exception 'Solicitação não encontrada ou já respondida.'; end if;
  end if;
  return true;
end;
$$;

create or replace function public.system_remove_friendship(friendship_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Faça login primeiro.'; end if;
  delete from public.system_friendships f
   where f.id = friendship_id
     and (f.requester_id = auth.uid() or f.recipient_id = auth.uid());
  if not found then raise exception 'Amizade ou solicitação não encontrada.'; end if;
  return true;
end;
$$;

create or replace function public.system_list_friendships()
returns table (
  friendship_id uuid,
  status text,
  direction text,
  user_id uuid,
  username text,
  display_name text,
  level integer,
  rank text,
  xp integer,
  share_progress boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Faça login primeiro.'; end if;
  return query
  select f.id, f.status,
    case when f.requester_id = auth.uid() then 'outgoing' else 'incoming' end,
    p.user_id, p.username, p.display_name,
    case when f.status = 'accepted' and p.share_progress then p.level else null end,
    case when f.status = 'accepted' and p.share_progress then p.rank else null end,
    case when f.status = 'accepted' and p.share_progress then p.xp else null end,
    p.share_progress
  from public.system_friendships f
  join public.system_profiles p
    on p.user_id = case when f.requester_id = auth.uid() then f.recipient_id else f.requester_id end
  where f.requester_id = auth.uid() or f.recipient_id = auth.uid()
  order by (f.status = 'pending') desc, p.username;
end;
$$;

create or replace function public.system_get_shared_profile(target_user_id uuid)
returns table (
  user_id uuid,
  username text,
  display_name text,
  level integer,
  rank text,
  xp integer,
  share_progress boolean,
  friendship_status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Faça login primeiro.'; end if;
  return query
  select p.user_id, p.username, p.display_name,
    case when p.share_progress and exists (
      select 1 from public.system_friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.recipient_id = p.user_id)
          or (f.recipient_id = auth.uid() and f.requester_id = p.user_id))
    ) then p.level else null end,
    case when p.share_progress and exists (
      select 1 from public.system_friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.recipient_id = p.user_id)
          or (f.recipient_id = auth.uid() and f.requester_id = p.user_id))
    ) then p.rank else null end,
    case when p.share_progress and exists (
      select 1 from public.system_friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.recipient_id = p.user_id)
          or (f.recipient_id = auth.uid() and f.requester_id = p.user_id))
    ) then p.xp else null end,
    p.share_progress,
    (select f.status from public.system_friendships f
      where (f.requester_id = auth.uid() and f.recipient_id = p.user_id)
         or (f.recipient_id = auth.uid() and f.requester_id = p.user_id)
      limit 1)
  from public.system_profiles p
  where p.user_id = target_user_id;
end;
$$;

revoke all on function public.system_search_players(text) from public;
revoke all on function public.system_send_friend_request(uuid) from public;
revoke all on function public.system_respond_friend_request(uuid, boolean) from public;
revoke all on function public.system_remove_friendship(uuid) from public;
revoke all on function public.system_list_friendships() from public;
revoke all on function public.system_get_shared_profile(uuid) from public;

grant execute on function public.system_search_players(text) to authenticated;
grant execute on function public.system_send_friend_request(uuid) to authenticated;
grant execute on function public.system_respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.system_remove_friendship(uuid) to authenticated;
grant execute on function public.system_list_friendships() to authenticated;
grant execute on function public.system_get_shared_profile(uuid) to authenticated;
