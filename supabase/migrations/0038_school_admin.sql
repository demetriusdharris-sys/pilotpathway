-- 0038: schools and their staff, without a SQL paste.
--
-- Creating a school and adding a teacher have been hand-written INSERTs since
-- 0006. That was survivable for one school and is the bottleneck at the third —
-- and it is now the last thing standing between the founder and running the
-- classroom visit programme without a Claude session open.
--
-- AN ORG_ADMIN ADDS THEIR OWN STAFF. An administrator creates the school and
-- names one person who runs it; that person adds their own teachers. Anything
-- less just moves the bottleneck from a SQL editor to a form the founder still
-- has to fill in.
--
-- A SCHOOL CANNOT REGISTER ITSELF, and that is the point. Staff of a school can
-- eventually see the progress of students who consent to share with them, so
-- "is this a real school" is a judgement someone has to make. An administrator
-- creating the row is where that judgement lives.
--
-- WHY REMOVAL IS A HARD DELETE. A soft delete would mean every existing gate —
-- is_staff_of, shares_org_with, staff_may_see_progress, and the policies in 0006
-- and 0021 — had to learn to exclude removed rows, and a gate that forgets makes
-- a removed teacher keep access to a minor's progress. Deleting the row ends
-- access immediately, which is the safe direction. History is kept separately
-- below, so nothing is lost by taking the safe one.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

-- ---------------------------------------------------------------
-- What happened to memberships, kept apart from the memberships themselves.
--
-- Staff access is how a teacher eventually reads a student's mastery, so who
-- granted it and who took it away should not rest on anybody's memory. Same
-- reasoning as 0019, 0031 and 0033 — and no foreign keys to auth.users, because
-- the record has to outlive both accounts.
-- ---------------------------------------------------------------

create table public.organization_member_changes (
  id bigint generated always as identity primary key,

  organization_id uuid not null,
  organization_name text,

  subject_user_id uuid not null,
  subject_email text,

  actor_user_id uuid not null,
  actor_email text,

  action text not null check (action in ('added', 'role_changed', 'removed')),
  from_role text,
  to_role text,

  happened_at timestamptz not null default now()
);

comment on table public.organization_member_changes is
  'Permanent record of who was added to a school, whose role changed, and who was removed. Rows cannot be deleted or altered, including by the service role.';

alter table public.organization_member_changes enable row level security;
revoke all on public.organization_member_changes from anon, authenticated;

create or replace function public.protect_member_changes()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  raise exception 'organization_member_changes is a permanent record: rows cannot be % once written.',
    lower(tg_op);
end;
$$;

create trigger protect_member_changes_delete
  before delete on public.organization_member_changes
  for each row execute function public.protect_member_changes();

create trigger protect_member_changes_update
  before update on public.organization_member_changes
  for each row execute function public.protect_member_changes();

-- ---------------------------------------------------------------
-- May the caller manage this organisation's people?
-- ---------------------------------------------------------------

