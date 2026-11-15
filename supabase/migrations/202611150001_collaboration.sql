-- ORBITAL COMMAND: private campaign backup and collaborative mission planning.
begin;
-- Apply as a migration owner. Browser clients never need a service-role key.
create table public.orbital_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_hash text not null unique,
  created_at timestamptz not null default now()
);
create table public.orbital_team_members (
  team_id uuid not null references public.orbital_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('planning','engineering','science','communications')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index orbital_team_members_user_idx on public.orbital_team_members(user_id, team_id);
create table public.orbital_team_plans (
  team_id uuid primary key references public.orbital_teams(id) on delete cascade,
  mission_id text not null default 'earth',
  design jsonb not null default '{}'::jsonb,
  revision integer not null default 0 check (revision >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (pg_column_size(design) <= 4096)
);
create table public.orbital_team_campaigns (
  team_id uuid primary key references public.orbital_teams(id) on delete cascade,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 102400),
  revision integer not null default 0 check (revision >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create table public.orbital_campaigns (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 102400),
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

alter table public.orbital_teams enable row level security;
alter table public.orbital_team_members enable row level security;
alter table public.orbital_team_plans enable row level security;
alter table public.orbital_campaigns enable row level security;
alter table public.orbital_team_campaigns enable row level security;

-- SECURITY DEFINER avoids recursive membership policies; the caller cannot supply another user id.
create function public.orbital_is_team_member(target_team uuid) returns boolean
language sql stable security definer set search_path = pg_catalog, pg_temp
as $$ select auth.uid() is not null and exists(select 1 from public.orbital_team_members m where m.team_id = target_team and m.user_id = auth.uid()); $$;
revoke all on function public.orbital_is_team_member(uuid) from public, anon;
grant execute on function public.orbital_is_team_member(uuid) to authenticated;

create policy teams_read on public.orbital_teams for select to authenticated using (public.orbital_is_team_member(id));
create policy members_read on public.orbital_team_members for select to authenticated using (public.orbital_is_team_member(team_id));
create policy plans_read on public.orbital_team_plans for select to authenticated using (public.orbital_is_team_member(team_id));
create policy team_campaign_read on public.orbital_team_campaigns for select to authenticated using (public.orbital_is_team_member(team_id));
create policy campaign_read on public.orbital_campaigns for select to authenticated using (user_id = auth.uid());
create policy campaign_insert on public.orbital_campaigns for insert to authenticated with check (user_id = auth.uid());
create policy campaign_update on public.orbital_campaigns for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.orbital_teams, public.orbital_team_members, public.orbital_team_plans, public.orbital_team_campaigns, public.orbital_campaigns from public, anon, authenticated;
grant select (id, name, owner_id, created_at) on public.orbital_teams to authenticated;
grant select on public.orbital_team_members, public.orbital_team_plans, public.orbital_team_campaigns to authenticated;
grant select on public.orbital_campaigns to authenticated;

create function public.orbital_create_team(team_name text) returns table(team_id uuid, invite_code text)
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare v_user uuid := auth.uid(); v_id uuid; v_code text; v_name text := btrim(team_name);
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if v_name is null or char_length(v_name) not between 1 and 60 then raise exception 'Invalid team name'; end if;
  if (select count(*) from public.orbital_teams t where t.owner_id = v_user) >= 10 then raise exception 'Team limit reached'; end if;
  v_code := replace(gen_random_uuid()::text, '-', '');
  insert into public.orbital_teams(name, owner_id, invite_hash) values(v_name, v_user, encode(sha256(convert_to(v_code, 'UTF8')), 'hex')) returning id into v_id;
  insert into public.orbital_team_members(team_id, user_id, role) values(v_id, v_user, 'planning');
  insert into public.orbital_team_plans(team_id, updated_by) values(v_id, v_user);
  return query select v_id, v_code;
end $$;

create function public.orbital_join_team(code text) returns uuid
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare v_user uuid := auth.uid(); v_team uuid;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if code is null or code !~ '^[0-9a-f]{32}$' then raise exception 'Invalid invitation'; end if;
  select t.id into v_team from public.orbital_teams t where t.invite_hash = encode(sha256(convert_to(code, 'UTF8')), 'hex') for update;
  if v_team is null then raise exception 'Invalid invitation'; end if;
  if exists(select 1 from public.orbital_team_members m where m.team_id=v_team and m.user_id=v_user) then return v_team; end if;
  if (select count(*) from public.orbital_team_members m where m.team_id=v_team) >= 4 then raise exception 'Team is full'; end if;
  insert into public.orbital_team_members(team_id, user_id, role) values(v_team, v_user, 'science');
  return v_team;
end $$;

create function public.orbital_set_role(target_team uuid, selected_role text) returns void
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
begin
  perform 1 from public.orbital_team_members m where m.team_id=target_team and m.user_id=auth.uid() for key share;
  if not found then raise exception 'Not a team member' using errcode='42501'; end if;
  if selected_role is null or selected_role not in ('planning','engineering','science','communications') then raise exception 'Invalid role'; end if;
  update public.orbital_team_members set role=selected_role where team_id=target_team and user_id=auth.uid();
end $$;

create function public.orbital_update_plan(target_team uuid, expected_revision integer, target_mission text, new_design jsonb) returns integer
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare next_revision integer;
begin
  perform 1 from public.orbital_team_members m where m.team_id=target_team and m.user_id=auth.uid() for key share;
  if not found then raise exception 'Not a team member' using errcode='42501'; end if;
  if expected_revision is null or expected_revision < 0 or target_mission is null or target_mission not in ('earth','moon','mercury','venus','mars','jupiter','europa','saturn','titan','uranus','neptune','sun','asteroid') then raise exception 'Invalid mission or revision'; end if;
  if new_design is null or jsonb_typeof(new_design) <> 'object' or pg_column_size(new_design) > 4096
    or coalesce(new_design->>'ship','') not in ('pioneer','swift','atlas')
    or coalesce(new_design->>'instrument','') not in ('camera','spectrometer','advanced')
    or coalesce(new_design->>'power','') not in ('solar','nuclear')
    or coalesce(new_design->>'radio','') not in ('standard','deep')
    or coalesce(new_design->>'launcher','') not in ('light','medium','heavy')
    or coalesce(new_design->>'thermal','') not in ('standard','shielded')
    or coalesce(new_design->>'orbit','balanced') not in ('balanced','survey','relay')
    or coalesce(new_design->>'difficulty','standard') not in ('guided','standard','challenging')
    or exists(select 1 from jsonb_object_keys(new_design) k where k not in ('ship','instrument','power','radio','launcher','thermal','orbit','difficulty'))
  then raise exception 'Invalid mission design'; end if;
  update public.orbital_team_plans set mission_id=target_mission, design=new_design, revision=revision+1, updated_by=auth.uid(), updated_at=now()
    where team_id=target_team and revision=expected_revision returning revision into next_revision;
  if next_revision is null then raise exception 'Plan changed; refresh and retry' using errcode='40001'; end if;
  return next_revision;
end $$;

create function public.orbital_save_campaign(expected_revision integer, new_snapshot jsonb) returns integer
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare next_revision integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if expected_revision is null or expected_revision < -1 or new_snapshot is null or jsonb_typeof(new_snapshot) <> 'object' or octet_length(new_snapshot::text) > 102400
     or coalesce(new_snapshot->>'version','') <> '1' or coalesce(jsonb_typeof(new_snapshot->'items'),'') <> 'object' then raise exception 'Invalid campaign snapshot'; end if;
  if expected_revision = -1 then
    insert into public.orbital_campaigns(user_id, snapshot, revision) values(auth.uid(), new_snapshot, 0) on conflict (user_id) do nothing returning revision into next_revision;
  else
    update public.orbital_campaigns set snapshot=new_snapshot, revision=revision+1, updated_at=now()
      where user_id=auth.uid() and revision=expected_revision returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'Campaign changed; refresh and resolve the conflict' using errcode='40001'; end if;
  return next_revision;
end $$;

create function public.orbital_save_team_campaign(target_team uuid, expected_revision integer, new_snapshot jsonb) returns integer
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare next_revision integer;
begin
  perform 1 from public.orbital_team_members m where m.team_id=target_team and m.user_id=auth.uid() for key share;
  if not found then raise exception 'Not a team member' using errcode='42501'; end if;
  if expected_revision is null or expected_revision < -1 or new_snapshot is null or jsonb_typeof(new_snapshot) <> 'object' or octet_length(new_snapshot::text) > 102400
    or coalesce(new_snapshot->>'version','') <> '1' or coalesce(jsonb_typeof(new_snapshot->'items'),'') <> 'object' then raise exception 'Invalid campaign snapshot'; end if;
  if expected_revision = -1 then
    insert into public.orbital_team_campaigns(team_id,snapshot,revision,updated_by) values(target_team,new_snapshot,0,auth.uid()) on conflict (team_id) do nothing returning revision into next_revision;
  else
    update public.orbital_team_campaigns set snapshot=new_snapshot,revision=revision+1,updated_by=auth.uid(),updated_at=now()
      where team_id=target_team and revision=expected_revision returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'Team campaign changed; refresh and resolve the conflict' using errcode='40001'; end if;
  return next_revision;
end $$;

create function public.orbital_rotate_invite(target_team uuid) returns text
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare v_code text;
begin
  if auth.uid() is null or not exists(select 1 from public.orbital_teams t where t.id=target_team and t.owner_id=auth.uid()) then raise exception 'Only the team owner may change invitations' using errcode='42501'; end if;
  v_code := replace(gen_random_uuid()::text, '-', '');
  update public.orbital_teams set invite_hash=encode(sha256(convert_to(v_code, 'UTF8')), 'hex') where id=target_team;
  return v_code;
end $$;

create function public.orbital_leave_team(target_team uuid) returns void
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
begin
  perform 1 from public.orbital_team_members m where m.team_id=target_team and m.user_id=auth.uid() for key share;
  if not found then raise exception 'Not a team member' using errcode='42501'; end if;
  if exists(select 1 from public.orbital_teams t where t.id=target_team and t.owner_id=auth.uid()) then raise exception 'The owner must delete the team instead'; end if;
  delete from public.orbital_team_members where team_id=target_team and user_id=auth.uid();
end $$;

create function public.orbital_delete_team(target_team uuid) returns void
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
begin
  if auth.uid() is null or not exists(select 1 from public.orbital_teams t where t.id=target_team and t.owner_id=auth.uid()) then raise exception 'Only the team owner may delete the team' using errcode='42501'; end if;
  delete from public.orbital_teams where id=target_team and owner_id=auth.uid();
end $$;

revoke all on function public.orbital_create_team(text), public.orbital_join_team(text), public.orbital_set_role(uuid,text), public.orbital_update_plan(uuid,integer,text,jsonb), public.orbital_save_campaign(integer,jsonb), public.orbital_save_team_campaign(uuid,integer,jsonb), public.orbital_rotate_invite(uuid), public.orbital_leave_team(uuid), public.orbital_delete_team(uuid) from public, anon;
grant execute on function public.orbital_create_team(text), public.orbital_join_team(text), public.orbital_set_role(uuid,text), public.orbital_update_plan(uuid,integer,text,jsonb), public.orbital_save_campaign(integer,jsonb), public.orbital_save_team_campaign(uuid,integer,jsonb), public.orbital_rotate_invite(uuid), public.orbital_leave_team(uuid), public.orbital_delete_team(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
