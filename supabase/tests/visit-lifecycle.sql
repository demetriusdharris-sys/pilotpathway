-- A self-contained test of the classroom visit lifecycle.
--
--     Paste into the Supabase SQL Editor. It prints a pass/fail table and
--     cleans up after itself.
--
-- WHY THIS EXISTS. The visit functions are where the rules live — a visit
-- cannot be confirmed with an unvetted pilot or an unverified school, and only
-- the school records attendance. None of that can be checked by reading the
-- code, and clicking through it takes the founder half an hour. This drives the
-- functions directly.
--
-- HOW IT IMPERSONATES. `auth.uid()` reads `request.jwt.claims`, so setting that
-- claim makes a SECURITY DEFINER function believe a particular account is
-- calling it. The script does not change role, so it keeps full table access for
-- setup and teardown while the functions see whoever it is pretending to be.
--
-- WHAT IT DOES NOT TEST. Anything in React: the pages, the forms, the wizard.
-- It tests the layer underneath them, which is where the rules are.
--
-- SAFE TO RE-RUN. Everything it creates is named "ZZ script test" and deleted at
-- the end. The one exception is `organization_member_changes`, which refuses
-- deletes by design — a couple of rows naming the test school will remain, which
-- is honest: a test did happen.

create temp table test_results (
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
  v_unvetted uuid;

  v_org     uuid;
  v_visit   uuid;
  v_visit2  uuid;
  v_msg     text;
  v_step    integer := 0;
begin
  -- Who we are pretending to be. Looked up rather than hardcoded so the script
  -- survives a database reset.
  select id into v_admin from public.profiles
    where lower(email) = 'demetriusdharris@gmail.com';
  select id into v_teacher from public.profiles
    where lower(email) = 'demetriusdharris+test7@gmail.com';
  select id into v_pilot from public.profiles
    where lower(email) = 'demetriusdharris+cfi1@gmail.com';

  -- An unvetted pilot, for the gate that matters most. The founder's own
  -- profile is unverified, which is exactly what this needs.
  select p.user_id into v_unvetted from public.pilot_profiles p
    where p.vetting_status <> 'verified' limit 1;

  if v_admin is null or v_teacher is null or v_pilot is null then
    raise exception 'Missing one of the test accounts. Expected admin, +test7 and +cfi1.';
  end if;

  -- ---------------------------------------------------------------
  -- 1. A teacher sets up their own school. It arrives unverified.
  -- ---------------------------------------------------------------
  v_step := 1;
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher)::text, true);

  v_org := public.create_organization('ZZ script test school', 'school');

  insert into test_results values (
    v_step, 'A teacher can set up their own school',
    case when v_org is not null then 'PASS' else 'FAIL' end,
    coalesce(v_org::text, 'no id returned')
  );

  insert into test_results
  select 2, 'It arrives unverified and self-registered',
    case when verified_at is null and self_registered then 'PASS' else 'FAIL' end,
    format('verified_at=%s self_registered=%s', verified_at, self_registered)
  from public.organizations where id = v_org;

  insert into test_results
  select 3, 'Whoever set it up runs it',
    case when count(*) = 1 then 'PASS' else 'FAIL' end,
    format('%s org_admin row(s)', count(*))
  from public.organization_members
  where organization_id = v_org and user_id = v_teacher and org_role = 'org_admin';

  -- ---------------------------------------------------------------
  -- 4. One unverified school per person.
  -- ---------------------------------------------------------------
  begin
    perform public.create_organization('ZZ script test school two', 'school');
    insert into test_results values (4, 'A second unverified school is refused', 'FAIL', 'it was allowed');
  exception when others then
    insert into test_results values (4, 'A second unverified school is refused', 'PASS', sqlerrm);
  end;

  -- ---------------------------------------------------------------
  -- 5. An unverified school may still ask for a pilot.
  -- ---------------------------------------------------------------
  v_visit := public.request_classroom_visit(
    v_org, '9_12', 30, 'in_person',
    current_date + 7, current_date + 40,
    'Physics', 'Compton', 'CA', 'Script test.'
  );

  insert into test_results values (
    5, 'An unverified school can still ask for a pilot',
    case when v_visit is not null then 'PASS' else 'FAIL' end,
    coalesce(v_visit::text, 'no visit')
  );

  -- ---------------------------------------------------------------
  -- 6. An unverified school cannot enrol a student.
  -- ---------------------------------------------------------------
  begin
    perform public.set_organization_member(v_org, 'demetriusdharris+minor@gmail.com', 'member');
    insert into test_results values (6, 'An unverified school cannot enrol a student', 'FAIL', 'it was allowed');
  exception when others then
    insert into test_results values (6, 'An unverified school cannot enrol a student', 'PASS', sqlerrm);
  end;

  -- ---------------------------------------------------------------
  -- 7. An unvetted pilot cannot volunteer.
  -- ---------------------------------------------------------------
  if v_unvetted is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', v_unvetted)::text, true);
    begin
      perform public.volunteer_for_visit(v_visit, 'I am not cleared.');
      insert into test_results values (7, 'An unvetted pilot cannot volunteer', 'FAIL', 'it was allowed');
    exception when others then
      insert into test_results values (7, 'An unvetted pilot cannot volunteer', 'PASS', sqlerrm);
    end;
  else
    insert into test_results values (7, 'An unvetted pilot cannot volunteer', 'SKIPPED', 'no unvetted pilot on file');
  end if;

  -- ---------------------------------------------------------------
  -- 8. A vetted pilot can.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_pilot)::text, true);
  v_msg := public.volunteer_for_visit(v_visit, 'I grew up near there.');

  insert into test_results values (8, 'A cleared pilot can volunteer', 'PASS', v_msg);

  -- ---------------------------------------------------------------
  -- 9. The school cannot confirm while unverified.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher)::text, true);
  begin
    perform public.confirm_classroom_visit(v_visit, v_pilot, now() + interval '10 days');
    insert into test_results values (9, 'An unverified school cannot confirm a visit', 'FAIL', 'it was allowed');
  exception when others then
    insert into test_results values (9, 'An unverified school cannot confirm a visit', 'PASS', sqlerrm);
  end;

  -- ---------------------------------------------------------------
  -- 10. A teacher cannot verify their own school.
  -- ---------------------------------------------------------------
  begin
    perform public.verify_organization(v_org, 'Myself');
    insert into test_results values (10, 'A teacher cannot verify their own school', 'FAIL', 'it was allowed');
  exception when others then
    insert into test_results values (10, 'A teacher cannot verify their own school', 'PASS', sqlerrm);
  end;

  -- ---------------------------------------------------------------
  -- 11. An administrator can.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);
  v_msg := public.verify_organization(v_org, 'Script test', 'Checked by the test script.');
  insert into test_results values (11, 'An administrator can verify a school', 'PASS', v_msg);

  -- ---------------------------------------------------------------
  -- 12. Now the confirmation works.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher)::text, true);
  v_msg := public.confirm_classroom_visit(v_visit, v_pilot, now() + interval '10 days');
  insert into test_results values (12, 'A verified school can confirm a cleared pilot', 'PASS', v_msg);

  -- ---------------------------------------------------------------
  -- 13. The pilot cannot record attendance — that is the school's number.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_pilot)::text, true);
  begin
    perform public.complete_classroom_visit(v_visit, 999, 45);
    insert into test_results values (13, 'A pilot cannot record attendance', 'FAIL', 'it was allowed');
  exception when others then
    insert into test_results values (13, 'A pilot cannot record attendance', 'PASS', sqlerrm);
  end;

  -- ---------------------------------------------------------------
  -- 14. The school can.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher)::text, true);
  v_msg := public.complete_classroom_visit(v_visit, 24, 45);
  insert into test_results values (14, 'The school records what happened', 'PASS', v_msg);

  insert into test_results
  select 15, 'The completed visit holds the school''s numbers',
    case when status = 'completed' and students_attended = 24 and duration_minutes = 45
      then 'PASS' else 'FAIL' end,
    format('status=%s attended=%s minutes=%s', status, students_attended, duration_minutes)
  from public.classroom_visits where id = v_visit;

  -- ---------------------------------------------------------------
  -- 16. A completed visit cannot be cancelled.
  -- ---------------------------------------------------------------
  begin
    perform public.cancel_classroom_visit(v_visit, 'changed my mind');
    insert into test_results values (16, 'A visit that happened cannot be cancelled', 'FAIL', 'it was allowed');
  exception when others then
    insert into test_results values (16, 'A visit that happened cannot be cancelled', 'PASS', sqlerrm);
  end;

  -- ---------------------------------------------------------------
  -- 17. The vetting trigger, not just the function. Withdraw the pilot's
  --     clearance and try to confirm a second visit.
  -- ---------------------------------------------------------------
  v_visit2 := public.request_classroom_visit(
    v_org, 'mixed', 20, 'virtual', current_date + 7, current_date + 40
  );

  perform set_config('request.jwt.claims', json_build_object('sub', v_pilot)::text, true);
  perform public.volunteer_for_visit(v_visit2, 'Second one.');

  perform set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);
  perform public.set_pilot_vetting(
    'demetriusdharris+cfi1@gmail.com', 'unverified', 'Script test'
  );

  perform set_config('request.jwt.claims', json_build_object('sub', v_teacher)::text, true);
  begin
    perform public.confirm_classroom_visit(v_visit2, v_pilot, now() + interval '12 days');
    insert into test_results values (17, 'A pilot whose clearance was withdrawn cannot be confirmed', 'FAIL', 'it was allowed');
  exception when others then
    insert into test_results values (17, 'A pilot whose clearance was withdrawn cannot be confirmed', 'PASS', sqlerrm);
  end;

  -- Put the pilot back exactly as they were.
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);
  perform public.set_pilot_vetting(
    'demetriusdharris+cfi1@gmail.com', 'verified', 'Demetrius Harris'
  );

  -- ---------------------------------------------------------------
  -- Teardown. Only what this script made.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims', null, true);

  delete from public.visit_volunteers where visit_id in (v_visit, v_visit2);
  delete from public.classroom_visits where id in (v_visit, v_visit2);
  delete from public.organization_members where organization_id = v_org;
  delete from public.organizations where id = v_org;

  insert into test_results values (18, 'Cleaned up after itself', 'PASS',
    'visits, memberships and the test school removed');

exception when others then
  insert into test_results values (
    coalesce(v_step, 0), 'The script stopped early', 'ERROR', sqlerrm
  );

  -- Step 17 withdraws the pilot's clearance on purpose. If anything failed
  -- after that and before it was restored, the pilot would be left unable to
  -- take a classroom because of a test — so put them back here too.
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);
    perform public.set_pilot_vetting(
      'demetriusdharris+cfi1@gmail.com', 'verified', 'Demetrius Harris'
    );
    insert into test_results values (99, 'Pilot clearance restored after the failure', 'PASS', '');
  exception when others then
    insert into test_results values (99, 'Could not restore the pilot clearance', 'ERROR', sqlerrm);
  end;

  perform set_config('request.jwt.claims', null, true);
end;
$$;

select
  step,
  name,
  outcome,
  left(detail, 90) as detail
from test_results
order by step;
