-- Private Supabase Realtime channels for team presence, movement and chat.
-- Apply after 202611150001_collaboration.sql.
begin;

create or replace function public.orbital_can_access_realtime_topic(target_topic text) returns boolean
language plpgsql stable security definer set search_path = pg_catalog as $$
declare
  v_team uuid;
begin
  if auth.uid() is null or target_topic !~ '^orbital-team:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_team := substring(target_topic from 14)::uuid;
  return public.orbital_is_team_member(v_team);
exception when others then
  return false;
end $$;

revoke all on function public.orbital_can_access_realtime_topic(text) from public, anon;
grant execute on function public.orbital_can_access_realtime_topic(text) to authenticated;

drop policy if exists orbital_team_realtime_receive on realtime.messages;
create policy orbital_team_realtime_receive on realtime.messages
  for select to authenticated
  using (extension in ('broadcast', 'presence') and public.orbital_can_access_realtime_topic(realtime.topic()));

drop policy if exists orbital_team_realtime_send on realtime.messages;
create policy orbital_team_realtime_send on realtime.messages
  for insert to authenticated
  with check (extension in ('broadcast', 'presence') and public.orbital_can_access_realtime_topic(realtime.topic()));

commit;