create or replace function public.may_manage_organization(org uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select public.may_administer() or exists (
    select 1 from public.organization_members
    where organization_id = org
      and user_id = auth.uid()
      and org_role = 'org_admin'
  );
$$;

comment on function public.may_manage_organization(uuid) is
  'An administrator, or the org_admin of that organisation. Staff cannot add staff — that would let anyone with a classroom login widen who sees student progress.';

-- ---------------------------------------------------------------
-- An administrator creates a school and names who runs it.
-- ---------------------------------------------------------------

create or replace function public.create_organization(
  p_name text,
  p_org_type text,
  p_admin_email text default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid;
  v_admin uuid;
  v_admin_email text;
  v_actor_email text;
begin
  if not public.may_administer() then
    raise exception 'Only an administrator can create a school. A school cannot register itself.';
  end if;

  if coalesce(btrim(p_name), '') = '' then
    raise exception 'Give the school a name.';
  end if;

  if p_org_type not in ('district', 'school', 'sponsor', 'flight_school') then
    raise exception 'Unknown kind of organisation: %', p_org_type;
  end if;

  insert into public.organizations (name, org_type)
  values (btrim(p_name), p_org_type)
  returning id into v_id;

  if coalesce(btrim(coalesce(p_admin_email, '')), '') <> '' then
    select p.id, p.email into v_admin, v_admin_email
    from public.profiles p
    where lower(p.email) = lower(btrim(p_admin_email));

    if not found then
      raise exception 'No account with that email has finished signing up yet, so nobody can be put in charge of % — create the school without one and add them later.', btrim(p_name);
    end if;

    insert into public.organization_members (organization_id, user_id, org_role)
    values (v_id, v_admin, 'org_admin');

    select p.email into v_actor_email from public.profiles p where p.id = auth.uid();

    insert into public.organization_member_changes
      (organization_id, organization_name, subject_user_id, subject_email,
       actor_user_id, actor_email, action, to_role)
    values
      (v_id, btrim(p_name), v_admin, v_admin_email,
       auth.uid(), v_actor_email, 'added', 'org_admin');
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------
-- Adding somebody, or changing their role.
-- ---------------------------------------------------------------

create or replace function public.set_organization_member(
  p_organization_id uuid,
  p_email text,
  p_org_role text
)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_org_name text;
  v_subject uuid;
  v_subject_email text;
  v_existing text;
  v_actor_email text;
begin
  if not public.may_manage_organization(p_organization_id) then
    raise exception 'Only an administrator or whoever runs that school can add people to it.';
  end if;

  if p_org_role not in ('member', 'staff', 'org_admin') then
    raise exception 'Unknown role: %', p_org_role;
  end if;

  select name into v_org_name from public.organizations where id = p_organization_id;

  if not found then
    raise exception 'No such organisation.';
  end if;

  select p.id, p.email into v_subject, v_subject_email
  from public.profiles p
  where lower(p.email) = lower(btrim(coalesce(p_email, '')));

  if not found then
    raise exception 'No account with that email has finished signing up yet. Ask them to sign up first.';
  end if;

  -- Nobody changes their own role here. Demoting yourself out of org_admin by
  -- misclick locks you out of your own school, which is a support problem with
  -- no upside — the same reasoning as 0031.
  if v_subject = auth.uid() then
    raise exception 'You cannot change your own role in your own school.';
  end if;

  select org_role into v_existing
  from public.organization_members
  where organization_id = p_organization_id and user_id = v_subject;

  if v_existing = p_org_role then
    return format('%s is already %s.', v_subject_email, p_org_role);
  end if;

  select p.email into v_actor_email from public.profiles p where p.id = auth.uid();

  insert into public.organization_members (organization_id, user_id, org_role)
  values (p_organization_id, v_subject, p_org_role)
  on conflict (organization_id, user_id) do update set org_role = excluded.org_role;

  insert into public.organization_member_changes
    (organization_id, organization_name, subject_user_id, subject_email,
     actor_user_id, actor_email, action, from_role, to_role)
  values
    (p_organization_id, v_org_name, v_subject, v_subject_email,
     auth.uid(), v_actor_email,
     case when v_existing is null then 'added' else 'role_changed' end,
     v_existing, p_org_role);

  return format(
    '%s is %s at %s.',
    v_subject_email,
    case p_org_role
      when 'org_admin' then 'now running things'
      when 'staff' then 'now staff'
      else 'now enrolled'
    end,
    v_org_name
  );
end;
$$;

-- ---------------------------------------------------------------
-- Removing somebody. Access ends immediately.
-- ---------------------------------------------------------------

create or replace function public.remove_organization_member(
  p_organization_id uuid,
  p_email text
)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_org_name text;
  v_subject uuid;
  v_subject_email text;
  v_existing text;
  v_actor_email text;
begin
  if not public.may_manage_organization(p_organization_id) then
    raise exception 'Only an administrator or whoever runs that school can remove people from it.';
  end if;

  select name into v_org_name from public.organizations where id = p_organization_id;

  if not found then
    raise exception 'No such organisation.';
  end if;

  select p.id, p.email into v_subject, v_subject_email
  from public.profiles p
  where lower(p.email) = lower(btrim(coalesce(p_email, '')));

  if not found then
    raise exception 'No account with that email.';
  end if;

  if v_subject = auth.uid() then
    raise exception 'You cannot remove yourself from your own school.';
  end if;

  select org_role into v_existing
  from public.organization_members
  where organization_id = p_organization_id and user_id = v_subject;

  if not found then
    return format('%s was not at %s.', v_subject_email, v_org_name);
  end if;

  select p.email into v_actor_email from public.profiles p where p.id = auth.uid();

  delete from public.organization_members
  where organization_id = p_organization_id and user_id = v_subject;

  insert into public.organization_member_changes
    (organization_id, organization_name, subject_user_id, subject_email,
     actor_user_id, actor_email, action, from_role)
  values
    (p_organization_id, v_org_name, v_subject, v_subject_email,
     auth.uid(), v_actor_email, 'removed', v_existing);

  return format('%s is no longer at %s.', v_subject_email, v_org_name);
end;
$$;

-- ---------------------------------------------------------------
-- Grants. Every function checks the caller.
-- ---------------------------------------------------------------

revoke all on function public.create_organization(text, text, text) from public, anon;
revoke all on function public.set_organization_member(uuid, text, text) from public, anon;
revoke all on function public.remove_organization_member(uuid, text) from public, anon;

grant execute on function public.create_organization(text, text, text) to authenticated;
grant execute on function public.set_organization_member(uuid, text, text) to authenticated;
grant execute on function public.remove_organization_member(uuid, text) to authenticated;

-- ---------------------------------------------------------------
-- An org_admin needs to read their own organisation's memberships to see who is
-- there. 0006 grants that only through policies that answer other questions, so
-- say it directly.
-- ---------------------------------------------------------------

create policy "Whoever runs an organisation reads its members"
  on public.organization_members for select to authenticated
  using (public.may_manage_organization(organization_id));

-- ---------------------------------------------------------------
-- Report. Expect audit table true, 3 functions, gate true, 0 changes.
-- ---------------------------------------------------------------

select
  to_regclass('public.organization_member_changes') is not null as audit_table,
  (
    (to_regprocedure('public.create_organization(text,text,text)') is not null)::int +
    (to_regprocedure('public.set_organization_member(uuid,text,text)') is not null)::int +
    (to_regprocedure('public.remove_organization_member(uuid,text)') is not null)::int
  ) as functions_created,
  to_regprocedure('public.may_manage_organization(uuid)') is not null as manage_gate,
  (select count(*) from public.organization_member_changes) as changes_recorded,
  (select count(*) from public.organizations) as organizations;
