-- 0034: pilot mentors — who they are, and whether they have been vetted.
--
-- Stage 1 of the classroom visit funnel. A working pilot speaks to a classroom;
-- the students who are interested sign up for the ground school. This migration
-- covers the pilot and the vetting, so pilots can be recruited and checked
-- before any visit exists to send them on.
--
-- BEING A PILOT MENTOR IS NOT A ROLE. It is the existence of a row here. Same
-- reasoning as 0033: `profiles.role` holds one value, and a pilot who is also a
-- teacher at a school, or who also reviews content, is one person with several
-- capabilities. `mentor` in the role enum now grants nothing and should stay
-- that way.
--
-- WHY THERE ARE NO RACE OR GENDER FIELDS, THOUGH THE MISSION IS REPRESENTATION.
--
-- "If they see it, they can be it" is the whole point, so the temptation is to
-- store demographics and let a school request a pilot who looks like their
-- students. Two problems: it makes this database a register of protected
-- characteristics on volunteers, and a school selecting a person by race is
-- legally loaded however good the intent.
--
-- Affiliations do the same work without either. A pilot who lists OBAP, Sisters
-- of the Skies, the Latino Pilots Association or NGPA has told a student exactly
-- what they need to know — and it is self-chosen, already public, and something
-- they are proud of rather than a category we assigned them. Paired with where
-- they grew up, the route they took into aviation, and their story in their own
-- words, a student meets a person rather than a demographic match.
--
-- If a school ever needs more than that, the answer is a conversation, not a
-- filter.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

-- ---------------------------------------------------------------
-- The affiliations a pilot can claim.
--
-- A fixed list rather than free text, so "OBAP" and "O.B.A.P." are not two
-- different things and a school can one day filter on it. Adding one is a
-- one-line migration. Follows the pattern curriculum_lessons.sources already
-- uses for handbook names.
-- ---------------------------------------------------------------

create table public.aviation_affiliations (
  slug text primary key,
  name text not null,
  -- Shown to a student, so it has to read as a sentence fragment rather than an
  -- acronym: "a member of the Organization of Black Aerospace Professionals".
  long_name text not null,
  position integer not null
);

insert into public.aviation_affiliations (slug, name, long_name, position) values
  ('obap',   'OBAP',              'the Organization of Black Aerospace Professionals', 1),
  ('sots',   'Sisters of the Skies', 'Sisters of the Skies',                           2),
  ('lpa',    'Latino Pilots Association', 'the Latino Pilots Association',             3),
  ('wai',    'Women in Aviation', 'Women in Aviation International',                   4),
  ('ngpa',   'NGPA',              'the National Gay Pilots Association',               5),
  ('papa',   'PAPA',              'the Professional Asian Pilots Association',          6),
  ('naacp_aviation', 'Tuskegee Airmen chapter', 'a Tuskegee Airmen chapter',            7),
  ('eaa',    'EAA',               'the Experimental Aircraft Association',              8),
  ('aopa',   'AOPA',              'the Aircraft Owners and Pilots Association',         9),
  ('faa_safety', 'FAA Safety Team', 'the FAA Safety Team',                             10);

alter table public.aviation_affiliations enable row level security;

-- A lookup with no personal data in it. Readable by anyone signed in, because a
-- student reading a pilot's profile needs the long name.
create policy "Anyone signed in can read affiliations"
  on public.aviation_affiliations for select to authenticated using (true);

-- ---------------------------------------------------------------
-- The pilot.
-- ---------------------------------------------------------------

