-- 0007: guardian links, and consent tiered by verification strength.
--
-- Guardianship is relational, not a global role: "is a guardian" is not a
-- useful fact, "is guardian of this student" is. Same reasoning that put
-- org roles in organization_members rather than on profiles.
--
-- Tables first, then LANGUAGE sql functions that reference them. See
-- CLAUDE.md: sql functions are name-resolved at creation time.

create table public.guardian_links (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references auth.users(id) on delete cascade,

  -- Nullable: an invite exists before the guardian has an account.
  guardian_user_id uuid references auth.users(id) on delete cascade,
  invited_email text,

  relationship text not null default 'parent'
    check (relationship in ('parent', 'legal_guardian', 'other')),

  status text not null default 'pending'
    check (status in ('pending', 'verified', 'revoked')),

  -- Verification strength. email_invite proves control of a mailbox, not
  -- guardianship — a student with a second email satisfies it. The other
  -- two involve an adult at an institution asserting the relationship.
  verification_method text not null
    check (verification_method in ('email_invite', 'school_roster', 'staff_manual')),

  invited_at timestamptz not null default now(),
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),

  constraint guardian_is_not_the_student
    check (guardian_user_id is null or guardian_user_id <> student_user_id),

  -- Makes "verified with nobody attached" unrepresentable, not just discouraged.
  constraint verified_requires_account
    check (status <> 'verified' or (guardian_user_id is not null and verified_at is not null)),

  constraint revoked_requires_timestamp
    check (status <> 'revoked' or revoked_at is not null),

  constraint must_identify_a_guardian
    check (guardian_user_id is not null or invited_email is not null)
);

-- Partial: pending invites have no account yet, so the pair is only
-- meaningful once guardian_user_id is populated.
create unique index guardian_links_unique_pair
  on public.guardian_links (guardian_user_id, student_user_id)
  where guardian_user_id is not null;

create index guardian_links_student_verified_idx
  on public.guardian_links (student_user_id)
  where status = 'verified';

-- ---------------------------------------------------------------
-- Helper functions.
-- ---------------------------------------------------------------

create or replace function public.is_verified_guardian_of(student uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.guardian_links gl
    where gl.student_user_id = student
      and gl.guardian_user_id = auth.uid()
      and gl.status = 'verified'
  );
$$;

create or replace function public.is_strongly_verified_guardian_of(student uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.guardian_links gl
    where gl.student_user_id = student
      and gl.guardian_user_id = auth.uid()
      and gl.status = 'verified'
      and gl.verification_method in ('school_roster', 'staff_manual')
  );
$$;

-- Fails closed: a null date_of_birth returns false, so unknown age is
-- treated as a minor.
create or replace function public.is_adult(subject uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(
    (select p.date_of_birth is not null
        and p.date_of_birth <= (current_date - interval '18 years')::date
     from public.profiles p
     where p.id = subject),
    false
  );
$$;

-- ---------------------------------------------------------------
-- RLS. Read-only from the client; every write goes through a server
-- route using the service role. Verification is the whole security
-- property here and belongs in code that can be written carefully,
-- not in a policy expression.
-- ---------------------------------------------------------------

alter table public.guardian_links enable row level security;

create policy "Student and guardian read their own links"
  on public.guardian_links for select to authenticated
  using (student_user_id = auth.uid() or guardian_user_id = auth.uid());

-- ---------------------------------------------------------------
-- Replace the consent INSERT policy. The old one allowed any
-- authenticated user to insert a guardian row for any subject.
-- ---------------------------------------------------------------

drop policy if exists "Grant consent for yourself" on public.consent;

create policy "Grant consent as self or verified guardian"
  on public.consent for insert to authenticated
  with check (
    granted_by = auth.uid()
    and (
      (
        granted_by_relationship = 'self'
        and subject_user_id = auth.uid()
        and (scope_key <> 'live_session' or public.is_adult(auth.uid()))
      )
      or (
        granted_by_relationship = 'guardian'
        and public.is_verified_guardian_of(subject_user_id)
        and (
          scope_key <> 'live_session'
          or public.is_strongly_verified_guardian_of(subject_user_id)
        )
      )
    )
  );

comment on table public.guardian_links is
  'Relational guardianship. Client-readable only; all writes via service role. verification_method gates which consent scopes the guardian can grant.';
comment on column public.guardian_links.verification_method is
  'email_invite is sufficient for school_progress and sponsor_milestones. live_session requires school_roster or staff_manual.';
