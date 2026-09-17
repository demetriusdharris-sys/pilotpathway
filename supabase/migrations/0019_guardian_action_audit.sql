-- 0019: a permanent record of guardian actions.
--
-- A verified guardian can delete a minor's account or download their data.
-- Until now the only trace was a Vercel runtime log line, which is retained
-- briefly. A third party acting on a minor's data needs a record that outlives
-- the logs, the student's account, and the guardian's account.
--
-- Design:
--
--   * No foreign keys to auth.users. The point of the delete record is that
--     the student is gone, and the guardian may delete themselves later; a
--     foreign key would either cascade the record away or block the delete.
--     The ids are kept as plain values.
--   * The guardian's email is copied in at the time of acting, because an id
--     alone identifies no one once that account is deleted. The student's
--     email is deliberately NOT kept: the record must say that a deletion
--     happened without holding on to the personal data that was deleted.
--   * The record is written BEFORE the action. The app refuses to act if it
--     cannot write it, so there is never an untraced deletion or download.
--     outcome starts as 'started' and is then set to 'completed' or 'failed'.
--     A row left at 'started' means the action was attempted and its result
--     could not be recorded — check the Vercel logs and the account.
--   * Rows cannot be deleted, and nothing but outcome and finished_at can
--     change, and only once, from 'started'. Enforced by trigger, which
--     applies to the service role too.
--   * RLS on with no policies, and no grants to anon or authenticated. Only
--     server code using the service role writes it; nothing in the app reads
--     it. Read it in the SQL Editor.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create table public.guardian_actions (
  id bigint generated always as identity primary key,
  action text not null check (action in ('delete_account', 'export_data')),
  guardian_user_id uuid not null,
  guardian_email text,
  student_user_id uuid not null,
  -- How the guardian link was verified when they acted: email_invite,
  -- school_roster or staff_manual. The link itself is deleted with the student.
  verification_method text not null,
  outcome text not null default 'started'
    check (outcome in ('started', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint guardian_actions_finished_when_settled
    check ((outcome = 'started') = (finished_at is null))
);

create index guardian_actions_student_idx
  on public.guardian_actions (student_user_id, started_at desc);

create index guardian_actions_guardian_idx
  on public.guardian_actions (guardian_user_id, started_at desc);

alter table public.guardian_actions enable row level security;

revoke all on public.guardian_actions from anon, authenticated;

create or replace function public.protect_guardian_actions()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'guardian_actions is a permanent record; rows cannot be deleted.';
  end if;

  if old.outcome <> 'started' then
    raise exception 'guardian_actions row % is already settled and cannot change.', old.id;
  end if;

  if (to_jsonb(old) - 'outcome' - 'finished_at') is distinct from
     (to_jsonb(new) - 'outcome' - 'finished_at') then
    raise exception 'guardian_actions: only outcome and finished_at may change.';
  end if;

  return new;
end;
$$;

create trigger guardian_actions_protected
  before update or delete on public.guardian_actions
  for each row execute function public.protect_guardian_actions();

-- ---------------------------------------------------------------
-- Report. Expect: table_exists true, rls_on true, row_count 0.
-- ---------------------------------------------------------------

select
  to_regclass('public.guardian_actions') is not null as table_exists,
  (select relrowsecurity from pg_class where oid = 'public.guardian_actions'::regclass) as rls_on,
  (select count(*) from public.guardian_actions) as row_count;
