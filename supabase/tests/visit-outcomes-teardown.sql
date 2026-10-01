-- Removes everything visit-outcomes-seed.sql created.
--
--     Paste into the Supabase SQL Editor once you have looked at the panel.
--
-- RUN THIS. An attribution is one per student and the first one wins, so a test
-- attribution left behind permanently blocks the visit that really reaches that
-- student from being credited — costing a pilot and a school a number they
-- earned, silently and with no way to notice.
--
-- It is scoped by name to the seed's own school, so it cannot touch a real
-- visit or a real attribution. The last column is the one to read: attributions
-- must be back to zero.
--
-- `organization_member_changes` refuses deletes by design, so a row or two
-- naming the test school stays behind. That is honest — the membership did
-- happen — and it names nothing about a student.

do $$
declare
  v_org uuid;
  v_removed integer := 0;
begin
  select id into v_org from public.organizations
    where name = 'ZZ outcomes test school';

  if v_org is null then
    raise notice 'Nothing to remove — the seed school is not there.';
    return;
  end if;

  -- Attributions first: they reference the visits.
  delete from public.visit_signups vs
  using public.classroom_visits v
  where v.id = vs.visit_id and v.organization_id = v_org;

  get diagnostics v_removed = row_count;
  raise notice 'Removed % attribution(s).', v_removed;

  delete from public.visit_volunteers vv
  using public.classroom_visits v
  where v.id = vv.visit_id and v.organization_id = v_org;

  delete from public.classroom_visits where organization_id = v_org;
  delete from public.organization_members where organization_id = v_org;
  delete from public.organizations where id = v_org;
end;
$$;

select
  (select count(*) from public.organizations
     where name = 'ZZ outcomes test school')   as test_school_should_be_zero,
  (select count(*) from public.visit_signups)  as attributions_must_be_zero;
