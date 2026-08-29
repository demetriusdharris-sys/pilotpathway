-- PilotPathway.ai — tutor rate limiting and spend protection
--
-- The tutor route calls a paid API. Before this migration a single
-- authenticated account could call it in an unbounded loop, and the only
-- signal would have been the invoice.
--
-- Design notes:
--   * Only the server writes these tables, using the service role key. The
--     service role bypasses RLS, so there are deliberately NO insert/update/
--     delete policies here. Their absence IS the protection.
--   * usage_limits has RLS enabled and NO policies at all, so the browser
--     cannot read it even with a valid session. Only the service role sees it.
--   * Limits live in a table, not in code, so they can be changed from the
--     Supabase dashboard without a deploy.

-- ---------------------------------------------------------------------------
-- tutor_usage — one row per student per UTC day
-- ---------------------------------------------------------------------------

create table if not exists public.tutor_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day date not null default ((now() at time zone 'utc')::date),
  message_count integer not null default 0,
  estimated_cost_cents numeric(12, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists tutor_usage_user_day_idx
  on public.tutor_usage (user_id, day);

-- Supports the global daily total scan without touching every historical row.
create index if not exists tutor_usage_day_idx
  on public.tutor_usage (day);

alter table public.tutor_usage enable row level security;

-- A student may read their own usage and nothing else.
drop policy if exists "Students can read their own tutor usage" on public.tutor_usage;
create policy "Students can read their own tutor usage"
  on public.tutor_usage for select
  using ((select auth.uid()) = user_id);

-- No INSERT, UPDATE, or DELETE policies exist by design. A student cannot
-- reset or lower their own counter. Writes come only from the service role.

-- ---------------------------------------------------------------------------
-- usage_limits — runtime-configurable caps
-- ---------------------------------------------------------------------------

create table if not exists public.usage_limits (
  key text primary key,
  value numeric not null check (value >= 0),
  description text,
  updated_at timestamptz not null default now()
);

alter table public.usage_limits enable row level security;

-- No policies at all. RLS with zero policies denies every role except the
-- service role, which bypasses RLS. The browser can never read these values.

insert into public.usage_limits (key, value, description) values
  (
    'daily_messages_per_user',
    150,
    'Maximum tutor messages one student may send per UTC day. Change this value to change the cap; no deploy required.'
  ),
  (
    'global_daily_messages',
    5000,
    'Maximum tutor messages across all students per UTC day. Backstop against a compromised account or a bad actor registering many accounts.'
  )
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Atomic counters
-- ---------------------------------------------------------------------------

-- Reserves one message and returns the student's new count for today.
--
-- This runs BEFORE the Anthropic call on purpose. If it ran after, a loop of
-- requests that fail upstream would never increment and the cap could be
-- bypassed entirely. Reserving first means every attempt costs quota.
--
-- The upsert is atomic, so two concurrent requests cannot both read the same
-- count and each believe they are under the limit.
create or replace function public.consume_tutor_message(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.tutor_usage (user_id, day, message_count)
  values (p_user_id, ((now() at time zone 'utc')::date), 1)
  on conflict (user_id, day) do update
    set message_count = public.tutor_usage.message_count + 1,
        updated_at = now()
  returning message_count into v_count;

  return v_count;
end;
$$;

-- Adds observed cost after a call completes. Separate from the reservation
-- because real token counts are only known once the response finishes.
create or replace function public.add_tutor_cost(
  p_user_id uuid,
  p_cost_cents numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tutor_usage
     set estimated_cost_cents = estimated_cost_cents + greatest(p_cost_cents, 0),
         updated_at = now()
   where user_id = p_user_id
     and day = ((now() at time zone 'utc')::date);
end;
$$;

-- Total messages across all students today.
create or replace function public.global_tutor_messages_today()
returns integer
language sql
security definer
set search_path = ''
as $$
  select coalesce(sum(message_count), 0)::integer
    from public.tutor_usage
   where day = ((now() at time zone 'utc')::date);
$$;

-- These are SECURITY DEFINER, so lock them down. Only the service role may
-- call them; a signed-in student must not be able to invoke them directly.
revoke execute on function public.consume_tutor_message(uuid) from public, anon, authenticated;
revoke execute on function public.add_tutor_cost(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.global_tutor_messages_today() from public, anon, authenticated;

grant execute on function public.consume_tutor_message(uuid) to service_role;
grant execute on function public.add_tutor_cost(uuid, numeric) to service_role;
grant execute on function public.global_tutor_messages_today() to service_role;
