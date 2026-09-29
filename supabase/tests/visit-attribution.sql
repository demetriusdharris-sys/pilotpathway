-- A self-contained test of visit attribution.
--
--     Paste into the Supabase SQL Editor. Prints a pass/fail table, cleans up.
--
-- What it proves: a code is generated when a visit is confirmed, a student can
-- claim it once, a second claim changes nothing, a code for a visit that never
-- happened is refused, and — the two rules that matter — claiming a code does
-- NOT enrol the student anywhere and does NOT give that school any view of
-- their progress.
--
-- Impersonates by setting `request.jwt.claims`, which is what `auth.uid()`
-- reads. Does not change role, so it keeps table access for setup and teardown.

create temp table attribution_results (
  step integer,
  name text,
  outcome text,
  detail text
) on commit drop;

do $$
declare
  v_admin   uuid;
  v_teacher uuid;
  v_pilot   uuid;
  v_student uuid;

  v_org   uuid;
  v_visit uuid;
  v_open  uuid;
  v_code  text;
  v_msg   text;
begin
  select id into v_admin   from public.profiles where lower(email) = 'demetriusdharris@gmail.com';
  select id into v_teacher from public.profiles where lower(email) = 'demetriusdharris+test7@gmail.com';
  select id into v_pilot   from public.profiles where lower(email) = 'demetriusdharris+cfi1@gmail.com';
  select id into v_student from public.profiles where lower(email) = 'demetriusdharris+minor@gmail.com';

  if v_admin is null or v_teacher is null or v_pilot is null or v_student is null then
    raise exception 'Missing a test account. Expected admin, +test7, +cfi1 and +minor.';
  end if;

  -- A student who already has an attribution would make "one per student"
  -- untestable, so start from a known state for this one account only.
  delete from public.visit_signups where user_id = v_student;

  -- ---------------------------------------------------------------
  -- Setup: a verified school with a confirmed visit.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);
  v_org := public.create_organization('ZZ attribution test school', 'school', null);

  -- create_organization made the admin its org_admin, which is what we need to
  -- act as the school below.
  v_visit := public.request_classroom_visit(
    v_org, '9_12', 25, 'in_person', current_date + 7, current_date + 40,
    null, 'Compton', 'CA', null
  );

  v_open := public.request_classroom_visit(
    v_org, 'mixed', 15, 'virtual', current_date + 7, current_date + 40
  );

  perform set_config('request.jwt.claims', json_build_object('sub', v_pilot)::text, true);
  perform public.volunteer_for_visit(v_visit, null);

  perform set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);
  v_msg := public.confirm_classroom_visit(v_visit, v_pilot, now() + interval '10 days');

  select code into v_code from public.classroom_visits where id = v_visit;

  insert into attribution_results values (
    1, 'Confirming a visit generates a code',
    case when v_code ~ '^[A-HJ-NP-Z2-9]{6}$' then 'PASS' else 'FAIL' end,
    coalesce(v_code, 'none')
  );

  insert into attribution_results values (
    2, 'The confirmation message carries the code',
    case when v_msg like '%' || v_code || '%' then 'PASS' else 'FAIL' end,
    v_msg
  );

  insert into attribution_results
  select 3, 'The code avoids characters that misread',
    case when v_code !~ '[OI01]' then 'PASS' else 'FAIL' end,
    v_code;

  -- ---------------------------------------------------------------
  -- 4. A student claims it.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_student)::text, true);
  v_msg := public.claim_visit_code(v_code);

  insert into attribution_results values (4, 'A student can claim a code', 'PASS', v_msg);

  insert into attribution_results
  select 5, 'The attribution points at the right visit',
    case when count(*) = 1 then 'PASS' else 'FAIL' end,
    format('%s row(s)', count(*))
  from public.visit_signups where user_id = v_student and visit_id = v_visit;

  -- ---------------------------------------------------------------
  -- 6. THE LINE THAT MATTERS: attribution is not enrolment.
  -- ---------------------------------------------------------------
  insert into attribution_results
  select 6, 'Claiming a code does not enrol the student at that school',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    format('%s membership row(s)', count(*))
  from public.organization_members
  where organization_id = v_org and user_id = v_student;

  -- ---------------------------------------------------------------
  -- 7. And it grants that school no view of their progress.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);

  insert into attribution_results values (
    7, 'Claiming a code gives the school no view of their progress',
    case when public.staff_may_see_progress(v_student) then 'FAIL' else 'PASS' end,
    'staff_may_see_progress()'
  );

  -- ---------------------------------------------------------------
  -- 8. One attribution per student, first one wins.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_student)::text, true);
  v_msg := public.claim_visit_code(v_code);

  insert into attribution_results
  select 8, 'A second claim changes nothing',
    case when count(*) = 1 then 'PASS' else 'FAIL' end,
    v_msg
  from public.visit_signups where user_id = v_student;

  -- ---------------------------------------------------------------
  -- 9. A code for a visit nobody is coming to is refused.
  -- ---------------------------------------------------------------
  begin
    perform public.claim_visit_code('ZZZZZZ');
    insert into attribution_results values (9, 'An unknown code is refused', 'FAIL', 'it was accepted');
  exception when others then
    insert into attribution_results values (9, 'An unknown code is refused', 'PASS', sqlerrm);
  end;

  -- ---------------------------------------------------------------
  -- 10. An open visit has no code to claim.
  -- ---------------------------------------------------------------
  insert into attribution_results
  select 10, 'An unconfirmed visit has no code',
    case when code is null then 'PASS' else 'FAIL' end,
    coalesce(code, 'null')
  from public.classroom_visits where id = v_open;

  -- ---------------------------------------------------------------
  -- Teardown.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', null, true);

  delete from public.visit_signups where user_id = v_student;
  delete from public.visit_volunteers where visit_id in (v_visit, v_open);
  delete from public.classroom_visits where id in (v_visit, v_open);
  delete from public.organization_members where organization_id = v_org;
  delete from public.organizations where id = v_org;

  insert into attribution_results values (11, 'Cleaned up after itself', 'PASS',
    'school, visits and attribution removed');

exception when others then
  insert into attribution_results values (0, 'The script stopped early', 'ERROR', sqlerrm);
  perform set_config('request.jwt.claims', null, true);
end;
$$;

select step, name, outcome, left(detail, 80) as detail
from attribution_results
order by step;
