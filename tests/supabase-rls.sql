\set ON_ERROR_STOP on
-- Run only against a disposable local Postgres database with mocked auth.uid().
insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),
 ('00000000-0000-0000-0000-000000000003'),('00000000-0000-0000-0000-000000000004'),
 ('00000000-0000-0000-0000-000000000005');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
set role authenticated;
select * from public.orbital_create_team('Mission team') \gset
select set_config('test.team', :'team_id', false), set_config('test.invite', :'invite_code', false);
select public.orbital_save_campaign(-1,'{"version":1,"items":{}}');
select public.orbital_save_team_campaign(:'team_id',-1,'{"version":1,"items":{}}');
select public.orbital_update_plan(:'team_id',0,'earth','{"ship":"pioneer","instrument":"camera","power":"solar","radio":"standard","launcher":"light","thermal":"standard"}');
do $$ begin
  begin perform public.orbital_update_plan(current_setting('test.team')::uuid,0,'earth','{"ship":"pioneer","instrument":"camera","power":"solar","radio":"standard","launcher":"light","thermal":"standard"}'); raise exception 'stale update accepted';
  exception when others then if sqlstate <> '40001' then raise; end if; if sqlerrm = 'stale update accepted' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$ begin
 if exists(select 1 from public.orbital_teams) then raise exception 'outsider can read team'; end if;
 if exists(select 1 from public.orbital_campaigns) then raise exception 'outsider can read campaign'; end if;
 if exists(select 1 from public.orbital_team_campaigns) then raise exception 'outsider can read team campaign'; end if;
 begin perform public.orbital_save_team_campaign(current_setting('test.team')::uuid,0,'{"version":1,"items":{}}'); raise exception 'outsider can write team campaign'; exception when insufficient_privilege then null; end;
 begin perform public.orbital_update_plan(current_setting('test.team')::uuid,1,'earth','{}'); raise exception 'outsider can update';
 exception when insufficient_privilege then null; end;
end $$;
select public.orbital_join_team(:'invite_code');
do $$ begin
 if not exists(select 1 from public.orbital_team_campaigns) then raise exception 'member cannot read team campaign'; end if;
 begin perform public.orbital_save_team_campaign(current_setting('test.team')::uuid,-1,'{"version":1,"items":{}}'); raise exception 'stale team campaign accepted'; exception when serialization_failure then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select public.orbital_join_team(:'invite_code');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select public.orbital_join_team(:'invite_code');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
do $$ begin
 begin perform public.orbital_join_team(current_setting('test.invite')); raise exception 'fifth member accepted';
 exception when raise_exception then if sqlerrm = 'fifth member accepted' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ begin
 begin perform public.orbital_save_campaign(-1, '{"version":1,"items":{}}'); raise exception 'duplicate campaign accepted';
 exception when serialization_failure then null; end;
 begin perform public.orbital_save_campaign(0, '{}'); raise exception 'invalid campaign accepted';
 exception when raise_exception then if sqlerrm = 'invalid campaign accepted' then raise; end if; end;
end $$;
select public.orbital_rotate_invite(:'team_id') as rotated_code \gset
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.orbital_leave_team(:'team_id');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
do $$ begin
 begin perform public.orbital_join_team(current_setting('test.invite')); raise exception 'old invitation accepted';
 exception when raise_exception then if sqlerrm = 'old invitation accepted' then raise; end if; end;
end $$;
select public.orbital_join_team(:'rotated_code');
select public.orbital_set_role(:'team_id','engineering');
do $$ begin
 if not exists(select 1 from public.orbital_team_members where user_id=auth.uid() and role='engineering') then raise exception 'role not updated'; end if;
 begin perform public.orbital_delete_team(current_setting('test.team')::uuid); raise exception 'member deleted team';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.orbital_join_team(text)','EXECUTE') then raise exception 'anon has join privilege'; end if;
 if has_function_privilege('anon','public.orbital_save_team_campaign(uuid,integer,jsonb)','EXECUTE') then raise exception 'anon can write team campaign'; end if;
 if has_table_privilege('authenticated','public.orbital_team_plans','UPDATE') then raise exception 'direct plan update permitted'; end if;
 if has_table_privilege('authenticated','public.orbital_team_members','INSERT') then raise exception 'direct membership insertion permitted'; end if;
 if has_table_privilege('authenticated','public.orbital_campaigns','UPDATE') then raise exception 'direct campaign update permitted'; end if;
 if has_column_privilege('authenticated','public.orbital_teams','invite_hash','SELECT') then raise exception 'invitation hash exposed'; end if;
end $$;
