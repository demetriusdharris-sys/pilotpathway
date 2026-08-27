-- PilotPathway.ai — profiles and lesson progress
--
-- Lesson content lives in code (src/lib/curriculum.ts). This schema stores
-- only per-student state. Row Level Security is on for both tables, so a
-- student can read and write their own rows and nothing else.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Students can read their own profile" on public.profiles;
create policy "Students can read their own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

drop policy if exists "Students can update their own profile" on public.profiles;
create policy "Students can update their own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Create a profile automatically whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- lesson_progress
-- ---------------------------------------------------------------------------

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  -- Matches a lesson slug in src/lib/curriculum.ts. Intentionally not a
  -- foreign key: lesson content is versioned in git, not in the database.
  lesson_slug text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_slug)
);

create index if not exists lesson_progress_user_id_idx
  on public.lesson_progress (user_id);

alter table public.lesson_progress enable row level security;

drop policy if exists "Students can read their own progress" on public.lesson_progress;
create policy "Students can read their own progress"
  on public.lesson_progress for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Students can create their own progress" on public.lesson_progress;
create policy "Students can create their own progress"
  on public.lesson_progress for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Students can update their own progress" on public.lesson_progress;
create policy "Students can update their own progress"
  on public.lesson_progress for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Backfill profiles for any users that already signed up before this ran.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
