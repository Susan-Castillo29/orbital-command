-- Allow ORBITAL DEVELOPERS projects to be owned by signed-in Supabase users.
-- Existing Node API-key-owned rows keep their owner_key_hash.
begin;

alter table public.orbital_external_projects
  alter column owner_key_hash drop not null;

alter table public.orbital_external_projects
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

alter table public.orbital_external_projects
  add constraint orbital_external_projects_owner_check
  check ((owner_user_id is not null)::integer + (owner_key_hash is not null)::integer = 1);

create index if not exists orbital_external_projects_user_idx
  on public.orbital_external_projects (owner_user_id, created_at desc)
  where owner_user_id is not null;

commit;
