-- PilotPathway.ai — persist tutor conversations, and give the tutor a name to use
--
-- Before this, conversations lived only in React state: a refresh destroyed
-- them. The tutor was also told to "track what they seem solid on versus
-- shaky" while receiving the literal strings "Student first name: student"
-- and "Mastery so far: new lesson" on every single request.

-- ---------------------------------------------------------------------------
-- instructor_messages
-- ---------------------------------------------------------------------------

create table if not exists public.instructor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  lesson_slug text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists instructor_messages_user_lesson_created_idx
  on public.instructor_messages (user_id, lesson_slug, created_at);

alter table public.instructor_messages enable row level security;

drop policy if exists "Students can read their own instructor messages" on public.instructor_messages;
create policy "Students can read their own instructor messages"
  on public.instructor_messages for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Students can write their own instructor messages" on public.instructor_messages;
create policy "Students can write their own instructor messages"
  on public.instructor_messages for insert
  with check ((select auth.uid()) = user_id);

-- No UPDATE and no DELETE policies, deliberately. A transcript a student can
-- edit is not a transcript. It is also the only record of what the tutor
-- actually told them, which matters when the subject is flight safety.

-- ---------------------------------------------------------------------------
-- profiles.first_name
-- ---------------------------------------------------------------------------
--
-- Chose a new first_name column over the existing display_name. display_name
-- means a whole name ("Demetrius D. Harris"); the tutor needs a form of
-- address to use mid-sentence. Populated from signup metadata below, and
-- nullable -- a student who does not give a name is not broken, and the tutor
-- is instructed to simply not use one.

alter table public.profiles
  add column if not exists first_name text;

-- Extend the signup trigger to carry first_name across from user metadata.
-- Replaces the version created in migration 0001.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
