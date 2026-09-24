-- 0030: a reviewer's name and certificate number, kept on their profile.
--
-- 0028 carried the reviewer's identity in the `?as=` URL parameter, and the
-- reasoning recorded at the time was that a reviewer might be a guest CFI on a
-- borrowed account, so inventing a profile column would be a schema change to
-- solve a form problem.
--
-- THAT WAS WRONG FOR THE REAL CASE. One CFI working through 144 cards over
-- several weeks is not a guest. They would retype their identity every sitting,
-- and "Jane Doe, CFI 1234567" one evening and "J. Doe" the next is an
-- inconsistent signature on safety content — on exactly the record a funder,
-- a school, or the FAA might later read. The credential belongs to the account
-- that approves, so it belongs on the account.
--
-- SELF-WRITABLE, AND THAT CHANGES NOTHING ABOUT TRUST. A reviewer types their
-- own name today through `?as=`; storing it is the same claim, typed once
-- instead of every visit. It is not a credential we verify, and it grants
-- nothing: `role` is what decides who may review, and `role` stays outside the
-- write allowlist precisely so a student cannot hand it to themselves. What
-- this column does is make attribution consistent, not authoritative.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

alter table public.profiles
  add column reviewer_credential text;

comment on column public.profiles.reviewer_credential is
  'A reviewer''s name and certificate number as it should appear against content they approve. Self-declared, never verified. Meaningless without a reviewing role.';

-- Added to the write allowlist from 0005. Everything absent from this list
-- still returns 42501 — above all `role`.
grant update (reviewer_credential) on public.profiles to authenticated;

-- ---------------------------------------------------------------
-- Report. Expect column_exists true and writable true.
-- ---------------------------------------------------------------

select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'reviewer_credential'
  ) as column_exists,
  exists (
    select 1 from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'reviewer_credential'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ) as writable,
  exists (
    select 1 from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ) as role_still_locked_false;
