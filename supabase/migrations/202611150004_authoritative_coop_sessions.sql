-- Durable, server-validated team sessions and idempotent cooperative actions.
-- Apply after 202611150003_realtime_multiplayer.sql.
begin;

create table public.orbital_team_sessions (
  team_id uuid primary key references public.orbital_teams(id) on delete cascade,
  mission_id text not null default 'earth' check (mission_id in ('earth','moon','mercury','venus','mars','jupiter','europa','saturn','titan','uranus','neptune','sun','asteroid')),
  status text not null default 'lobby' check (status in ('lobby','active','completed')),
  host_user_id uuid not null references auth.users(id),
  revision bigint not null default 0 check (revision >= 0),
  state jsonb not null default '{"route":null,"repairs":0,"samples":[],"scans":[],"transmitted":false,"resources":{"fuel":100,"energy":100,"integrity":100},"contributions":{}}'::jsonb,
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 32768)
);

create table public.orbital_team_session_players (
  team_id uuid not null references public.orbital_teams(id) on delete cascade,
  user_id uuid not null,
  ready boolean not null default false,
  pose jsonb not null default '{"x":0,"y":0,"z":0,"yaw":0,"activity":"idle","mode":"system"}'::jsonb,
  last_seen timestamptz not null default now(),
  primary key (team_id, user_id),
  foreign key (team_id,user_id) references public.orbital_team_members(team_id,user_id) on delete cascade,
  check (jsonb_typeof(pose) = 'object' and octet_length(pose::text) <= 512)
);
create index orbital_team_session_players_seen_idx on public.orbital_team_session_players(team_id,last_seen desc);

create table public.orbital_team_session_actions (
  team_id uuid not null references public.orbital_teams(id) on delete cascade,
  action_id uuid not null,
  actor_id uuid not null references auth.users(id),
  action_type text not null,
  payload jsonb not null,
  revision bigint not null,
  created_at timestamptz not null default now(),
  primary key (team_id,action_id),
  check (octet_length(payload::text) <= 2048)
);
create index orbital_team_session_actions_recent_idx on public.orbital_team_session_actions(team_id,created_at desc);

alter table public.orbital_team_sessions enable row level security;
alter table public.orbital_team_session_players enable row level security;
alter table public.orbital_team_session_actions enable row level security;
create policy cooperative_session_read on public.orbital_team_sessions for select to authenticated using (public.orbital_is_team_member(team_id));
create policy cooperative_players_read on public.orbital_team_session_players for select to authenticated using (public.orbital_is_team_member(team_id));
create policy cooperative_actions_read on public.orbital_team_session_actions for select to authenticated using (public.orbital_is_team_member(team_id));
revoke all on public.orbital_team_sessions,public.orbital_team_session_players,public.orbital_team_session_actions from public,anon,authenticated;
grant select on public.orbital_team_sessions,public.orbital_team_session_players,public.orbital_team_session_actions to authenticated;

