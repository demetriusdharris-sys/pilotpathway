-- Seeds one visit with five attributions, so the outcomes panel can be seen
-- doing the thing it was built to do.
--
--     1. Paste this into the Supabase SQL Editor. It prints a URL.
--     2. Open that URL signed in and compare the panel to the numbers below it.
--     3. Paste visit-outcomes-teardown.sql. Do not skip it — see WHY below.
--
-- WHY THIS EXISTS. Nothing has ever claimed a visit code in production, so the
-- outcomes panel has only ever been able to render its empty state. Five is not
-- an arbitrary number: it is the threshold below which the panel refuses to
-- report learning figures at all, so five attributions is the smallest seed
-- that exercises the reporting path rather than the suppression path.
--
-- WHY THE TEARDOWN MATTERS MORE THAN USUAL. An attribution is one per student
-- and the first one wins. A test attribution left on a real account can never
-- be replaced by the visit that actually reached that student — it would
-- quietly cost a pilot and a school the credit for a student they really did
-- bring in. This script therefore refuses to run if ANY attribution already
-- exists, so it can never bury real data, and the teardown removes every row
-- it created.
--
-- It claims through `claim_visit_code` rather than inserting rows, so what is
-- being exercised is the path a student actually takes.

do $$
declare
  v_admin uuid;
  v_pilot uuid;
  v_org   uuid;
  v_visit uuid;
  v_code  text;
  v_count integer;
  v_student uuid;
begin
  select count(*) into v_count from public.visit_signups;

  if v_count > 0 then
    raise exception
      'Refusing to run: % attribution(s) already exist. This script must never be run over real attribution — an attribution is one per student and the first one wins.',
      v_count;
  end if;

  select id into v_admin from public.profiles
    where lower(email) = 'demetriusdharris@gmail.com';
  select id into v_pilot from public.profiles
    where lower(email) = 'demetriusdharris+cfi1@gmail.com';

  if v_admin is null or v_pilot is null then
    raise exception 'Missing the founder or +cfi1.';
  end if;

  -- The pilot must be cleared, or the visit cannot be confirmed.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin)::text, true);
  perform public.set_pilot_vetting(
    'demetriusdharris+cfi1@gmail.com', 'verified', 'Seed script'
  );

  -- A school, verified so a visit can be confirmed against it.
  v_org := public.create_organization('ZZ outcomes test school', 'school');
  perform public.verify_organization(v_org, 'Seed script', 'Test fixture.');

  v_visit := public.request_classroom_visit(
    v_org, '9_12', 30, 'in_person',
    current_date + 7, current_date + 40,
    'Physics', 'Compton', 'CA', 'Outcomes panel fixture.'
  );

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_pilot)::text, true);
  perform public.volunteer_for_visit(v_visit, 'Seed script.');

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin)::text, true);
  perform public.confirm_classroom_visit(v_visit, v_pilot, now() + interval '7 days');

  select code into v_code from public.classroom_visits where id = v_visit;

  -- Five students claim it, each as themselves, through the real function.
  for v_student in
    select id from public.profiles order by created_at limit 5
  loop
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_student)::text, true);
    perform public.claim_visit_code(v_code);
  end loop;

  perform set_config('request.jwt.claims', null, true);

  raise notice 'Seeded visit % with code %', v_visit, v_code;
end;
$$;

-- ---------------------------------------------------------------
-- Where to look, and what the panel should say when you get there.
-- ---------------------------------------------------------------

with first_stage as (
  select s.slug from public.curriculum_stages s
  where exists (
    select 1 from public.curriculum_lessons l where l.stage_slug = s.slug
  )
  order by s.number limit 1
),
stage_lessons as (
  select l.slug from public.curriculum_lessons l
  join first_stage f on f.slug = l.stage_slug
),
cohort as (
  select vs.user_id
  from public.visit_signups vs
  join public.classroom_visits v on v.id = vs.visit_id
  where v.code is not null
)
select
  'https://pilotpathway.vercel.app/visits/' || v.id as open_this_signed_in,
  v.code,
  (select count(*) from cohort) as expect_signed_up,
  (select count(*) from cohort c where exists (
     select 1 from public.instructor_messages m
     where m.user_id = c.user_id and m.role = 'user'))
       as expect_asked_the_instructor,
  (select count(*) from cohort c where
     (select count(*) from public.lesson_progress p
      where p.user_id = c.user_id and p.status = 'completed'
        and p.lesson_slug in (select slug from stage_lessons))
     >= (select count(*) from stage_lessons))
       as expect_marked_stage_finished,
  (select count(*) from cohort c where exists (
     select 1 from public.objective_mastery om
     where om.user_id = c.user_id and om.is_mastered))
       as expect_shown_an_objective
from public.classroom_visits v
where v.organization_id = (
  select id from public.organizations where name = 'ZZ outcomes test school'
);
