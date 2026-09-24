-- 0031: granting reviewer access from the app, with a permanent record.
--
-- Until now, making a CFI a reviewer was a hand-written UPDATE in the SQL
-- Editor, which meant the founder could not onboard anyone without a Claude
-- session open. A reviewer who replies on a Saturday should not wait for that.
--
-- WHAT THIS DELIBERATELY CANNOT DO.
--
--   * It cannot create an `admin`. Only 'student' and 'mentor' are settable
--     here, so a compromised admin session cannot mint more of itself, and the
--     one role that can grant roles stays a visible hand-written statement.
--   * It cannot change an existing admin's role, so nobody can be locked out
--     of their own project through the UI.
--   * It cannot change the caller's own role. Self-demotion by misclick is a
--     support problem with no upside.
--   * It cannot touch `school_admin`. Nothing grants that yet, and inventing
--     the UI for it before the organisation screens exist would be guessing.
--
-- `role` STAYS OUTSIDE THE PROFILE WRITE ALLOWLIST. This does not grant update
-- on the column to anyone: the function is SECURITY DEFINER and checks the
-- caller first. 0005's column grant is still what stops a student PATCHing
-- their own role, and that has not moved.
--
-- WHY THE RECORD. Granting someone the power to approve safety content is the
-- most consequential thing this app lets one person do to another account. Who
-- granted it, to whom, and when should not rest on anybody's memory — the same
-- reasoning as 0019, and the same protections.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create table public.role_grants (
  id bigint generated always as identity primary key,

  -- Emails are copied in, not joined to. An id alone identifies nobody once an
  -- account is deleted, and this record has to outlive both accounts — so no
  -- foreign keys to auth.users, for 0019's reason.
  actor_user_id uuid not null,
  actor_email text,
  subject_user_id uuid not null,
  subject_email text,

  from_role public.user_role not null,
  to_role public.user_role not null,

  granted_at timestamptz not null default now(),

  constraint role_grants_actually_changed check (from_role <> to_role)
);

comment on table public.role_grants is
  'Permanent record of every role change made through the app. Rows cannot be deleted or altered, including by the service role. Nothing in the app reads this — read it in the SQL Editor.';

alter table public.role_grants enable row level security;

-- RLS on, no policies, no grants: unreachable from any browser, in either
-- direction. Same shape as guardian_actions.
revoke all on public.role_grants from anon, authenticated;

-- ---------------------------------------------------------------
-- Rows cannot be removed or rewritten. Binds the service role too, which is
-- the point — a record that the application's own credentials can erase is not
-- a record.
-- ---------------------------------------------------------------

create or replace function public.protect_role_grants()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  raise exception 'role_grants is a permanent record: rows cannot be % once written.',
    lower(tg_op);
end;
$$;

create trigger protect_role_grants_delete
  before delete on public.role_grants
  for each row execute function public.protect_role_grants();

create trigger protect_role_grants_update
  before update on public.role_grants
  for each row execute function public.protect_role_grants();

-- ---------------------------------------------------------------
-- Who may administer.
-- ---------------------------------------------------------------

create or replace function public.may_administer()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

comment on function public.may_administer() is
  'Admins only. Deliberately narrower than may_review_content(): a mentor reviews content, an admin changes who can.';

-- ---------------------------------------------------------------
-- The one way a role changes through the app.
--
-- Takes an email because that is what a CFI sends you, and because an id is
-- not something the founder has to hand. Matched on lower(email), which is how
-- every other email lookup in this project works.
-- ---------------------------------------------------------------

create or replace function public.set_reviewer_role(
  p_email text,
  p_role text
)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_actor       uuid := auth.uid();
  v_actor_email text;
  v_subject     uuid;
  v_subject_email text;
  v_from        public.user_role;
  v_to          public.user_role;
begin
  if not public.may_administer() then
    raise exception 'Only an administrator can change who may review.';
  end if;

  if p_role not in ('student', 'mentor') then
    raise exception 'This page can only set student or mentor. Anything else is a hand-written statement on purpose.';
  end if;

  v_to := p_role::public.user_role;

  select p.id, p.email, p.role
    into v_subject, v_subject_email, v_from
  from public.profiles p
  where lower(p.email) = lower(trim(coalesce(p_email, '')));

  if not found then
    -- Said plainly rather than vaguely: the usual cause is a reviewer who has
    -- not finished confirming their email, and telling the founder that saves
    -- an exchange. This is an admin-only screen, so it reveals nothing to
    -- anyone who could not already look.
    raise exception 'No account with that email has finished signing up yet.';
  end if;

  if v_subject = v_actor then
    raise exception 'You cannot change your own role here.';
  end if;

  if v_from = 'admin' then
    raise exception 'That account is an administrator. Change an admin in the SQL Editor, where it is visible.';
  end if;

  if v_from = 'school_admin' then
    raise exception 'That account is a school administrator. This page does not touch school roles.';
  end if;

  if v_from = v_to then
    return format('%s is already %s.', v_subject_email, v_to);
  end if;

  select p.email into v_actor_email from public.profiles p where p.id = v_actor;

  update public.profiles set role = v_to where id = v_subject;

  -- Written after the change and in the same transaction: if the insert fails
  -- the role change rolls back with it, so there is no untraced grant.
  insert into public.role_grants
    (actor_user_id, actor_email, subject_user_id, subject_email, from_role, to_role)
  values
    (v_actor, v_actor_email, v_subject, v_subject_email, v_from, v_to);

  return format('%s is now %s.', v_subject_email, v_to);
end;
$$;

revoke all on function public.set_reviewer_role(text, text) from public, anon;
grant execute on function public.set_reviewer_role(text, text) to authenticated;

comment on function public.set_reviewer_role(text, text) is
  'Grants or removes reviewer access by email. Admins only, student/mentor only, never the caller, never an admin, and every change is recorded in role_grants.';

-- ---------------------------------------------------------------
-- Report. Expect all four true and role_grants_rows 0.
-- ---------------------------------------------------------------

select
  to_regclass('public.role_grants') is not null as audit_table,
  to_regprocedure('public.may_administer()') is not null as admin_function,
  to_regprocedure('public.set_reviewer_role(text,text)') is not null as grant_function,
  (select relrowsecurity from pg_class where oid = 'public.role_grants'::regclass) as rls_on,
  (select count(*) from public.role_grants) as role_grants_rows;
