-- Public, opt-in leaderboard. Scores originate in player-controlled saves and are not verified.
begin;
create table public.orbital_leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 48),
  first_name text not null check (char_length(first_name) between 1 and 48),
  last_name text not null check (char_length(last_name) between 1 and 48),
  xp integer not null check (xp between 0 and 1000000),
  updated_at timestamptz not null default now()
);
alter table public.orbital_leaderboard enable row level security;
revoke all on public.orbital_leaderboard from public, anon, authenticated;

create function public.orbital_top_players() returns table(display_name text, first_name text, last_name text, xp integer, updated_at timestamptz)
language sql stable security definer set search_path = pg_catalog, pg_temp as $$
  select l.display_name, l.first_name, l.last_name, l.xp, l.updated_at from public.orbital_leaderboard l
  order by l.xp desc, l.updated_at asc, l.user_id asc limit 10
$$;

create function public.orbital_publish_score() returns void
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare saved jsonb; player jsonb; score_text text; score integer; clean_name text; first_name text; last_name text; profile jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select raw_user_meta_data into profile from auth.users where id=auth.uid();
  clean_name := btrim(profile->>'username');
  first_name := btrim(profile->>'first_name');
  last_name := btrim(profile->>'last_name');
  if clean_name is null or char_length(clean_name) < 1 or char_length(clean_name) > 48 or clean_name ~ '[[:cntrl:]]' then
    raise exception 'Display name must be between 1 and 48 characters';
  end if;
  if first_name is null or last_name is null or char_length(first_name) not between 1 and 48 or char_length(last_name) not between 1 and 48 or first_name ~ '[[:space:][:cntrl:]]' or last_name ~ '[[:space:][:cntrl:]]' then
    raise exception 'Set your first name and first surname in your account';
  end if;
  select snapshot into saved from public.orbital_campaigns where user_id=auth.uid();
  if saved is null or jsonb_typeof(saved->'items'->'orbital-command-player') <> 'string' then raise exception 'Save your campaign before publishing'; end if;
  begin
    player := (saved->'items'->>'orbital-command-player')::jsonb;
  exception when invalid_text_representation then raise exception 'Invalid player progress'; end;
  score_text := player->>'xp';
  if score_text is null or score_text !~ '^[0-9]{1,7}$' then raise exception 'Invalid player score'; end if;
  score := score_text::integer;
  if score > 1000000 then raise exception 'Player score exceeds the limit'; end if;
  insert into public.orbital_leaderboard(user_id,display_name,first_name,last_name,xp) values(auth.uid(),clean_name,first_name,last_name,score)
  on conflict (user_id) do update set display_name=excluded.display_name,first_name=excluded.first_name,last_name=excluded.last_name,xp=excluded.xp,updated_at=now();
end $$;
create function public.orbital_remove_score() returns void
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.orbital_leaderboard where user_id=auth.uid();
end $$;
revoke all on function public.orbital_top_players(), public.orbital_publish_score(), public.orbital_remove_score() from public, anon, authenticated;
grant execute on function public.orbital_top_players() to anon, authenticated;
grant execute on function public.orbital_publish_score(), public.orbital_remove_score() to authenticated;
notify pgrst, 'reload schema';
commit;
