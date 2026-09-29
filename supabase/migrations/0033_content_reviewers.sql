-- 0033: reviewing content is a capability, not a role.
--
-- THE COLLISION. `may_review_content()` has granted quiz-card and practice-
-- question approval to anyone whose `profiles.role` is 'mentor', because a CFI
-- reviewer was the only thing 'mentor' meant. The mentorship hub makes 'mentor'
-- mean a working pilot who volunteers in a classroom — so every volunteer would
-- silently gain the power to approve safety content. Nobody has that role today
-- (checked Sep 29 2026), which is why this is cheap to fix now and expensive
-- after the first volunteer signs up.
--
-- WHY NOT JUST RENAME THE ROLE. Because a single-valued enum cannot say "both",
-- and both is the likely case: a CFI who visits classrooms and also reviews
-- questions is one person with two capabilities. Renaming would force a choice
-- between them. This is the same reasoning already written into 0007 — "is a
-- guardian" is not a useful fact, "is guardian of this student" is — and the
-- reason org roles live in organization_members rather than on profiles.
--
-- So reviewing moves out of `profiles.role` entirely, and 'mentor' is left free
-- for the hub to mean what it says.
--
-- THE TABLE IS ITS OWN RECORD. Grants are never deleted and revocation sets
-- `revoked_at` on the row, which is exactly how `consent` works — a separate
-- revocation row would deactivate nothing. Granting the power to approve safety
-- content is the most consequential thing one account can do to another, so who
-- granted it, to whom, and when survives both accounts.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create table public.content_reviewers (
  id bigint generated always as identity primary key,

  -- No foreign keys to auth.users, and emails copied in: the record has to
  -- outlive both accounts, and an id alone identifies nobody once an account is
  -- deleted. Same reasoning as 0019 and 0031.
  user_id uuid not null,
  user_email text,

  granted_by uuid not null,
  granted_by_email text,
  granted_at timestamptz not null default now(),

  revoked_at timestamptz,
  revoked_by uuid,

  note text,

  constraint content_reviewers_revoked_together
    check ((revoked_at is null) = (revoked_by is null))
);

comment on table public.content_reviewers is
  'Who may approve quiz cards and practice questions. A capability, not a role, because one person can be both a content reviewer and a pilot mentor. Rows are never deleted; revocation sets revoked_at.';

-- At most one live grant per person. A revoked grant does not collide, so access
-- can be given again later without erasing that it was once taken away.
create unique index content_reviewers_one_live
  on public.content_reviewers (user_id) where revoked_at is null;

alter table public.content_reviewers enable row level security;
revoke all on public.content_reviewers from anon, authenticated;

-- ---------------------------------------------------------------
-- Rows cannot be removed, and only a revocation may change one.
-- Binds the service role too — a record the application can erase is not one.
-- ---------------------------------------------------------------

create or replace function public.protect_content_reviewers()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'content_reviewers is a permanent record: rows cannot be deleted. Revoke instead.';
  end if;

  if old.revoked_at is not null then
    raise exception 'That grant was already revoked on %. Grant a new one instead of rewriting this row.', old.revoked_at;
  end if;

  if new.user_id is distinct from old.user_id
     or new.granted_by is distinct from old.granted_by
     or new.granted_at is distinct from old.granted_at then
    raise exception 'Only a revocation may change a content_reviewers row.';
  end if;

  return new;
end;
$$;

create trigger protect_content_reviewers_delete
  before delete on public.content_reviewers
  for each row execute function public.protect_content_reviewers();

create trigger protect_content_reviewers_update
  before update on public.content_reviewers
  for each row execute function public.protect_content_reviewers();

-- ---------------------------------------------------------------
-- Carry over anyone who is a reviewer today.
--
-- Expected to move zero rows: no account holds 'mentor'. It exists so that if
-- one does, access is not silently withdrawn by this migration — which would be
-- a CFI's queue disappearing with no explanation.
-- ---------------------------------------------------------------

