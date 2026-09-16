-- 0017: make account deletion possible.
--
-- Deleting an auth.users row already cascades almost all of a student's data
-- away: profile, progress, tutor history, usage, quiz answers, mastery
-- signals, guardian links, consent they are the subject of, milestones,
-- memberships. But four references made the delete itself fail and roll back,
-- and each trap bit a DIFFERENT account from the one being thought about:
--
--   1. consent.granted_by is NOT NULL but ON DELETE SET NULL. A guardian who
--      ever granted consent for a student could never delete their account.
--   2. milestones.created_by is NOT NULL but ON DELETE SET NULL. A staff
--      member who logged a milestone for a student could never be deleted.
--   3. milestones.confirmed_by is ON DELETE SET NULL, but a check constraint
--      requires a confirmed milestone to name its confirmer. Deleting the
--      confirmer violated the check.
--   4. milestone_contributors.contributor_user_id is ON DELETE SET NULL, but a
--      check constraint requires a person or an organisation. Deleting a
--      person credited with no organisation violated the check.
--
-- None of these could bite yet — nothing in the app writes consent or
-- milestones — but a deletion feature cannot ship on top of them.
--
-- Decisions (founder, Sep 16 2026):
--
--   * When the account that GRANTED consent for someone else is deleted, the
--     consent is revoked, not erased. The subject falls back to no consent,
--     which is the safe default for a minor, and the record of the grant,
--     who it covered, and why it ended is kept.
--   * When a student's OWN account is deleted, their consent history is
--     erased with it (the existing cascade). Pending legal review before any
--     school contract.
--
-- Following the same principle as consent, a confirmation that can no longer
-- be attributed to anyone stops counting: the milestone reverts to
-- self-reported rather than claiming a confirmation nobody can stand behind.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

alter table public.consent    alter column granted_by drop not null;
alter table public.milestones alter column created_by drop not null;

-- Runs BEFORE the auth.users row goes, so it sees the references intact and
-- settles them before the foreign-key SET NULL / CASCADE actions fire.
create or replace function public.prepare_account_deletion()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  -- Consent this account gave for someone else: revoke, keep the record.
  -- The SET NULL on granted_by then clears the dangling reference; the
  -- revocation_reason is what still explains what happened.
  update public.consent
  set revoked_at = now(),
      revocation_reason =
        'Revoked automatically: the account that granted this consent was deleted.'
  where granted_by = old.id
    and subject_user_id <> old.id
    and revoked_at is null;

  -- Milestones this account confirmed for someone else: the confirmation can
  -- no longer be attributed to anyone, so it stops counting.
  update public.milestones
  set verification = 'self_reported',
      confirmed_by = null,
      confirmed_at = null
  where confirmed_by = old.id
    and user_id <> old.id;

  -- Credits naming only this person and no organisation. Attribution to an
  -- account that no longer exists is not attribution; remove it.
  delete from public.milestone_contributors
  where contributor_user_id = old.id
    and contributor_org_id is null;

  return old;
end;
$$;

drop trigger if exists prepare_account_deletion on auth.users;
create trigger prepare_account_deletion
  before delete on auth.users
  for each row execute function public.prepare_account_deletion();

-- 0006 described revocation as inserting a new row. has_active_consent() has
-- never worked that way: it treats a grant as active until that same row's
-- revoked_at is set, so a separate revocation row would deactivate nothing.
-- Correct the description to match the mechanism, so a future "withdraw
-- consent" feature is built on what actually works.
comment on table public.consent is
  'Grants are never deleted or rewritten. Revocation sets revoked_at and revocation_reason on the grant itself — has_active_consent() reads revoked_at, so a separate revocation row would not deactivate anything. No client UPDATE or DELETE policies. Erased with the subject''s account; revoked, not erased, when the granting account is deleted (0017).';

-- ---------------------------------------------------------------
-- Report. Expect YES, YES, 1.
-- ---------------------------------------------------------------

select
  (select is_nullable from information_schema.columns
     where table_schema = 'public' and table_name = 'consent'
       and column_name = 'granted_by') as consent_granted_by_nullable,
  (select is_nullable from information_schema.columns
     where table_schema = 'public' and table_name = 'milestones'
       and column_name = 'created_by') as milestones_created_by_nullable,
  (select count(*) from pg_trigger
     where tgname = 'prepare_account_deletion' and not tgisinternal) as deletion_trigger_installed;
