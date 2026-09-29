-- 0036: classroom visits — request, volunteer, confirm, and record what happened.
--
-- Stage 2 of the funnel. A school asks for a pilot; verified pilots volunteer;
-- the school picks one and confirms a date; afterwards the school records that it
-- happened and how many students were in the room. Stage 3 turns that last number
-- into signups.
--
-- THE ONE RULE THAT MATTERS: A VISIT CANNOT BE CONFIRMED WITH AN UNVETTED PILOT.
-- Enforced in `confirm_classroom_visit` and again by a trigger, because this is
-- the rule whose failure puts an unchecked adult in a room full of children. The
-- FAA vets a pilot's flying, not their fitness to work with children, which is
-- why 0034 records a separate attestation and why this migration refuses to
-- proceed without it.
--
-- ATTENDANCE IS REPORTED BY THE SCHOOL, NEVER THE PILOT. The teacher was in the
-- room and counts the students; the volunteer has every incentive to round up,
-- however honest they are. That number becomes a sponsor's renewal figure, and
-- the milestone rules in CLAUDE.md are explicit: unverified data in a sponsor
-- report is a trust event you do not recover from.
--
-- NOTHING HERE TOUCHES A STUDENT. A visit knows a school, a teacher, a pilot, a
-- date and a headcount. No student is named, enrolled, or linked — the students
-- in that room have no accounts and need none. That is the whole reason this
-- product carries far less youth-safety software risk than live video sessions
-- would.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create table public.classroom_visits (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null references public.organizations(id) on delete cascade,

  -- The teacher who asked. Nullable with SET NULL: staff leave schools, and the
  -- visit is the school's record rather than theirs. 0017 is the migration that
  -- had to fix NOT NULL paired with SET NULL, so it is nullable from the start.
  requested_by uuid references auth.users(id) on delete set null,

  grade_level text not null
    check (grade_level in ('k_5', '6_8', '9_12', 'mixed', 'college')),
  subject text,
  expected_students integer not null check (expected_students between 1 and 2000),

  format text not null check (format in ('in_person', 'virtual')),
  city text,
  state text check (state is null or length(state) = 2),

  -- A request names a window; a confirmation names a moment.
  window_start date not null,
  window_end date not null,
  confirmed_for timestamptz,

  notes text check (notes is null or length(notes) <= 2000),

  status text not null default 'open'
    check (status in ('open', 'confirmed', 'completed', 'cancelled')),

  pilot_user_id uuid references auth.users(id) on delete set null,

  -- Filled in by the school afterwards.
  students_attended integer check (students_attended is null or students_attended between 0 and 2000),
  duration_minutes integer check (duration_minutes is null or duration_minutes between 5 and 480),
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,

  cancelled_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint window_is_ordered check (window_end >= window_start),

  -- An in-person visit has to say where. A virtual one does not.
  constraint in_person_has_a_place
    check (format <> 'in_person' or (city is not null and state is not null)),

  -- Confirmed and completed visits must name a pilot and a time. Unrepresentable
  -- rather than merely discouraged.
  constraint confirmed_names_pilot_and_time
    check (
      status not in ('confirmed', 'completed')
      or (pilot_user_id is not null and confirmed_for is not null)
    ),

  constraint completed_has_a_count
    check (
      status <> 'completed'
      or (students_attended is not null and completed_at is not null)
    )
);

create index classroom_visits_open_idx
  on public.classroom_visits (window_start) where status = 'open';

create index classroom_visits_org_idx
  on public.classroom_visits (organization_id, created_at desc);

create index classroom_visits_pilot_idx
  on public.classroom_visits (pilot_user_id) where pilot_user_id is not null;

comment on table public.classroom_visits is
  'A pilot speaking to a classroom. Knows a school, a teacher, a pilot, a date and a headcount — never a student.';

-- ---------------------------------------------------------------
-- Offers.
-- ---------------------------------------------------------------

create table public.visit_volunteers (
  id bigint generated always as identity primary key,
  visit_id uuid not null references public.classroom_visits(id) on delete cascade,
  pilot_user_id uuid not null references auth.users(id) on delete cascade,
  message text check (message is null or length(message) <= 1000),
  offered_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

-- One live offer per pilot per visit. A withdrawn one does not collide, so a
-- pilot can offer again after pulling out.
create unique index visit_volunteers_one_live
  on public.visit_volunteers (visit_id, pilot_user_id) where withdrawn_at is null;

comment on table public.visit_volunteers is
  'A verified pilot offering to take a visit. The school chooses; volunteering is not a booking.';

-- ---------------------------------------------------------------
-- RLS.
--
-- Staff see their own school's visits. A VERIFIED pilot sees open visits, so
-- they can find one, and any visit they are involved in. Admins see everything.
-- An unverified pilot sees no open visits at all — they cannot volunteer, so
-- showing them a list they cannot act on would only teach them to try.
-- ---------------------------------------------------------------

alter table public.classroom_visits enable row level security;
alter table public.visit_volunteers enable row level security;

create or replace function public.is_verified_pilot()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.pilot_profiles
    where user_id = auth.uid() and vetting_status = 'verified'
  );