insert into public.content_reviewers (user_id, user_email, granted_by, granted_by_email, note)
select
  p.id,
  p.email,
  p.id,
  p.email,
  'Carried over from profiles.role = mentor by migration 0033.'
from public.profiles p
where p.role = 'mentor';

-- Their role goes back to student. Reviewing no longer lives there, and leaving
-- 'mentor' on the row would suggest it still does.
update public.profiles set role = 'student' where role = 'mentor';

-- ---------------------------------------------------------------
-- Who may review, now.
--
-- An administrator always may: they can grant the capability, so withholding it
-- from them would be theatre. Everyone else needs a live grant.
-- ---------------------------------------------------------------

create or replace function public.may_review_content()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) or exists (
    select 1 from public.content_reviewers
    where user_id = auth.uid() and revoked_at is null
  );
$$;

comment on function public.may_review_content() is
  'Admins, plus anyone holding a live grant in content_reviewers. Deliberately no longer reads profiles.role = mentor — 0033 moved reviewing out of the role so that mentor can mean a pilot who visits classrooms.';

-- ---------------------------------------------------------------
-- Granting and revoking.
--
-- Replaces set_reviewer_role, which set profiles.role to 'mentor'. That function
-- is dropped rather than left in place: after this migration it would look like
-- it granted review access and would not, which is the worst kind of leftover.
-- ---------------------------------------------------------------

drop function if exists public.set_reviewer_role(text, text);

create or replace function public.set_content_reviewer(
  p_email text,
  p_may_review boolean
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
  v_subject_role  public.user_role;
  v_live        bigint;
begin
  if not public.may_administer() then
    raise exception 'Only an administrator can change who may review content.';
  end if;

  select p.id, p.email, p.role
    into v_subject, v_subject_email, v_subject_role
  from public.profiles p
  where lower(p.email) = lower(trim(coalesce(p_email, '')));

  if not found then
    raise exception 'No account with that email has finished signing up yet.';
  end if;

  select p.email into v_actor_email from public.profiles p where p.id = v_actor;

  select cr.id into v_live
  from public.content_reviewers cr
  where cr.user_id = v_subject and cr.revoked_at is null;

  if p_may_review then
    if v_subject_role = 'admin' then
      return format('%s is an administrator and can already review.', v_subject_email);
    end if;

    if v_live is not null then
      return format('%s can already review.', v_subject_email);
    end if;

    insert into public.content_reviewers
      (user_id, user_email, granted_by, granted_by_email)
    values
      (v_subject, v_subject_email, v_actor, v_actor_email);

    return format('%s can now review cards and questions.', v_subject_email);
  end if;

  if v_subject_role = 'admin' then
    raise exception 'That account is an administrator, so it can review regardless. Change the role in the SQL Editor, where it is visible.';
  end if;

  if v_live is null then
    return format('%s could not review anyway.', v_subject_email);
  end if;

  update public.content_reviewers
  set revoked_at = now(), revoked_by = v_actor
  where id = v_live;

  return format('%s can no longer review.', v_subject_email);
end;
$$;

revoke all on function public.set_content_reviewer(text, boolean) from public, anon;
grant execute on function public.set_content_reviewer(text, boolean) to authenticated;

comment on function public.set_content_reviewer(text, boolean) is
  'Grants or revokes the content-reviewing capability by email. Admins only. Every grant and revocation stays on the row in content_reviewers.';

-- ---------------------------------------------------------------
-- Report. Expect table true, rls_on true, function true,
-- old_function false, mentors_remaining 0.
-- ---------------------------------------------------------------

select
  to_regclass('public.content_reviewers') is not null as table_exists,
  (select relrowsecurity from pg_class where oid = 'public.content_reviewers'::regclass) as rls_on,
  to_regprocedure('public.set_content_reviewer(text,boolean)') is not null as new_function,
  to_regprocedure('public.set_reviewer_role(text,text)') is not null as old_function_still_there,
  (select count(*) from public.profiles where role = 'mentor') as mentors_remaining,
  (select count(*) from public.content_reviewers where revoked_at is null) as live_grants;