create or replace function public.orbital_team_heartbeat(target_team uuid, is_ready boolean, player_pose jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare v_user uuid := auth.uid(); v_role text; v_session public.orbital_team_sessions%rowtype; v_next_host uuid;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select role into v_role from public.orbital_team_members where team_id=target_team and user_id=v_user;
  if v_role is null then raise exception 'Not a team member' using errcode='42501'; end if;
  if player_pose is null or jsonb_typeof(player_pose)<>'object' or octet_length(player_pose::text)>512
    or coalesce((player_pose->>'x')::numeric between -500 and 500,false)=false
    or coalesce((player_pose->>'y')::numeric between -500 and 500,false)=false
    or coalesce((player_pose->>'z')::numeric between -500 and 500,false)=false
    or coalesce((player_pose->>'yaw')::numeric between -100000 and 100000,false)=false
    or coalesce(player_pose->>'activity','') not in ('idle','walk','run','interact','aboard')
    or coalesce(player_pose->>'mode','') not in ('system','flight','orbit','surface') then raise exception 'Invalid player pose'; end if;
  insert into public.orbital_team_sessions(team_id,host_user_id) select target_team,owner_id from public.orbital_teams where id=target_team on conflict(team_id) do nothing;
  insert into public.orbital_team_session_players(team_id,user_id,ready,pose,last_seen) values(target_team,v_user,coalesce(is_ready,false),player_pose,now())
  on conflict(team_id,user_id) do update set ready=excluded.ready,pose=excluded.pose,last_seen=excluded.last_seen;
  select * into v_session from public.orbital_team_sessions where team_id=target_team for update;
  if not exists(select 1 from public.orbital_team_session_players where team_id=target_team and user_id=v_session.host_user_id and last_seen>now()-interval '15 seconds') then
    select p.user_id into v_next_host from public.orbital_team_session_players p join public.orbital_team_members m using(team_id,user_id)
      where p.team_id=target_team and p.last_seen>now()-interval '15 seconds' order by m.joined_at,p.user_id limit 1;
    if v_next_host is not null and v_next_host<>v_session.host_user_id then
      update public.orbital_team_sessions set host_user_id=v_next_host,
        state=jsonb_set(jsonb_set(state,'{hostTelemetry}',coalesce(state->'resources','{}'::jsonb),true),'{hostStatus}','{}'::jsonb,true),
        revision=revision+1,updated_at=now() where team_id=target_team returning * into v_session;
    end if;
  end if;
  return jsonb_build_object('session',to_jsonb(v_session),'players',(select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'ready',p.ready,'pose',p.pose,'last_seen',p.last_seen,'connected',p.last_seen>now()-interval '15 seconds','role',m.role) order by m.joined_at),'[]'::jsonb) from public.orbital_team_session_players p join public.orbital_team_members m using(team_id,user_id) where p.team_id=target_team));
end $$;

create or replace function public.orbital_start_team_mission(target_team uuid,target_mission text)
returns public.orbital_team_sessions language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare v_user uuid:=auth.uid(); v_session public.orbital_team_sessions%rowtype; v_count integer; v_plan text;
begin
  if v_user is null or not exists(select 1 from public.orbital_team_members where team_id=target_team and user_id=v_user) then raise exception 'Not a team member' using errcode='42501'; end if;
  if target_mission not in ('earth','moon','mercury','venus','mars','jupiter','europa','saturn','titan','uranus','neptune','sun','asteroid') then raise exception 'Invalid mission'; end if;
  select * into v_session from public.orbital_team_sessions where team_id=target_team for update;
  if not found then raise exception 'Team session is not connected'; end if;
  if v_session.host_user_id<>v_user then raise exception 'Only the current host may start the mission' using errcode='42501'; end if;
  if v_session.status='active' then raise exception 'Mission already active'; end if;
  select mission_id into v_plan from public.orbital_team_plans where team_id=target_team;
  if v_plan is not null and v_plan<>target_mission then raise exception 'Mission does not match the shared team plan'; end if;
  select count(*) into v_count from public.orbital_team_members m join public.orbital_team_session_players p using(team_id,user_id)
    where m.team_id=target_team and p.ready and p.last_seen>now()-interval '15 seconds';
  if v_count<>(select count(*) from public.orbital_team_members where team_id=target_team) or v_count not between 1 and 4 then raise exception 'Every team member must be connected and ready'; end if;
  update public.orbital_team_sessions set mission_id=target_mission,status='active',revision=revision+1,
    state=jsonb_build_object('route',target_mission,'repairs',0,'samples','[]'::jsonb,'scans','[]'::jsonb,'transmitted',false,'interactions','[]'::jsonb,
      'resources',jsonb_build_object('fuel',100,'energy',100,'integrity',100),'contributions',jsonb_build_object(v_user::text,1)),
    started_at=now(),completed_at=null,updated_at=now() where team_id=target_team returning * into v_session;
  return v_session;
end $$;

