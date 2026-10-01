-- A self-contained test of diagram review and what a student can see.
--
--     Paste into the Supabase SQL Editor AFTER applying 0042 and 0043.
--     It prints a pass/fail table and puts everything back as it found it.
--
-- WHY THIS EXISTS. Two rules decide whether this feature is safe, and neither
-- can be checked by reading the code: only a reviewer may approve a diagram,
-- and a student may read nothing but approved ones. The second is the one that
-- has bitten before — `0014` created a policy without the grant the policy
-- needed, every student read failed with 42501, and the quiz silently rendered
-- nothing while lint, typecheck and the build all passed. `0042` likewise
-- writes policies and no explicit grant, relying on Supabase's default
-- privileges. Step 9 is there to find out, rather than to assume.
--
-- HOW IT IMPERSONATES. `auth.uid()` reads `request.jwt.claims`, so setting that
-- claim makes a SECURITY DEFINER function believe a particular account is
-- calling it. For the reads in step 9 that is not enough — RLS and grants apply
-- to the ROLE — so that step also switches to `authenticated` and switches back
-- straight after, before touching the results table.
--
-- WHAT IT DOES NOT TEST. Anything in React: /review/diagrams, the lesson page,
-- or whether the drawings look right. The SVGs were checked separately at 375px
-- for overlap and legibility.
--
-- SAFE TO RE-RUN, AND IT MUST BE. It approves and reworks real catalogue rows,
-- so the teardown restores the original title and caption and returns every
-- diagram to 'draft' with no reviewer and no note. A diagram left approved by a
-- test is a picture no CFI cleared, shown to students.

create temp table test_results (
  step integer,
  name text,
  outcome text,
  detail text
) on commit drop;

do $$
declare
  v_admin    uuid;
  v_student  uuid;

  v_key      text;
  v_title    text;
  v_caption  text;
  v_lesson   text;
  v_position integer;
  v_source   text;

  v_status   text;
  v_by       text;
  v_at       timestamptz;
  v_note     text;

  v_total    integer;
  v_draft    integer;
  v_seen     integer;
  v_err      text;
  v_step     integer := 0;
