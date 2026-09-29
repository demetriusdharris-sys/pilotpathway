-- 0039: a teacher sets up their own school, and verification gates what matters.
--
-- 0038 made an administrator create every school, on the reasoning that school
-- staff can eventually read the progress of students who consent to share with
-- them. That reasoning was right about the risk and wrong about where to put the
-- gate: it made the founder a bottleneck on a teacher who just wants a pilot to
-- visit, which is the one thing a school can do that touches no student at all.
--
-- SO THE GATE MOVES FROM CREATION TO WHAT A SCHOOL CAN DO.
--
--   * Anyone signed in may create their school. It arrives unverified.
--   * An unverified school may ask for a classroom visit. A visit knows a school,
--     a teacher, a pilot, a date and a headcount — never a student. There is
--     nothing here to protect.
--   * An unverified school may NOT enrol students. That is the only route to a
--     student's progress, and it stays behind a human judgement.
--   * A visit cannot be CONFIRMED until the school is verified, mirroring the
--     pilot rule from 0036 exactly. Both sides are checked before anybody
--     travels or gives up an afternoon.
--
-- WHY ENROLMENT IS THE THING TO GATE. Staff see a student only if that student
-- consents to `school_progress` naming that organisation, and only if the student
-- is enrolled there. A fake school with a fake teacher therefore reaches nobody
-- — unless it can enrol a real student by email and then rely on that student
-- clicking share out of confusion. Gating enrolment closes that path, and it is
-- the only path there was.
--
-- ONE UNVERIFIED SCHOOL PER PERSON. Otherwise the form is a way to fill the table.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

alter table public.organizations
  add column created_by uuid,
  add column self_registered boolean not null default false,
  add column verified_at timestamptz,
  add column verified_by text,
  add column verification_note text;

comment on column public.organizations.verified_at is
  'When somebody confirmed this is a real school. Until then it may ask for a visit but not enrol a student, and no visit of its may be confirmed.';

-- Everything that exists now was created by an administrator, so it is verified
-- by definition — a person made that judgement when they wrote the INSERT.
update public.organizations
set verified_at = created_at,
    verified_by = 'Created by an administrator before 0039'
where verified_at is null;

create index organizations_unverified_idx
  on public.organizations (created_at desc) where verified_at is null;

create or replace function public.organization_is_verified(org uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.organizations
    where id = org and verified_at is not null
  );
$$;

-- ---------------------------------------------------------------
-- Creating one. Open to anyone signed in; an administrator's is verified on
-- the spot, because their creating it *is* the judgement.
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
  v_is_admin boolean := public.may_administer();
  v_admin uuid;
  v_admin_email text;
  v_actor_email text;
begin
  if auth.uid() is null then
    raise exception 'Log in first.';
  end if;

  if coalesce(btrim(p_name), '') = '' then
    raise exception 'Give the school a name.';
  end if;

  if p_org_type not in ('district', 'school', 'sponsor', 'flight_school') then
    raise exception 'Unknown kind of organisation: %', p_org_type;
  end if;

  -- One at a time, for anyone who is not an administrator. A form that can be
  -- run in a loop is a way to fill the table.
  if not v_is_admin and exists (
    select 1 from public.organizations
    where created_by = auth.uid() and verified_at is null
  ) then
    raise exception 'You already set up a school that is waiting to be checked. We will look at that one first.';
  end if;

  select p.email into v_actor_email from public.profiles p where p.id = auth.uid();

  insert into public.organizations
    (name, org_type, created_by, self_registered, verified_at, verified_by)
  values (
    btrim(p_name), p_org_type, auth.uid(), not v_is_admin,
    case when v_is_admin then now() else null end,
    case when v_is_admin then coalesce(v_actor_email, 'an administrator') else null end
  )
  returning id into v_id;

  -- Whoever set it up runs it. An administrator may hand it to somebody else;
  -- anyone else gets it themselves, because creating a school and giving it away
  -- is not a thing a teacher needs to do and is a thing an impostor would.
  if v_is_admin and coalesce(btrim(coalesce(p_admin_email, '')), '') <> '' then
    select p.id, p.email into v_admin, v_admin_email
    from public.profiles p
    where lower(p.email) = lower(btrim(p_admin_email));

    if not found then
      raise exception 'No account with that email has finished signing up yet. Create the school without one and add them later.';
    end if;
  else
    v_admin := auth.uid();
    v_admin_email := v_actor_email;
  end if;

  insert into public.organization_members (organization_id, user_id, org_role)
  values (v_id, v_admin, 'org_admin');

  insert into public.organization_member_changes
    (organization_id, organization_name, subject_user_id, subject_email,
     actor_user_id, actor_email, action, to_role)
  values
    (v_id, btrim(p_name), v_admin, v_admin_email,
     auth.uid(), v_actor_email, 'added', 'org_admin');

  return v_id;
end;
$$;

-- ---------------------------------------------------------------
-- Verifying one. Still an administrator's judgement — it is the whole point.
-- ---------------------------------------------------------------

