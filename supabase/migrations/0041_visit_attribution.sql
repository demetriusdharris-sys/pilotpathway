-- 0041: the students a visit actually reached.
--
-- Stage 3, and the reason the hub exists. Arranging a pilot to visit a school can
-- be done by email; what cannot be done by email is capturing the students who
-- were in the room. "Your funded visit produced 14 signups, 9 of whom finished
-- Stage 1" is the sentence a sponsor renews on, and nothing in this app could
-- produce it until now.
--
-- TWO LINES THAT MUST NOT BE CROSSED, decided with the founder Sep 24 2026.
--
--   1. A CODE IS NEVER REQUIRED TO SIGN UP. The core ground school is free to
--      everyone, permanently. If a code unlocked access, the funnel would have
--      quietly become a paywall. The code records where somebody came from;
--      signing up without one stays completely normal.
--
--   2. ATTRIBUTION IS NOT CONSENT. Claiming a code says which visit reached this
--      student. It does NOT enrol them at that school and does NOT let that
--      school's staff see their progress — that is `school_progress`, granted by
--      the student or their guardian, revocable, and naming the organisation.
--      A funnel that silently turned a classroom visit into staff surveillance
--      of a minor would be the wrong product, and the data sitting right there
--      is exactly why it needs writing down.
--
-- ONE ATTRIBUTION PER STUDENT, FIRST ONE WINS. A student who attends two visits
-- was reached by the first; splitting a person between two sponsors invents a
-- number nobody can defend.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

alter table public.classroom_visits
  add column code text unique
    check (code is null or code ~ '^[A-HJ-NP-Z2-9]{6}$');

comment on column public.classroom_visits.code is
  'What the pilot puts on a slide. Generated when a visit is confirmed, because a code for a visit nobody is coming to is no use. No O/0 or I/1 — it gets read off a screen at the back of a classroom.';

-- ---------------------------------------------------------------
-- The codes themselves.
--
-- Six characters from an alphabet with no O/0 or I/1, because a student is
-- reading this off a projector from the back row and typing it on a phone.
-- ---------------------------------------------------------------

create or replace function public.generate_visit_code()
returns text
language plpgsql
set search_path to ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_tries integer := 0;
begin
  loop
    v_code := '';

    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;

    exit when not exists (select 1 from public.classroom_visits where code = v_code);

    v_tries := v_tries + 1;

    -- A billion codes and six characters: a collision loop that runs away means
    -- something is wrong rather than unlucky.
    if v_tries > 20 then
      raise exception 'Could not find an unused visit code.';
    end if;
  end loop;

  return v_code;
end;
$$;

-- Every visit that is already confirmed or done gets one, so the feature works
-- for visits that existed before it did.
update public.classroom_visits
set code = public.generate_visit_code()
where code is null and status in ('confirmed', 'completed');

-- ---------------------------------------------------------------
-- Who signed up because of a visit.
-- ---------------------------------------------------------------

create table public.visit_signups (
  id bigint generated always as identity primary key,

  visit_id uuid not null references public.classroom_visits(id) on delete cascade,

  -- Cascades with the account. This is the student's own data: if they delete
  -- their account the attribution goes with it, and a sponsor count is one
  -- lower. That is the correct direction — a report should not outlive consent
  -- to be counted in it.
  user_id uuid not null references auth.users(id) on delete cascade,

  claimed_at timestamptz not null default now(),

  -- One attribution per student, first one wins.
  unique (user_id)
);

create index visit_signups_visit_idx on public.visit_signups (visit_id);

comment on table public.visit_signups is
  'Which classroom visit reached this student. Attribution only — it does not enrol them anywhere and gives no school any view of their progress.';

alter table public.visit_signups enable row level security;

create policy "A student reads their own attribution"
  on public.visit_signups for select to authenticated
  using (user_id = auth.uid());

create policy "Staff read attributions for their school's visits"
  on public.visit_signups for select to authenticated
  using (
    exists (
      select 1 from public.classroom_visits v
      where v.id = visit_id and public.is_staff_of(v.organization_id)
    )
  );

create policy "The pilot reads attributions for visits they took"
  on public.visit_signups for select to authenticated
  using (
    exists (
      select 1 from public.classroom_visits v
      where v.id = visit_id and v.pilot_user_id = auth.uid()
    )
  );

create policy "Admins read every attribution"
  on public.visit_signups for select to authenticated
  using (public.may_administer());

-- No INSERT policy. Claiming goes through the function below, which is what
-- enforces one-per-student and refuses a code for a visit that never happened.

-- ---------------------------------------------------------------
-- A student says which visit reached them.
-- ---------------------------------------------------------------

create or replace function public.claim_visit_code(p_code text)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_visit uuid;
  v_status text;
  v_pilot text;
begin
  if auth.uid() is null then
    raise exception 'Log in first.';
  end if;

  select v.id, v.status, p.display_name
    into v_visit, v_status, v_pilot
  from public.classroom_visits v
  left join public.pilot_profiles p on p.user_id = v.pilot_user_id
  where v.code = upper(btrim(coalesce(p_code, '')));

  if not found then
    raise exception 'We do not recognise that code. You can carry on without it — nothing here needs one.';
  end if;

  if v_status not in ('confirmed', 'completed') then
    raise exception 'That visit is not happening. You can carry on without a code.';
  end if;

  -- Already attributed somewhere. Said as a fact rather than an error: they did
  -- nothing wrong, and the first visit is the one that reached them.
  if exists (select 1 from public.visit_signups where user_id = auth.uid()) then
    return 'You are already counted against a visit. Nothing changes.';
  end if;

  insert into public.visit_signups (visit_id, user_id)
  values (v_visit, auth.uid());

  return coalesce(
    format('Thanks — we have noted that %s''s visit is what brought you here.', v_pilot),
    'Thanks — we have noted which visit brought you here.'
  );
end;
$$;

revoke all on function public.claim_visit_code(text) from public, anon;
grant execute on function public.claim_visit_code(text) to authenticated;

-- ---------------------------------------------------------------
-- A code is generated when a visit is confirmed.
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
  v_org_name text;
  v_code text;
begin
  select v.organization_id, v.status, o.name, v.code
    into v_org, v_status, v_org_name, v_code
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

  -- Kept if it already has one, so a visit that is confirmed, cancelled and
  -- confirmed again does not invalidate a code already on somebody's slide.
  if v_code is null then
    v_code := public.generate_visit_code();
  end if;

  update public.classroom_visits
  set status = 'confirmed',
      pilot_user_id = p_pilot,
      confirmed_for = p_when,
      code = v_code,
      updated_at = now()
  where id = p_visit_id;

  return format('%s is confirmed. Your code for the room is %s.', v_name, v_code);
end;
$$;

-- ---------------------------------------------------------------
-- Report. Expect the column, both functions, the table, and a code on
-- every confirmed or completed visit.
-- ---------------------------------------------------------------

select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'classroom_visits'
      and column_name = 'code'
  ) as code_column,
  to_regclass('public.visit_signups') is not null as signups_table,
  to_regprocedure('public.claim_visit_code(text)') is not null as claim_function,
  to_regprocedure('public.generate_visit_code()') is not null as code_generator,
  (select count(*) from public.classroom_visits
    where status in ('confirmed', 'completed') and code is null) as missing_codes_should_be_zero,
  (select count(*) from public.visit_signups) as attributions;