create table public.pilot_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- How they want to be introduced to a class. Not necessarily their legal name.
  display_name text not null check (length(btrim(display_name)) between 2 and 80),

  -- What they do now, in plain words a 16-year-old reads without decoding:
  -- "First Officer, Boeing 737" rather than "B737 FO".
  -- Named job_title, not current_role: current_role is a reserved SQL keyword
  -- and would resolve to the session role in an unqualified reference.
  job_title text not null check (length(btrim(job_title)) between 2 and 120),
  employer text,

  -- Where they are, for matching a visit that does not need a flight to reach.
  home_city text,
  home_state text check (home_state is null or length(home_state) = 2),
  home_airport text check (home_airport is null or length(btrim(home_airport)) between 3 and 4),
  travel_radius_miles integer check (travel_radius_miles is null or travel_radius_miles between 0 and 3000),
  will_do_virtual boolean not null default true,

  -- THE PART THAT MATTERS. Written for a student, not for a school.
  story text check (story is null or length(btrim(story)) <= 2000),
  grew_up_in text,
  route_in text check (route_in is null or route_in in (
    'military', 'community_college', 'university', 'flight_school_self_funded',
    'airline_cadet', 'family_business', 'other'
  )),
  first_in_family boolean,
  wish_i_had_known text check (wish_i_had_known is null or length(btrim(wish_i_had_known)) <= 500),

  languages text[] not null default array[]::text[],

  affiliations text[] not null default array[]::text[],

  -- ---------------------------------------------------------------
  -- Vetting.
  --
  -- WE RECORD THE ATTESTATION, NEVER THE CHECK. No background check report, no
  -- document, no identifier from one. What is stored is that somebody named
  -- confirmed a check was done, when, and when it needs redoing. The report
  -- itself is somebody else's sensitive data and this app has no business
  -- holding it — and a school asking "is this person cleared" is answered by
  -- the attestation.
  --
  -- The FAA vets a pilot's flying, not their fitness to work with children.
  -- ---------------------------------------------------------------
  vetting_status text not null default 'unverified'
    check (vetting_status in ('unverified', 'pending', 'verified', 'declined')),
  vetted_by text,
  vetted_at timestamptz,
  vetting_expires_at date,
  vetting_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A verified pilot must name who vetted them and when. Unrepresentable rather
  -- than merely discouraged, the same way 0014 does it for an approved card.
  constraint verified_requires_named_vetter
    check (
      vetting_status <> 'verified'
      or (vetted_by is not null and vetted_at is not null)
    ),

  -- Every affiliation has to be one of the known ones.
  constraint affiliations_are_known
    check (affiliations <@ array[
      'obap', 'sots', 'lpa', 'wai', 'ngpa', 'papa',
      'naacp_aviation', 'eaa', 'aopa', 'faa_safety'
    ]::text[])
);

create index pilot_profiles_verified_idx
  on public.pilot_profiles (home_state) where vetting_status = 'verified';

comment on table public.pilot_profiles is
  'A working pilot who volunteers in classrooms. The existence of a row is what makes someone a pilot mentor — deliberately not a value in profiles.role, because one person can be a pilot, a teacher and a content reviewer at once.';

comment on column public.pilot_profiles.story is
  'Their own words, written for a 16-year-old rather than for a school. This is the feature.';

comment on column public.pilot_profiles.vetting_status is
  'Whether somebody has attested that a background check was done. The check itself is never stored here.';

-- ---------------------------------------------------------------
-- RLS.
--
-- A pilot owns their profile. Everyone signed in may read a VERIFIED one,
-- because a student seeing who is coming to their classroom is the point. An
-- unverified profile is visible only to its owner and to staff, so a pilot who
-- has not been vetted cannot put themselves in front of a student by signing up.
-- ---------------------------------------------------------------

alter table public.pilot_profiles enable row level security;

create policy "A pilot reads their own profile"
  on public.pilot_profiles for select to authenticated
  using (user_id = auth.uid());

create policy "Anyone signed in reads a verified pilot"
  on public.pilot_profiles for select to authenticated
  using (vetting_status = 'verified');

create policy "A pilot creates their own profile"
  on public.pilot_profiles for insert to authenticated
  with check (user_id = auth.uid());

create policy "A pilot edits their own profile"
  on public.pilot_profiles for update to authenticated
  using (user_id = auth.uid());

-- No DELETE policy. A pilot who wants to stop volunteering is a status change,
-- not an erasure — visits they did are part of a school's record. Deleting the
-- account cascades this row away, which is the student's-own-data path.