$$;

comment on function public.is_verified_pilot() is
  'Whether the caller is a pilot who has been vetted. The gate on volunteering and on being confirmed for a visit.';

create policy "Staff read their school's visits"
  on public.classroom_visits for select to authenticated
  using (public.is_staff_of(organization_id));

create policy "A verified pilot reads open visits"
  on public.classroom_visits for select to authenticated
  using (status = 'open' and public.is_verified_pilot());

create policy "A pilot reads their own visits"
  on public.classroom_visits for select to authenticated
  using (pilot_user_id = auth.uid());

create policy "Admins read every visit"
  on public.classroom_visits for select to authenticated
  using (public.may_administer());

create policy "A pilot reads their own offers"
  on public.visit_volunteers for select to authenticated
  using (pilot_user_id = auth.uid());

create policy "Staff read offers on their school's visits"
  on public.visit_volunteers for select to authenticated
  using (
    exists (
      select 1 from public.classroom_visits v
      where v.id = visit_id and public.is_staff_of(v.organization_id)
    )
  );

create policy "Admins read every offer"
  on public.visit_volunteers for select to authenticated
  using (public.may_administer());

-- No INSERT, UPDATE or DELETE policies on either table, deliberately. Every
-- state change goes through a function below, because the rules — a verified
-- pilot, a school that owns the visit, attendance reported by the school — are
-- the entire value of this feature and do not belong in a policy expression.

-- ---------------------------------------------------------------
-- The vetting gate, as a trigger as well as a check in the function.
--
-- Belt and braces on the one rule whose failure hurts a child. A future
-- code path that sets status directly cannot get around this.
-- ---------------------------------------------------------------

create or replace function public.enforce_visit_pilot_vetted()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if new.status in ('confirmed', 'completed') and new.pilot_user_id is not null then
    if not exists (
      select 1 from public.pilot_profiles
      where user_id = new.pilot_user_id and vetting_status = 'verified'
    ) then
      raise exception
        'That pilot has not been cleared for a classroom. A visit cannot be confirmed without a background check on record.';
    end if;
  end if;

  return new;
end;
$$;

create trigger enforce_visit_pilot_vetted_ins
  before insert on public.classroom_visits
  for each row execute function public.enforce_visit_pilot_vetted();

create trigger enforce_visit_pilot_vetted_upd
  before update on public.classroom_visits
  for each row execute function public.enforce_visit_pilot_vetted();

-- ---------------------------------------------------------------
-- A school asks.
-- ---------------------------------------------------------------