create or replace function public.verify_organization(
  p_organization_id uuid,
  p_verified_by text,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_name text;
begin
  if not public.may_administer() then
    raise exception 'Only an administrator can confirm a school is real.';
  end if;

  if coalesce(btrim(coalesce(p_verified_by, '')), '') = '' then
    raise exception 'Say who checked it. A verification nobody signed is not a verification.';
  end if;

  select name into v_name from public.organizations where id = p_organization_id;

  if not found then
    raise exception 'No such organisation.';
  end if;

  update public.organizations
  set verified_at = now(),
      verified_by = btrim(p_verified_by),
      verification_note = nullif(btrim(coalesce(p_note, '')), '')
  where id = p_organization_id;

  return format('%s is confirmed.', v_name);
end;
$$;

create or replace function public.unverify_organization(
  p_organization_id uuid,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_name text;
begin
  if not public.may_administer() then
    raise exception 'Only an administrator can withdraw a school.';
  end if;

  select name into v_name from public.organizations where id = p_organization_id;

  if not found then
    raise exception 'No such organisation.';
  end if;

  update public.organizations
  set verified_at = null,
      verified_by = null,
      verification_note = nullif(btrim(coalesce(p_note, '')), '')
  where id = p_organization_id;

  -- Deliberately does not remove anyone or cancel anything. Withdrawing a school
  -- stops it enrolling and stops new visits being confirmed; unpicking what
  -- already happened is a decision a person should make case by case.
  return format('%s is no longer confirmed. Existing staff and visits are untouched.', v_name);
end;
$$;

-- ---------------------------------------------------------------
-- Enrolment is what verification gates.
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

  -- THE GATE. Enrolling a student is the only route to a student's progress, and
  -- it waits until somebody has confirmed the school is real. Staff can be added
  -- straight away, because staff of a school with no students see nothing.
  if p_org_role = 'member' and not public.organization_is_verified(p_organization_id) then
    raise exception 'Students cannot be enrolled at % until we have confirmed it is a real school. You can still ask for a classroom visit in the meantime.', v_org_name;
  end if;

  select p.id, p.email into v_subject, v_subject_email
  from public.profiles p
  where lower(p.email) = lower(btrim(coalesce(p_email, '')));

  if not found then
    raise exception 'No account with that email has finished signing up yet. Ask them to sign up first.';
  end if;

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
-- A visit cannot be confirmed by an unverified school.
--
-- Symmetric with the pilot gate in 0036: both sides are checked before anybody
-- travels. Said in the function so the message explains itself, and in a trigger
-- so no later code path can route around it.
-- ---------------------------------------------------------------

create or replace function public.enforce_visit_school_verified()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if new.status in ('confirmed', 'completed')
     and not public.organization_is_verified(new.organization_id) then
    raise exception
      'That school has not been confirmed yet. A pilot should not give up an afternoon for a school nobody has checked.';
  end if;

  return new;
end;
$$;

create trigger enforce_visit_school_verified_ins
  before insert on public.classroom_visits
  for each row execute function public.enforce_visit_school_verified();

create trigger enforce_visit_school_verified_upd
  before update on public.classroom_visits
  for each row execute function public.enforce_visit_school_verified();

create or replace function public.confirm_classroom_visit(
  p_visit_id uuid,
  p_pilot uuid,
  p_when timestamptz
)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_org uuid;
  v_status text;
  v_name text;
  v_org_name text;
begin
  select v.organization_id, v.status, o.name
    into v_org, v_status, v_org_name
  from public.classroom_visits v
  join public.organizations o on o.id = v.organization_id
  where v.id = p_visit_id;

  if not found then
    raise exception 'No such visit.';
  end if;

  if not public.is_staff_of(v_org) then
    raise exception 'Only staff of that school can confirm a visit.';
  end if;

  if v_status <> 'open' then
    raise exception 'That visit is not open.';
  end if;

  if not public.organization_is_verified(v_org) then
    raise exception 'We have not confirmed % is a real school yet. A pilot should not give up an afternoon before that is settled — it is usually quick.', v_org_name;
  end if;

  if not exists (
    select 1 from public.visit_volunteers
    where visit_id = p_visit_id and pilot_user_id = p_pilot and withdrawn_at is null
  ) then
    raise exception 'That pilot has not offered for this visit.';
  end if;

  select display_name into v_name
  from public.pilot_profiles
  where user_id = p_pilot and vetting_status = 'verified';

  if not found then
    raise exception 'That pilot has not been cleared for a classroom yet.';
  end if;

  update public.classroom_visits
  set status = 'confirmed', pilot_user_id = p_pilot, confirmed_for = p_when, updated_at = now()
  where id = p_visit_id;

  return format('%s is confirmed.', v_name);
end;
$$;

-- ---------------------------------------------------------------
-- Grants.
-- ---------------------------------------------------------------

revoke all on function public.verify_organization(uuid, text, text) from public, anon;
revoke all on function public.unverify_organization(uuid, text) from public, anon;
grant execute on function public.verify_organization(uuid, text, text) to authenticated;
grant execute on function public.unverify_organization(uuid, text) to authenticated;

-- ---------------------------------------------------------------
-- Report. Expect the columns, both gates, and every existing organisation
-- verified — they were all created by an administrator.
-- ---------------------------------------------------------------

select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organizations'
      and column_name = 'verified_at'
  ) as verification_columns,
  to_regprocedure('public.organization_is_verified(uuid)') is not null as verified_gate,
  to_regprocedure('public.verify_organization(uuid,text,text)') is not null as verify_function,
  (select count(*) from public.organizations where verified_at is null) as unverified_should_be_zero,
  (select count(*) from public.organizations) as organizations;
