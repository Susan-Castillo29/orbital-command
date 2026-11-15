\set ON_ERROR_STOP on
begin;
insert into auth.users(id,raw_user_meta_data)
select ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,
 jsonb_build_object('username','Explorer '||n,'first_name','Alex','last_name','Torres') from generate_series(1,12) n;
insert into public.orbital_campaigns(user_id,snapshot,revision)
select ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,
 jsonb_build_object('version',1,'items',jsonb_build_object('orbital-command-player',jsonb_build_object('xp',n*100)::text)),0 from generate_series(1,12) n;
set local role authenticated;
do $$
declare i integer;
begin
 for i in 1..12 loop
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-'||lpad(i::text,12,'0'),true);
  perform public.orbital_publish_score();
 end loop;
 if (select count(*) from public.orbital_top_players()) <> 10 then raise exception 'Top ten limit failed'; end if;
 if (select xp from public.orbital_top_players() limit 1) <> 1200 then raise exception 'Ordering failed'; end if;
 if (select first_name from public.orbital_top_players() limit 1) <> 'Alex' then raise exception 'Profile missing'; end if;
 if has_table_privilege('authenticated','public.orbital_leaderboard','SELECT') then raise exception 'Direct access permitted'; end if;
 perform public.orbital_remove_score();
 if (select max(xp) from public.orbital_top_players()) <> 1100 then raise exception 'Removal failed'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 if (select count(*) from public.orbital_top_players()) <> 10 then raise exception 'Public top ten unavailable'; end if;
 if has_function_privilege('anon','public.orbital_publish_score()','EXECUTE') then raise exception 'Anonymous submission permitted'; end if;
end $$;
rollback;
