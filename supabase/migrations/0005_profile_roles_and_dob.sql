-- 0005: role + date_of_birth on profiles, with self-assignment blocked.
--
-- NOTE: the contents of this migration were applied directly to the
-- production database via the Supabase SQL Editor on 2026-08-31 before
-- this file existed. Every statement below is written to be safe to
-- re-run, so applying it to prod is a no-op and applying it to a fresh
-- database reproduces prod exactly.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('student', 'mentor', 'school_admin', 'admin');
  end if;
end $$;

alter table public.profiles
  add column if not exists role public.user_role not null default 'student',
  add column if not exists date_of_birth date;

-- RLS restricts rows, not columns. Column grants are what stop a student
-- from PATCHing their own role to 'admin'.
revoke update on public.profiles from authenticated, anon;

grant update (email, display_name, first_name, date_of_birth, updated_at)
  on public.profiles to authenticated;

create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if new.date_of_birth is not null then
    if new.date_of_birth >= current_date then
      raise exception 'date_of_birth must be in the past';
    end if;
    if new.date_of_birth < date '1900-01-01' then
      raise exception 'date_of_birth is not a plausible date';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and current_user = 'authenticated'
     and old.date_of_birth is not null
     and new.date_of_birth is distinct from old.date_of_birth then
    raise exception 'date_of_birth cannot be changed once set';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_columns on public.profiles;
create trigger guard_profile_columns
  before insert or update on public.profiles
  for each row
  execute function public.guard_profile_columns();

comment on column public.profiles.role is
  'Global role. Not writable by the account holder (see column grants). Org-scoped roles live in organization_members.';
comment on column public.profiles.date_of_birth is
  'Nullable because production already had users. Age gate enforced at signup; existing accounts backfilled via prompt.';