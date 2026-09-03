-- 0008: carry date_of_birth from signup metadata into profiles.
--
-- raw_user_meta_data is client-influenced, so the cast is defensive: a
-- malformed or implausible value yields null rather than raising. A raise
-- here would abort the whole signup transaction, since this trigger is
-- SECURITY DEFINER on auth.users, and the student would see a generic
-- failure with nothing to act on. Null fails closed anyway — is_adult()
-- treats unknown age as a minor.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  dob date;
begin
  begin
    dob := nullif(trim(new.raw_user_meta_data ->> 'date_of_birth'), '')::date;
  exception when others then
    dob := null;
  end;

  -- Mirrors the plausibility range enforced by guard_profile_columns in
  -- 0005, so a hostile client cannot trip that trigger and break signup.
  if dob is not null and (dob >= current_date or dob < date '1900-01-01') then
    dob := null;
  end if;

  insert into public.profiles (id, email, first_name, date_of_birth)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    dob
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;