create or replace function public.orbital_submit_team_action(target_team uuid, p_action_id uuid, action_type text, action_payload jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare v_user uuid:=auth.uid(); v_role text; v_session public.orbital_team_sessions%rowtype; v_state jsonb; v_values jsonb; v_items jsonb; v_key text; v_revision bigint; v_done boolean:=false;
begin
  if v_user is null or not exists(select 1 from public.orbital_team_members where team_id=target_team and user_id=v_user) then raise exception 'Not a team member' using errcode='42501'; end if;
  if p_action_id is null or action_payload is null or jsonb_typeof(action_payload)<>'object' or octet_length(action_payload::text)>2048 then raise exception 'Invalid action'; end if;
  select role into v_role from public.orbital_team_members where team_id=target_team and user_id=v_user;
  select * into v_session from public.orbital_team_sessions where team_id=target_team for update;
  if not found or v_session.status<>'active' then raise exception 'Team mission is not active'; end if;
  if exists(select 1 from public.orbital_team_session_actions where team_id=target_team and orbital_team_session_actions.action_id=p_action_id) then
    return jsonb_build_object('applied',false,'duplicate',true,'session',to_jsonb(v_session));
  end if;
  v_state:=v_session.state;
  if action_type='set_route' and v_role='planning' and length(coalesce(action_payload->>'route','')) between 1 and 80 then
    if action_payload->>'route'<>v_session.mission_id then raise exception 'Route does not match the selected mission'; end if;
    v_state:=jsonb_set(v_state,'{route}',to_jsonb(action_payload->>'route'));
  elsif action_type='repair_system' and v_role='engineering' and coalesce((v_state->>'repairs')::integer,0)<1 then
    v_state:=jsonb_set(v_state,'{repairs}','1'::jsonb); v_values:=jsonb_set(v_state->'resources','{integrity}',to_jsonb(least(100,coalesce((v_state#>>'{resources,integrity}')::integer,100)+20))); v_state:=jsonb_set(v_state,'{resources}',v_values);
  elsif action_type in ('collect_sample','scan_sector') and v_role='science' then
    v_key:=action_payload->>'id'; if v_key is null or v_key !~ '^[a-zA-Z0-9_-]{1,48}$' then raise exception 'Invalid objective id'; end if;
    v_items:=coalesce(v_state->(case when action_type='collect_sample' then 'samples' else 'scans' end),'[]'::jsonb);
    if v_items @> jsonb_build_array(v_key) then raise exception 'Objective already recorded'; end if;
    if jsonb_array_length(v_items)>=3 then raise exception 'Collective objective is already complete'; end if;
    v_values:=v_state->'resources';
    if coalesce((v_values->>'energy')::integer,100)<(case when action_type='collect_sample' then 6 else 8 end) then raise exception 'Insufficient shared energy'; end if;
    v_items:=v_items||jsonb_build_array(v_key); v_state:=jsonb_set(v_state,array[case when action_type='collect_sample' then 'samples' else 'scans' end],v_items);
    v_values:=jsonb_set(v_values,'{energy}',to_jsonb(coalesce((v_values->>'energy')::integer,100)-(case when action_type='collect_sample' then 6 else 8 end)));
    v_state:=jsonb_set(v_state,'{resources}',v_values);
  elsif action_type='interact' and action_payload->>'id' ~ '^[a-zA-Z0-9_-]{1,48}$' then
    v_items:=coalesce(v_state->'interactions','[]'::jsonb);
    if jsonb_array_length(v_items)>=64 then raise exception 'Interaction history limit reached'; end if;
    v_state:=jsonb_set(v_state,'{interactions}',v_items||jsonb_build_array(jsonb_build_object('action_id',p_action_id,'object_id',action_payload->>'id','user_id',v_user,'at',now())),true);
  elsif action_type='transmit' and v_role='communications' then
    if coalesce(v_state->>'route','')='' or coalesce((v_state->>'repairs')::integer,0)<1 or jsonb_array_length(v_state->'scans')<3
      or (v_session.mission_id in ('moon','mars','mercury','titan') and jsonb_array_length(v_state->'samples')<3) then raise exception 'Collective mission objectives remain incomplete'; end if;
    if coalesce((v_state->>'transmitted')::boolean,false) then raise exception 'Mission already completed'; end if;
    v_state:=jsonb_set(v_state,'{transmitted}','true'::jsonb); v_done:=true;
  else raise exception 'Action is not permitted for this role'; end if;
  v_values:=coalesce(v_state->'contributions','{}'::jsonb); v_values:=jsonb_set(v_values,array[v_user::text],to_jsonb(coalesce((v_values->>v_user::text)::integer,0)+1),true); v_state:=jsonb_set(v_state,'{contributions}',v_values);
  update public.orbital_team_sessions set state=v_state,status=case when v_done then 'completed' else status end,completed_at=case when v_done then now() else completed_at end,revision=revision+1,updated_at=now()
    where team_id=target_team returning revision into v_revision;
  insert into public.orbital_team_session_actions(team_id,action_id,actor_id,action_type,payload,revision) values(target_team,p_action_id,v_user,action_type,action_payload,v_revision);
  select * into v_session from public.orbital_team_sessions where team_id=target_team;
  return jsonb_build_object('applied',true,'session',to_jsonb(v_session));
end $$;

create or replace function public.orbital_report_team_telemetry(target_team uuid,target_mission text,fuel numeric,energy numeric,integrity numeric,objective text,progress numeric,location text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare v_user uuid:=auth.uid(); v_session public.orbital_team_sessions%rowtype; v_state jsonb; v_resources jsonb; v_baseline jsonb;
begin
  if v_user is null or not exists(select 1 from public.orbital_team_members where team_id=target_team and user_id=v_user) then raise exception 'Not a team member' using errcode='42501'; end if;
  if fuel not between 0 and 100 or energy not between 0 and 100 or integrity not between 0 and 100 or progress not between 0 and 100
    or length(coalesce(objective,''))>180 or length(coalesce(location,''))>60 then raise exception 'Invalid telemetry'; end if;
  select * into v_session from public.orbital_team_sessions where team_id=target_team for update;
  if not found or v_session.status<>'active' or v_session.mission_id<>target_mission then raise exception 'Team mission is not active'; end if;
  if v_session.host_user_id<>v_user then raise exception 'Only the current host may report shared telemetry' using errcode='42501'; end if;
  v_state:=v_session.state; v_resources:=v_state->'resources'; v_baseline:=coalesce(v_state->'hostTelemetry',v_resources);
  v_resources:=jsonb_set(v_resources,'{fuel}',to_jsonb(greatest(0::numeric,least(100::numeric,coalesce((v_resources->>'fuel')::numeric,100)+(fuel-coalesce((v_baseline->>'fuel')::numeric,100))))));
  v_resources:=jsonb_set(v_resources,'{energy}',to_jsonb(greatest(0::numeric,least(100::numeric,coalesce((v_resources->>'energy')::numeric,100)+(energy-coalesce((v_baseline->>'energy')::numeric,100))))));
  v_resources:=jsonb_set(v_resources,'{integrity}',to_jsonb(greatest(0::numeric,least(100::numeric,coalesce((v_resources->>'integrity')::numeric,100)+(integrity-coalesce((v_baseline->>'integrity')::numeric,100))))));
  v_state:=jsonb_set(v_state,'{resources}',v_resources);
  v_state:=jsonb_set(v_state,'{hostTelemetry}',jsonb_build_object('fuel',fuel,'energy',energy,'integrity',integrity));
  v_state:=jsonb_set(v_state,'{hostStatus}',jsonb_build_object('objective',objective,'progress',progress,'location',location,'reported_by',v_user,'updated_at',now()));
  update public.orbital_team_sessions set state=v_state,revision=revision+1,updated_at=now() where team_id=target_team returning * into v_session;
  return jsonb_build_object('session',to_jsonb(v_session));
end $$;

revoke all on function public.orbital_team_heartbeat(uuid,boolean,jsonb),public.orbital_start_team_mission(uuid,text),public.orbital_submit_team_action(uuid,uuid,text,jsonb),public.orbital_report_team_telemetry(uuid,text,numeric,numeric,numeric,text,numeric,text) from public,anon;
grant execute on function public.orbital_team_heartbeat(uuid,boolean,jsonb),public.orbital_start_team_mission(uuid,text),public.orbital_submit_team_action(uuid,uuid,text,jsonb),public.orbital_report_team_telemetry(uuid,text,numeric,numeric,numeric,text,numeric,text) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='orbital_team_sessions') then alter publication supabase_realtime add table public.orbital_team_sessions; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='orbital_team_session_players') then alter publication supabase_realtime add table public.orbital_team_session_players; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='orbital_team_session_actions') then alter publication supabase_realtime add table public.orbital_team_session_actions; end if;
end $$;

notify pgrst,'reload schema';
commit;