create or replace function public.request_classroom_visit(
  p_organization_id uuid,
  p_grade_level text,
  p_expected_students integer,
  p_format text,
  p_window_start date,
  p_window_end date,
  p_subject text default null,
  p_city text default null,
  p_state text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid;
begin
  if not public.is_staff_of(p_organization_id) then
    raise exception 'Only staff of that school can ask for a visit.';
  end if;

  if p_window_start < current_date then
    raise exception 'That window has already started. Pick dates from today onward.';
  end if;

  insert into public.classroom_visits (
    organization_id, requested_by, grade_level, subject, expected_students,
    format, city, state, window_start, window_end, notes
  ) values (
    p_organization_id, auth.uid(), p_grade_level, nullif(btrim(coalesce(p_subject, '')), ''),
    p_expected_students, p_format,
    nullif(btrim(coalesce(p_city, '')), ''),
    nullif(upper(btrim(coalesce(p_state, ''))), ''),
    p_window_start, p_window_end,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------
-- A pilot offers, or withdraws.
-- ---------------------------------------------------------------

create or replace function public.volunteer_for_visit(
  p_visit_id uuid,
  p_message text default null
)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_status text;
begin
  if not public.is_verified_pilot() then
    raise exception 'Only a pilot who has been cleared for classrooms can volunteer.';
  end if;

  select status into v_status from public.classroom_visits where id = p_visit_id;

  if not found then
    raise exception 'No such visit.';
  end if;

  if v_status <> 'open' then
    raise exception 'That visit is no longer open.';
  end if;

  insert into public.visit_volunteers (visit_id, pilot_user_id, message)
  values (p_visit_id, auth.uid(), nullif(btrim(coalesce(p_message, '')), ''))
  on conflict do nothing;

  return 'Offered. The school will see you and choose.';
end;
$$;

create or replace function public.withdraw_from_visit(p_visit_id uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $$
begin
  update public.visit_volunteers
  set withdrawn_at = now()
  where visit_id = p_visit_id
    and pilot_user_id = auth.uid()
    and withdrawn_at is null;

  if not found then
    return 'You had not offered for that one.';
  end if;

  -- A confirmed pilot pulling out returns the visit to the school rather than
  -- leaving a classroom expecting somebody who is not coming.
  update public.classroom_visits
  set status = 'open', pilot_user_id = null, confirmed_for = null, updated_at = now()
  where id = p_visit_id
    and pilot_user_id = auth.uid()
    and status = 'confirmed';

  return 'Withdrawn. If you were confirmed, the school has been put back to looking.';
end;
$$;

-- ---------------------------------------------------------------
-- The school confirms one.
-- ---------------------------------------------------------------

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
begin
  select organization_id, status into v_org, v_status
  from public.classroom_visits where id = p_visit_id;

  if not found then
    raise exception 'No such visit.';
  end if;

  if not public.is_staff_of(v_org) then
    raise exception 'Only staff of that school can confirm a visit.';
  end if;

  if v_status <> 'open' then
    raise exception 'That visit is not open.';
  end if;

  if not exists (
    select 1 from public.visit_volunteers
    where visit_id = p_visit_id and pilot_user_id = p_pilot and withdrawn_at is null
  ) then
    raise exception 'That pilot has not offered for this visit.';
  end if;

  -- Said here as well as in the trigger, so the message a teacher sees explains
  -- itself rather than surfacing a constraint violation.
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
-- The school records what happened.
-- ---------------------------------------------------------------

create or replace function public.complete_classroom_visit(
  p_visit_id uuid,
  p_students_attended integer,
  p_duration_minutes integer default null
)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_org uuid;
  v_status text;
begin
  select organization_id, status into v_org, v_status
  from public.classroom_visits where id = p_visit_id;

  if not found then
    raise exception 'No such visit.';
  end if;

  -- Deliberately staff only. The teacher was in the room and counted; a
  -- volunteer has every incentive to round up, however honest they are, and this
  -- number becomes a sponsor's renewal figure.
  if not public.is_staff_of(v_org) then
    raise exception 'Only staff of that school can record what happened.';
  end if;

  if v_status <> 'confirmed' then
    raise exception 'Only a confirmed visit can be marked as done.';
  end if;

  update public.classroom_visits
  set status = 'completed',
      students_attended = p_students_attended,
      duration_minutes = p_duration_minutes,
      completed_at = now(),
      completed_by = auth.uid(),
      updated_at = now()
  where id = p_visit_id;

  return 'Recorded. Thank you.';
end;
$$;

create or replace function public.cancel_classroom_visit(
  p_visit_id uuid,
  p_reason text default null
)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_org uuid;
  v_pilot uuid;
  v_status text;
begin
  select organization_id, pilot_user_id, status
    into v_org, v_pilot, v_status
  from public.classroom_visits where id = p_visit_id;

  if not found then
    raise exception 'No such visit.';
  end if;

  if not (public.is_staff_of(v_org) or v_pilot = auth.uid()) then
    raise exception 'Only the school or the confirmed pilot can cancel a visit.';
  end if;

  if v_status = 'completed' then
    raise exception 'That visit already happened. It cannot be cancelled.';
  end if;

  update public.classroom_visits
  set status = 'cancelled',
      cancelled_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      updated_at = now()
  where id = p_visit_id;

  return 'Cancelled.';
end;
$$;

-- ---------------------------------------------------------------
-- Grants. Every function checks the caller itself.
-- ---------------------------------------------------------------

revoke all on function public.request_classroom_visit(uuid, text, integer, text, date, date, text, text, text, text) from public, anon;
revoke all on function public.volunteer_for_visit(uuid, text) from public, anon;
revoke all on function public.withdraw_from_visit(uuid) from public, anon;
revoke all on function public.confirm_classroom_visit(uuid, uuid, timestamptz) from public, anon;
revoke all on function public.complete_classroom_visit(uuid, integer, integer) from public, anon;
revoke all on function public.cancel_classroom_visit(uuid, text) from public, anon;

grant execute on function public.request_classroom_visit(uuid, text, integer, text, date, date, text, text, text, text) to authenticated;
grant execute on function public.volunteer_for_visit(uuid, text) to authenticated;
grant execute on function public.withdraw_from_visit(uuid) to authenticated;
grant execute on function public.confirm_classroom_visit(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.complete_classroom_visit(uuid, integer, integer) to authenticated;
grant execute on function public.cancel_classroom_visit(uuid, text) to authenticated;

-- ---------------------------------------------------------------
-- Report. Expect both tables, rls on both, 6 functions, 0 visits.
-- ---------------------------------------------------------------

select
  to_regclass('public.classroom_visits') is not null as visits_table,
  to_regclass('public.visit_volunteers') is not null as volunteers_table,
  (select relrowsecurity from pg_class where oid = 'public.classroom_visits'::regclass) as visits_rls,
  (select relrowsecurity from pg_class where oid = 'public.visit_volunteers'::regclass) as volunteers_rls,
  (
    (to_regprocedure('public.request_classroom_visit(uuid,text,integer,text,date,date,text,text,text,text)') is not null)::int +
    (to_regprocedure('public.volunteer_for_visit(uuid,text)') is not null)::int +
    (to_regprocedure('public.withdraw_from_visit(uuid)') is not null)::int +
    (to_regprocedure('public.confirm_classroom_visit(uuid,uuid,timestamptz)') is not null)::int +
    (to_regprocedure('public.complete_classroom_visit(uuid,integer,integer)') is not null)::int +
    (to_regprocedure('public.cancel_classroom_visit(uuid,text)') is not null)::int
  ) as functions_created,
  to_regprocedure('public.is_verified_pilot()') is not null as vetting_gate,
  (select count(*) from public.classroom_visits) as visits;
