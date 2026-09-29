-- 0040: a pilot can say they are a flight instructor.
--
-- Signing up names what you are — student, professional pilot, CFI, or a school.
-- The CFI case is worth more than it looks: a flight instructor who signs up is
-- exactly the person the content review queue has been waiting for, and knowing
-- which pilots hold the certificate turns "find a CFI" from a search into a list
-- on the admin page.
--
-- SELF-DECLARED, AND IT GRANTS NOTHING. A pilot writes these two fields
-- themselves, and neither one lets them do anything:
--
--   * Reviewing content is `content_reviewers` (0033), granted by an
--     administrator. Ticking "I am a CFI" puts somebody in front of the founder;
--     it does not hand them the approve button.
--   * Going into a classroom is `vetting_status` (0034), which stays ungranted
--     to `authenticated` so a pilot cannot clear themselves.
--
-- So the worst a false claim achieves is appearing on a list a person reads,
-- which is the same as sending an email saying "I am a CFI" — and the
-- certificate number is what makes it checkable against the FAA airman registry.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

alter table public.pilot_profiles
  add column is_cfi boolean not null default false,
  add column certificate_number text
    check (certificate_number is null or length(btrim(certificate_number)) between 3 and 40);

comment on column public.pilot_profiles.is_cfi is
  'Self-declared flight instructor. Grants nothing — reviewing content is content_reviewers and entering a classroom is vetting_status. It exists so a CFI who signs up is visible to whoever grants those.';

comment on column public.pilot_profiles.certificate_number is
  'Self-declared, never verified here. Recorded so it can be checked against the FAA airman registry by a person.';

-- Added to the columns a pilot may write. Everything absent from these lists
-- still returns 42501 — above all vetting_status.
grant update (is_cfi, certificate_number) on public.pilot_profiles to authenticated;
grant insert (is_cfi, certificate_number) on public.pilot_profiles to authenticated;

create index pilot_profiles_cfi_idx
  on public.pilot_profiles (vetting_status) where is_cfi;

-- ---------------------------------------------------------------
-- Report. Expect both columns writable by a pilot, and vetting_status still
-- not writable — that last one is the line that matters.
-- ---------------------------------------------------------------

select
  exists (
    select 1 from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'pilot_profiles'
      and column_name = 'is_cfi' and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ) as cfi_flag_writable,
  exists (
    select 1 from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'pilot_profiles'
      and column_name = 'certificate_number' and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ) as certificate_writable,
  exists (
    select 1 from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'pilot_profiles'
      and column_name = 'vetting_status' and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ) as vetting_writable_should_be_false,
  (select count(*) from public.pilot_profiles where is_cfi) as cfis;