-- ---------------------------------------------------------------
-- Column grants: the vetting fields are not the pilot's to set.
--
-- RLS restricts rows, not columns, so without this a pilot could PATCH
-- vetting_status to 'verified' on their own row and walk into a classroom. This
-- is the same control that stops a student setting profiles.role to admin, and
-- it is the single most important line in this migration.
-- ---------------------------------------------------------------

revoke update on public.pilot_profiles from authenticated, anon;

grant update (
  display_name, job_title, employer,
  home_city, home_state, home_airport, travel_radius_miles, will_do_virtual,
  story, grew_up_in, route_in, first_in_family, wish_i_had_known,
  languages, affiliations,
  updated_at
) on public.pilot_profiles to authenticated;

-- INSERT is likewise restricted to the same columns, so a pilot cannot arrive
-- pre-verified by setting the field on the way in.
revoke insert on public.pilot_profiles from authenticated, anon;

grant insert (
  user_id,
  display_name, job_title, employer,
  home_city, home_state, home_airport, travel_radius_miles, will_do_virtual,
  story, grew_up_in, route_in, first_in_family, wish_i_had_known,
  languages, affiliations
) on public.pilot_profiles to authenticated;

-- ---------------------------------------------------------------
-- Vetting is an administrator's act, recorded.
-- ---------------------------------------------------------------

create or replace function public.set_pilot_vetting(
  p_email text,
  p_status text,
  p_vetted_by text,
  p_expires date default null,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_subject uuid;
  v_subject_email text;
begin
  if not public.may_administer() then
    raise exception 'Only an administrator can vet a pilot.';
  end if;

  if p_status not in ('unverified', 'pending', 'verified', 'declined') then
    raise exception 'Unknown vetting status: %', p_status;
  end if;

  if p_status = 'verified' and coalesce(btrim(p_vetted_by), '') = '' then
    raise exception 'Say who checked them. A verification nobody signed is not a verification.';
  end if;

  select p.id, p.email into v_subject, v_subject_email
  from public.profiles p
  where lower(p.email) = lower(btrim(coalesce(p_email, '')));

  if not found then
    raise exception 'No account with that email has finished signing up yet.';
  end if;

  if not exists (select 1 from public.pilot_profiles where user_id = v_subject) then
    raise exception 'That account has not created a pilot profile yet.';
  end if;

  update public.pilot_profiles
  set vetting_status = p_status,
      vetted_by = case when p_status = 'verified' then btrim(p_vetted_by) else null end,
      vetted_at = case when p_status = 'verified' then now() else null end,
      vetting_expires_at = case when p_status = 'verified' then p_expires else null end,
      vetting_note = nullif(btrim(coalesce(p_note, '')), ''),
      updated_at = now()
  where user_id = v_subject;

  return format('%s is now %s.', v_subject_email, p_status);
end;
$$;

revoke all on function public.set_pilot_vetting(text, text, text, date, text) from public, anon;
grant execute on function public.set_pilot_vetting(text, text, text, date, text) to authenticated;

comment on function public.set_pilot_vetting(text, text, text, date, text) is
  'Records that somebody attested to a background check on a pilot. Admins only. Never stores the check itself.';

-- ---------------------------------------------------------------
-- Report. Expect both tables true, rls on both, 10 affiliations,
-- 0 pilots, and vetting_writable false — that last one is the control
-- that stops a pilot verifying themselves.
-- ---------------------------------------------------------------

select
  to_regclass('public.pilot_profiles') is not null as pilot_table,
  to_regclass('public.aviation_affiliations') is not null as affiliation_table,
  (select relrowsecurity from pg_class where oid = 'public.pilot_profiles'::regclass) as rls_on,
  (select count(*) from public.aviation_affiliations) as affiliations_seeded,
  (select count(*) from public.pilot_profiles) as pilots,
  exists (
    select 1 from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'pilot_profiles'
      and column_name = 'vetting_status' and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ) as vetting_writable_should_be_false;