begin
  select id into v_admin from public.profiles
    where lower(email) = 'demetriusdharris@gmail.com';
  select id into v_student from public.profiles
    where lower(email) = 'demetriusdharris+test7@gmail.com';

  if v_admin is null or v_student is null then
    raise exception 'Missing a test account. Expected the founder and +test7.';
  end if;

  -- ---------------------------------------------------------------
  -- 1. The migration landed: table, function, RLS, and eight drafts.
  -- ---------------------------------------------------------------
  v_step := 1;

  select count(*), count(*) filter (where status = 'draft')
    into v_total, v_draft
  from public.lesson_diagrams;

  insert into test_results values (
    1, 'Table, function and RLS exist with every diagram draft',
    case
      when to_regclass('public.lesson_diagrams') is null then 'FAIL'
      when to_regprocedure('public.review_diagram(text,text,text,text)') is null then 'FAIL'
      when not (select relrowsecurity from pg_class
                where oid = 'public.lesson_diagrams'::regclass) then 'FAIL'
      when v_total = 0 then 'FAIL'
      when v_total <> v_draft then 'FAIL'
      else 'PASS'
    end,
    v_total || ' diagrams, ' || v_draft || ' draft'
  );

  -- REFUSE TO RUN OVER REAL REVIEW WORK. This test approves, sends back and
  -- rewords a row, and then puts that row back. If a CFI has already decided
  -- anything, "put it back" is a guess, and the wrong guess silently discards
  -- the one piece of work this whole feature is waiting on.
  if v_total <> v_draft then
    raise exception
      'Refusing to run: % of % diagrams have already been reviewed. This test rewrites review state and will not risk a CFI''s decisions.',
      v_total - v_draft, v_total;
  end if;

  -- The one we will push around. Captured so teardown can put it back exactly.
  select diagram_key, title, caption, lesson_slug, position, source_note
    into v_key, v_title, v_caption, v_lesson, v_position, v_source
  from public.lesson_diagrams
  order by diagram_key
  limit 1;

  -- ---------------------------------------------------------------
  -- 2. A student cannot approve a diagram.
  --    The page not showing a button is not what makes someone a reviewer.
  -- ---------------------------------------------------------------
  v_step := 2;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_student)::text, true);

  begin
    perform public.review_diagram(v_key, 'approve', 'Not A Reviewer');
    insert into test_results values (2, 'A student cannot approve a diagram', 'FAIL', 'it was allowed');
  exception when others then
    insert into test_results values (2, 'A student cannot approve a diagram', 'PASS', sqlerrm);
  end;

  -- ---------------------------------------------------------------
  -- 3-6. The reviewer's own refusals.
  -- ---------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin)::text, true);

  v_step := 3;
  begin
    perform public.review_diagram(v_key, 'approve', '   ');
    insert into test_results values (3, 'An approval with no name is refused', 'FAIL', 'it was allowed');
  exception when others then
    insert into test_results values (3, 'An approval with no name is refused', 'PASS', sqlerrm);
  end;

  v_step := 4;
  begin
    perform public.review_diagram(v_key, 'needs_changes', 'Demetrius Harris', '  ');
    insert into test_results values (4, 'Sending back with no note is refused', 'FAIL', 'it was allowed');
  exception when others then
    insert into test_results values (4, 'Sending back with no note is refused', 'PASS', sqlerrm);
  end;

  v_step := 5;
  begin
    perform public.review_diagram(v_key, 'looks_fine', 'Demetrius Harris');
    insert into test_results values (5, 'An unknown decision is refused', 'FAIL', 'it was allowed');
  exception when others then
    insert into test_results values (5, 'An unknown decision is refused', 'PASS', sqlerrm);
  end;

  v_step := 6;
  begin
    perform public.review_diagram('no-such-diagram', 'approve', 'Demetrius Harris');
    insert into test_results values (6, 'An unknown diagram key is refused', 'FAIL', 'it was allowed');
  exception when others then
    insert into test_results values (6, 'An unknown diagram key is refused', 'PASS', sqlerrm);
  end;

  -- ---------------------------------------------------------------
  -- 7. Sending one back keeps the note and does not approve it.
  -- ---------------------------------------------------------------
  v_step := 7;
  perform public.review_diagram(
    v_key, 'needs_changes', 'Demetrius Harris, CFI 0000000',
    'The arrow on the left is ambiguous.'
  );

  select status, review_note, reviewed_at into v_status, v_note, v_at
  from public.lesson_diagrams where diagram_key = v_key;

  insert into test_results values (
    7, 'Sent back: note kept, still not approved',
    case when v_status = 'needs_changes'
          and v_note = 'The arrow on the left is ambiguous.'
          and v_at is null
         then 'PASS' else 'FAIL' end,
    v_status || ' / note ' || coalesce(v_note, 'null')
  );

  -- ---------------------------------------------------------------
  -- 8. An approval writes the reviewer's name and the time.
  -- ---------------------------------------------------------------
  v_step := 8;
  perform public.review_diagram(
    v_key, 'approve', 'Demetrius Harris, CFI 0000000', 'Checked against the handbook.'
  );

  select status, reviewed_by, reviewed_at into v_status, v_by, v_at
  from public.lesson_diagrams where diagram_key = v_key;

  insert into test_results values (
    8, 'An approval names a person and a time',
    case when v_status = 'approved' and v_by = 'Demetrius Harris, CFI 0000000'
          and v_at is not null
         then 'PASS' else 'FAIL' end,
    v_status || ' by ' || coalesce(v_by, 'nobody') || ' at ' || coalesce(v_at::text, 'never')
  );

  -- ---------------------------------------------------------------
  -- 9. THE ONE THAT MATTERS. As the `authenticated` role, with RLS and
  --    grants both in force, a student sees the approved diagram and
  --    none of the drafts.
  --
  --    Counted into variables first, because `authenticated` has no
  --    business writing to this session's results table.
  -- ---------------------------------------------------------------
  v_step := 9;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_student, 'role', 'authenticated')::text, true);

  begin
    execute 'set local role authenticated';
    select count(*) into v_seen from public.lesson_diagrams;
    execute 'reset role';
    v_err := null;
  exception when others then
    execute 'reset role';
    v_err := sqlerrm;
    v_seen := -1;
  end;

  insert into test_results values (
    9, 'A student reads the approved diagram and no drafts',
    case when v_err is not null then 'FAIL'
         when v_seen = 1 then 'PASS'
         else 'FAIL' end,
    case when v_err is not null
         then 'read failed: ' || v_err
         else v_seen || ' of ' || v_total || ' rows visible' end
  );

  -- ---------------------------------------------------------------
  -- 10. A wording change knocks the approval back.
  --     This is the sync's own upsert, run against one row.
  --
  --     Values come from variables, not from a select on the same table.
  --     With `public.lesson_diagrams` as both insert target and select
  --     source, `public.lesson_diagrams.title` in the conflict clause has
  --     two things it could mean. 0043 does not have that problem — its
  --     source is a temp table — so this keeps the same shape.
  -- ---------------------------------------------------------------
  v_step := 10;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin)::text, true);

  insert into public.lesson_diagrams
    (diagram_key, lesson_slug, position, title, caption, source_note, status)
  values (v_key, v_lesson, v_position,
          v_title || ' (reworded by the test)', v_caption, v_source, 'draft')
  on conflict (diagram_key) do update set
    title      = excluded.title,
    caption    = excluded.caption,
    updated_at = now(),
    status = case
      when public.lesson_diagrams.title is distinct from excluded.title
        or public.lesson_diagrams.caption is distinct from excluded.caption
      then 'draft' else public.lesson_diagrams.status end,
    reviewed_by = case
      when public.lesson_diagrams.title is distinct from excluded.title
        or public.lesson_diagrams.caption is distinct from excluded.caption
      then null else public.lesson_diagrams.reviewed_by end,
    reviewed_at = case
      when public.lesson_diagrams.title is distinct from excluded.title
        or public.lesson_diagrams.caption is distinct from excluded.caption
      then null else public.lesson_diagrams.reviewed_at end;

  select status, reviewed_by, reviewed_at into v_status, v_by, v_at
  from public.lesson_diagrams where diagram_key = v_key;

  insert into test_results values (
    10, 'A reworded diagram goes back to draft with no reviewer',
    case when v_status = 'draft' and v_by is null and v_at is null
         then 'PASS' else 'FAIL' end,
    v_status || ' by ' || coalesce(v_by, 'nobody')
  );

  -- ---------------------------------------------------------------
  -- 11. Teardown. The exact title and caption back, every diagram draft,
  --     no reviewer and no notes anywhere.
  -- ---------------------------------------------------------------
  -- Scoped to the one row this test touched, never to every row. A blanket
  -- reset here would turn a failed assertion into deleted CFI work.
  v_step := 11;
  update public.lesson_diagrams
  set title = v_title, caption = v_caption,
      status = 'draft', reviewed_by = null, reviewed_at = null,
      review_note = null, updated_at = now()
  where diagram_key = v_key;

  select count(*), count(*) filter (where status = 'draft')
    into v_total, v_draft
  from public.lesson_diagrams;

  insert into test_results values (
    11, 'Put back: every diagram draft, original wording restored',
    case when v_total = v_draft
          and exists (select 1 from public.lesson_diagrams
                      where diagram_key = v_key and title = v_title)
         then 'PASS' else 'FAIL' end,
    v_draft || ' of ' || v_total || ' draft'
  );

  perform set_config('request.jwt.claims', null, true);

exception when others then
  -- Whatever broke, the rows must not be left approved or reworded.
  begin
    execute 'reset role';
  exception when others then null;
  end;

  insert into test_results values (
    coalesce(v_step, 0), 'The script stopped early', 'ERROR', sqlerrm
  );

  -- Only the row this test touched. If it never got as far as choosing one,
  -- there is nothing to undo — which is the case when the guard above refuses
  -- to run because a CFI has already reviewed something.
  begin
    if v_key is not null then
      update public.lesson_diagrams
      set title = coalesce(v_title, title),
          caption = coalesce(v_caption, caption),
          status = 'draft', reviewed_by = null, reviewed_at = null,
          review_note = null
      where diagram_key = v_key;

      insert into test_results values (99, 'The diagram it touched was put back', 'PASS', v_key);
    else
      insert into test_results values (99, 'Nothing was changed, so nothing to undo', 'PASS', '');
    end if;
  exception when others then
    insert into test_results values (99, 'COULD NOT put the diagram back', 'ERROR', sqlerrm);
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
