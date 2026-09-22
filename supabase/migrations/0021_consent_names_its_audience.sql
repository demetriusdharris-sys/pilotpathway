-- 0021: staff access must match the organisation the consent named.
--
-- 0006 built consent with an audience: `consent.audience_org_id` records WHO a
-- student agreed to share with. The three policies that let staff read a
-- student's progress never looked at it. They asked two questions —
--
--   * do I share an organisation with this student?   (shares_org_with)
--   * has this student consented to school_progress?  (has_active_consent)
--
-- — and granted access if both were true, without checking that the consent
-- was granted to the organisation doing the reading.
--
-- So a student enrolled in a school and also in a sponsor's cohort, who agreed
-- to share progress with their school, was readable by the sponsor's staff as
-- well. The student did everything right; the check was simply not made.
--
-- Nothing in the app creates organisations or memberships yet, so no student
-- has been exposed. It is fixed now because the teacher view is what would
-- make it reachable, and a consent model that does not honour its own audience
-- is worse than none: it produces a record saying the student agreed.
--
-- `staff_may_see_progress(student)` replaces the pair in all three policies and
-- asks the question once, properly: I am staff of an organisation, that student
-- is a member of that same organisation, and that student's active consent
-- names that organisation.
--
-- `has_active_consent()` stays — it answers "did this person consent to this
-- scope at all", which is the right question for a student's own settings
-- screen — but it must never again be the gate on staff access.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create or replace function public.staff_may_see_progress(student uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1
    from public.organization_members me
    join public.organization_members them
      on them.organization_id = me.organization_id
    join public.consent c
      on c.subject_user_id = student
     and c.scope_key = 'school_progress'
     and c.revoked_at is null
     and (c.expires_at is null or c.expires_at > now())
     and c.audience_org_id = me.organization_id
    where me.user_id = auth.uid()
      and me.org_role in ('staff', 'org_admin')
      and them.user_id = student
  );
$$;

comment on function public.staff_may_see_progress(uuid) is
  'The only gate for staff reading a student''s progress. Requires shared organisation AND active school_progress consent naming that same organisation.';

comment on function public.has_active_consent(uuid, text) is
  'Did this person consent to this scope at all, for anyone. Correct for a student''s own settings screen. NEVER use it to gate staff access — it ignores audience_org_id. Use staff_may_see_progress() for that.';

-- ---------------------------------------------------------------
-- The three policies that gated on the old pair.
-- ---------------------------------------------------------------

drop policy "Students read their own assessments" on public.objective_assessments;

create policy "Students read their own assessments"
  on public.objective_assessments for select to authenticated
  using (
    user_id = auth.uid()
    or public.staff_may_see_progress(user_id)
  );

drop policy "Students read their own milestones" on public.milestones;

create policy "Students read their own milestones"
  on public.milestones for select to authenticated
  using (
    user_id = auth.uid()
    or public.staff_may_see_progress(user_id)
  );

drop policy "Staff confirm milestones for students in their org" on public.milestones;

create policy "Staff confirm milestones for students in their org"
  on public.milestones for update to authenticated
  using (
    public.staff_may_see_progress(user_id)
    and user_id <> auth.uid()
  )
  with check (
    public.staff_may_see_progress(user_id)
    and confirmed_by = auth.uid()
    and user_id <> auth.uid()
  );

-- ---------------------------------------------------------------
-- New school_progress consent must name the organisation it is for.
--
-- NOT VALID on purpose: it binds every row written from now on, and does not
-- reject rows that already exist. Any such row is unreachable by staff anyway
-- under the new function, so validating it later is a tidy-up, not a fix.
-- ---------------------------------------------------------------

alter table public.consent
  add constraint school_progress_names_an_org
  check (scope_key <> 'school_progress' or audience_org_id is not null)
  not valid;

-- ---------------------------------------------------------------
-- Report. Expect gate_exists true, and 0 school_progress rows with no
-- audience (a non-zero count is old test data, not a live exposure).
-- ---------------------------------------------------------------

select
  to_regprocedure('public.staff_may_see_progress(uuid)') is not null as gate_exists,
  (select count(*) from public.consent
    where scope_key = 'school_progress' and audience_org_id is null) as school_consent_without_audience,
  (select count(*) from pg_policies
    where schemaname = 'public'
      and qual like '%staff_may_see_progress%') as policies_using_new_gate;
