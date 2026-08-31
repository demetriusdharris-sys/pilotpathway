-- 0006: organizations, cohorts, entitlements, milestones, consent.
-- Designed before real students exist. Retrofitting this is expensive.

-- ---------------------------------------------------------------
-- Organizations and membership.
-- ---------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_type text not null check (org_type in ('district', 'school', 'sponsor', 'flight_school')),
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  org_role text not null check (org_role in ('member', 'staff', 'org_admin')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- ---------------------------------------------------------------
-- Cohorts. Join table because a student can be in a school cohort and
-- a sponsor cohort at the same time, and can move between them.
-- ---------------------------------------------------------------

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.cohort_members (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (cohort_id, user_id)
);

-- ---------------------------------------------------------------
-- Entitlements. Overlapping rows are allowed and expected: a district
-- and a sponsor can fund the same student concurrently. Access is
-- "any active row". Funder is on the row so free-seat counts per
-- partner don't have to be reconstructed from payment records.
-- ---------------------------------------------------------------

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  funder_org_id uuid references public.organizations(id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'active' check (status in ('active', 'suspended', 'ended')),
  note text,
  created_at timestamptz not null default now()
);

create index entitlements_user_active_idx on public.entitlements (user_id) where status = 'active';

-- ---------------------------------------------------------------
-- Milestones. Types are rows, not an enum, so a typo doesn't need a
-- deploy. Students self-report; staff confirm. created_by supports a
-- staff-proposal flow later without a schema change.
-- ---------------------------------------------------------------

create table public.milestone_types (
  key text primary key,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

insert into public.milestone_types (key, label, sort_order) values
  ('discovery_flight', 'Discovery flight', 10),
  ('medical_certificate', 'Medical certificate', 20),
  ('written_test', 'Written test passed', 30),
  ('first_solo', 'First solo', 40),
  ('checkride', 'Checkride passed', 50);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type_key text not null references public.milestone_types(key),
  occurred_on date not null,
  note text,
  verification text not null default 'self_reported'
    check (verification in ('self_reported', 'confirmed')),
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (verification = 'confirmed' and confirmed_by is not null and confirmed_at is not null)
    or (verification = 'self_reported' and confirmed_by is null and confirmed_at is null)
  )
);

create index milestones_user_idx on public.milestones (user_id);

-- Attribution. Many per milestone, no owner, no leaderboard.
create table public.milestone_contributors (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  contributor_user_id uuid references auth.users(id) on delete set null,
  contributor_org_id uuid references public.organizations(id) on delete set null,
  contribution text,
  created_at timestamptz not null default now(),
  check (contributor_user_id is not null or contributor_org_id is not null)
);

-- ---------------------------------------------------------------
-- Consent. Append-only: revoking writes a new row, it never updates or
-- deletes the original grant. This is enforced by the absence of UPDATE
-- and DELETE policies below, not by convention.
--
-- granted_by and subject_user_id are separate because for a minor they
-- are different people, and a district will ask you to prove a guardian
-- granted it rather than the student.
--
-- Guardian consent expires at the subject's 18th birthday (expires_at)
-- rather than relying on a nightly job. re_consent_due_at is read ahead
-- of time so the student is prompted before the birthday, not blocked at
-- a session.
-- ---------------------------------------------------------------

create table public.consent_scopes (
  key text primary key,
  label text not null,
  description text
);

insert into public.consent_scopes (key, label, description) values
  ('school_progress',    'Share progress with my school',        'Lesson and mastery progress visible to school staff.'),
  ('sponsor_milestones', 'Share milestones with a sponsor',      'Real-world milestones visible to a named funding organization.'),
  ('public_story',       'Appear by name in public stories',     'Name and story may be used publicly. Off by default.'),
  ('live_session',       'Take part in live CFI sessions',       'Required for live video ground school. Guardian consent required under 18.');

create table public.consent (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid not null references auth.users(id) on delete set null,
  granted_by_relationship text not null default 'self'
    check (granted_by_relationship in ('self', 'guardian')),
  scope_key text not null references public.consent_scopes(key),
  audience_org_id uuid references public.organizations(id) on delete cascade,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  re_consent_due_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now()
);

create index consent_active_idx on public.consent (subject_user_id, scope_key)
  where revoked_at is null;

-- ---------------------------------------------------------------
-- Helper functions.
-- Policies below need the caller's role and org membership. Reading
-- profiles from inside a policy on another table would re-trigger the
-- profiles policy and recurse. SECURITY DEFINER breaks that loop.
-- STABLE lets the planner call these once per query, not once per row.
-- ---------------------------------------------------------------

