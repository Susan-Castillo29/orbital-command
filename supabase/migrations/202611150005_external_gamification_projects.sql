-- Project contexts and read-only share links for ORBITAL GAMIFICATION API v1.
-- Apply with the Supabase SQL editor or `supabase db push` from a trusted machine.
begin;

create table if not exists public.orbital_external_projects (
  id uuid primary key default gen_random_uuid(),
  owner_key_hash text not null check (char_length(owner_key_hash) = 64),
  name text not null check (char_length(name) between 1 and 120),
  team_name text not null check (char_length(team_name) between 1 and 120),
  description text not null check (char_length(description) between 25 and 5000),
  problem text not null check (char_length(problem) between 1 and 3000),
  objectives jsonb not null check (jsonb_typeof(objectives) = 'array' and jsonb_array_length(objectives) between 1 and 8),
  audience text not null check (char_length(audience) between 1 and 200),
  topic text not null check (char_length(topic) between 1 and 120),
  learning_goals text not null check (char_length(learning_goals) between 1 and 2000),
  source_text text check (source_text is null or char_length(source_text) <= 65536),
  visibility text not null default 'private' check (visibility in ('private', 'public', 'unlisted')),
  proposal jsonb not null check (jsonb_typeof(proposal) = 'object'),
  share_token_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((visibility = 'unlisted' and share_token_hash is not null) or (visibility <> 'unlisted' and share_token_hash is null))
);

create index if not exists orbital_external_projects_public_idx
  on public.orbital_external_projects (created_at desc) where visibility = 'public';
create index if not exists orbital_external_projects_owner_idx
  on public.orbital_external_projects (owner_key_hash, created_at desc);

alter table public.orbital_external_projects enable row level security;
revoke all on public.orbital_external_projects from anon, authenticated;
grant select, insert, update, delete on public.orbital_external_projects to service_role;

comment on table public.orbital_external_projects is
  'External education/science project contexts. Access only through the trusted ORBITAL API backend; never expose service role credentials in the browser.';
comment on column public.orbital_external_projects.share_token_hash is
  'SHA-256 hash of a random read-only preview token. Raw token is returned once and never stored.';

commit;
