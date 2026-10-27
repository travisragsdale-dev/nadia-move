-- NYC Move: database setup. Safe to run more than once.
-- Everything lives in one "docs" table (collection + id + JSON), readable and writable
-- only by people listed in "members". Add members with:
--   insert into public.members (email, name) values ('someone@example.com', 'Name');

create table if not exists public.members (
  email   text primary key,
  name    text,
  user_id uuid unique
);
alter table public.members enable row level security;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- Called right after sign-in: links the account to its member row, returns it (or null).
create or replace function public.claim_member() returns json
language plpgsql security definer set search_path = public as $$
declare m public.members;
begin
  update public.members set user_id = auth.uid()
    where lower(email) = lower(auth.jwt() ->> 'email') and (user_id is null or user_id = auth.uid())
    returning * into m;
  if m.email is null then return null; end if;
  return json_build_object('email', m.email, 'name', m.name, 'user_id', m.user_id);
end $$;

drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated using (public.is_member());

create table if not exists public.docs (
  coll       text not null,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (coll, id)
);
alter table public.docs enable row level security;
alter table public.docs replica identity full;

drop policy if exists docs_rw on public.docs;
create policy docs_rw on public.docs for all to authenticated
  using (public.is_member()) with check (public.is_member());

create or replace function public.jsonb_deep_merge(a jsonb, b jsonb) returns jsonb
language plpgsql immutable as $$
declare k text; v jsonb; out jsonb;
begin
  if a is null or jsonb_typeof(a) <> 'object' or jsonb_typeof(b) <> 'object' then return b; end if;
  out := a;
  for k, v in select * from jsonb_each(b) loop
    out := jsonb_set(out, array[k], public.jsonb_deep_merge(out -> k, v), true);
  end loop;
  return out;
end $$;

-- Merge a partial change into one document (creates it if missing). Runs as the caller, so RLS applies.
create or replace function public.doc_merge(p_coll text, p_id text, p_patch jsonb) returns jsonb
language sql security invoker set search_path = public as $$
  insert into public.docs as d (coll, id, data, updated_by) values (p_coll, p_id, p_patch, auth.uid())
  on conflict (coll, id) do update
    set data = public.jsonb_deep_merge(d.data, excluded.data), updated_at = now(), updated_by = auth.uid()
  returning data;
$$;

grant select on public.members to authenticated;
grant select, insert, update, delete on public.docs to authenticated;
grant execute on function public.is_member, public.claim_member, public.doc_merge, public.jsonb_deep_merge to authenticated;
revoke all on public.docs, public.members from anon;

-- Live updates
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;