create or replace function public.app_role()
returns public.user_role
language sql
stable
security definer
set search_path to ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff_of(org uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.organization_members
    where user_id = auth.uid()
      and organization_id = org
      and org_role in ('staff', 'org_admin')
  );
$$;

create or replace function public.shares_org_with(student uuid)
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
    where me.user_id = auth.uid()
      and me.org_role in ('staff', 'org_admin')
      and them.user_id = student
  );
$$;

create or replace function public.has_active_consent(student uuid, scope text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.consent c
    where c.subject_user_id = student
      and c.scope_key = scope
      and c.revoked_at is null
      and (c.expires_at is null or c.expires_at > now())
  );
$$;

-- ---------------------------------------------------------------
-- RLS. Every table on, policies explicit.
-- ---------------------------------------------------------------

alter table public.organizations         enable row level security;
alter table public.organization_members  enable row level security;
alter table public.cohorts               enable row level security;
alter table public.cohort_members        enable row level security;
alter table public.entitlements          enable row level security;
alter table public.milestone_types       enable row level security;
alter table public.milestones            enable row level security;
alter table public.milestone_contributors enable row level security;
alter table public.consent_scopes        enable row level security;
alter table public.consent               enable row level security;

-- Lookup tables: readable by any signed-in user, writable only by service role.
create policy "Anyone signed in can read milestone types"
  on public.milestone_types for select to authenticated using (active);

create policy "Anyone signed in can read consent scopes"
  on public.consent_scopes for select to authenticated using (true);

-- Organizations: members can see their own orgs.
create policy "Members can read their organizations"
  on public.organizations for select to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = organizations.id and m.user_id = auth.uid()
  ));

create policy "Members can read their own membership"
  on public.organization_members for select to authenticated
  using (user_id = auth.uid() or public.is_staff_of(organization_id));

-- Cohorts.
create policy "Members can read cohorts in their org"
  on public.cohorts for select to authenticated
  using (public.is_staff_of(organization_id) or exists (
    select 1 from public.cohort_members cm
    where cm.cohort_id = cohorts.id and cm.user_id = auth.uid()
  ));

create policy "Students read own cohort membership, staff read their org's"
  on public.cohort_members for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.cohorts c
    where c.id = cohort_members.cohort_id and public.is_staff_of(c.organization_id)
  ));

-- Entitlements: a student can see who is funding them.
create policy "Students read their own entitlements"
  on public.entitlements for select to authenticated
  using (user_id = auth.uid() or (funder_org_id is not null and public.is_staff_of(funder_org_id)));

-- Milestones: students own theirs. Staff see them only for students in
-- their org AND only where school_progress consent is active. Consent is
-- enforced here, at the database, not in app code.
create policy "Students read their own milestones"
  on public.milestones for select to authenticated
  using (
    user_id = auth.uid()
    or (
      public.shares_org_with(user_id)
      and public.has_active_consent(user_id, 'school_progress')
    )
  );

create policy "Students create their own milestones"
  on public.milestones for insert to authenticated
  with check (
    user_id = auth.uid()
    and created_by = auth.uid()
    and verification = 'self_reported'
  );

create policy "Students update their own unconfirmed milestones"
  on public.milestones for update to authenticated
  using (user_id = auth.uid() and verification = 'self_reported')
  with check (user_id = auth.uid() and verification = 'self_reported');

create policy "Staff confirm milestones for students in their org"
  on public.milestones for update to authenticated
  using (
    public.shares_org_with(user_id)
    and public.has_active_consent(user_id, 'school_progress')
    and user_id <> auth.uid()
  )
  with check (
    public.shares_org_with(user_id)
    and confirmed_by = auth.uid()
    and user_id <> auth.uid()
  );

create policy "Read contributors for visible milestones"
  on public.milestone_contributors for select to authenticated
  using (exists (
    select 1 from public.milestones m where m.id = milestone_contributors.milestone_id
  ));

-- Consent: readable by the subject and by whoever granted it.
-- INSERT only. No UPDATE policy and no DELETE policy, deliberately:
-- revocation is a new row, and history is never rewritten.
create policy "Subject and grantor read consent"
  on public.consent for select to authenticated
  using (subject_user_id = auth.uid() or granted_by = auth.uid());

create policy "Grant consent for yourself"
  on public.consent for insert to authenticated
  with check (
    granted_by = auth.uid()
    and (
      (granted_by_relationship = 'self' and subject_user_id = auth.uid())
      or granted_by_relationship = 'guardian'
    )
  );

comment on table public.consent is
  'Append-only. Revocation inserts a new row; never update or delete. No UPDATE/DELETE policies by design.';
comment on table public.milestones is
  'Students self-report; org staff confirm. created_by supports a staff-proposal flow later.';
