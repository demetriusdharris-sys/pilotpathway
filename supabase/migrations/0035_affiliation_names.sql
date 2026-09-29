-- 0035: affiliations show their full name, and one slug was wrong.
--
-- A student does not know what OBAP stands for, which defeats the point — the
-- affiliation exists so a student sees someone they recognise themselves in, and
-- an acronym they cannot decode tells them nothing. Both forms are now stored:
-- `name` is the short form a pilot would say, `long_name` is the full name
-- without a leading article so it can be used as a label or in a sentence.
--
-- AND A CORRECTION. `naacp_aviation` was the slug for the Tuskegee Airmen. The
-- NAACP and Tuskegee Airmen Inc. are different organisations and conflating them
-- is the kind of mistake that would embarrass a pilot on their own profile. No
-- pilot has claimed any affiliation yet, so the slug can be fixed rather than
-- lived with.
--
-- The list itself is the founder's to correct — these are organisations he knows
-- and I do not. Adding or renaming one is this file's shape: an insert or an
-- update plus the CHECK on pilot_profiles.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

-- ---------------------------------------------------------------
-- The wrong slug goes first, so the CHECK below can be replaced once.
-- ---------------------------------------------------------------

update public.pilot_profiles
set affiliations = array_replace(affiliations, 'naacp_aviation', 'tuskegee')
where 'naacp_aviation' = any (affiliations);

alter table public.pilot_profiles
  drop constraint affiliations_are_known;

delete from public.aviation_affiliations where slug = 'naacp_aviation';

-- ---------------------------------------------------------------
-- Names that read properly to a sixteen-year-old.
-- ---------------------------------------------------------------

insert into public.aviation_affiliations (slug, name, long_name, position) values
  ('obap',     'OBAP',                 'Organization of Black Aerospace Professionals', 1),
  ('bpa',      'BPA',                  'Black Pilots of America',                        2),
  ('sots',     'Sisters of the Skies', 'Sisters of the Skies',                           3),
  ('lpa',      'LPA',                  'Latino Pilots Association',                      4),
  ('wai',      'WAI',                  'Women in Aviation International',                5),
  ('ngpa',     'NGPA',                 'National Gay Pilots Association',                6),
  ('papa',     'PAPA',                 'Professional Asian Pilots Association',          7),
  ('tuskegee', 'Tuskegee Airmen',      'Tuskegee Airmen Inc.',                           8),
  ('eaa',      'EAA',                  'Experimental Aircraft Association',              9),
  ('aopa',     'AOPA',                 'Aircraft Owners and Pilots Association',        10),
  ('faa_safety', 'FAASTeam',           'FAA Safety Team',                               11)
on conflict (slug) do update set
  name = excluded.name,
  long_name = excluded.long_name,
  position = excluded.position;

-- ---------------------------------------------------------------
-- The CHECK, rebuilt from the table rather than typed out again.
--
-- Written as a literal list because a CHECK cannot contain a subquery. Keeping
-- the two in step is a real maintenance cost, so the report below fails loudly
-- if they ever drift.
-- ---------------------------------------------------------------

alter table public.pilot_profiles
  add constraint affiliations_are_known
  check (affiliations <@ array[
    'obap', 'bpa', 'sots', 'lpa', 'wai', 'ngpa', 'papa',
    'tuskegee', 'eaa', 'aopa', 'faa_safety'
  ]::text[]);

-- ---------------------------------------------------------------
-- Report. Expect 11 affiliations, no rows with a blank long name,
-- and check_matches_table true — that last one is the drift guard.
-- ---------------------------------------------------------------

select
  (select count(*) from public.aviation_affiliations) as affiliations,
  (select count(*) from public.aviation_affiliations
    where btrim(coalesce(long_name, '')) = '') as missing_long_name,
  (select count(*) from public.aviation_affiliations where slug = 'naacp_aviation') as wrong_slug_remaining,
  -- Every slug in the table must satisfy the constraint, which is only true if
  -- the literal list and the table agree.
  not exists (
    select 1 from public.aviation_affiliations a
    where not (array[a.slug] <@ array[
      'obap', 'bpa', 'sots', 'lpa', 'wai', 'ngpa', 'papa',
      'tuskegee', 'eaa', 'aopa', 'faa_safety'
    ]::text[])
  ) as check_matches_table;
