-- The sponsor sentence, computed straight from the database.
--
--     Paste into the Supabase SQL Editor. Read-only — it writes nothing.
--
-- WHY THIS EXISTS. `src/lib/visit-outcomes.ts` produces the figures a funder
-- will be quoted, and it reads with the service role, so nothing a student or a
-- teacher can see will ever contradict it. A number nobody can audit is exactly
-- the kind that quietly drifts. This is the second implementation: if the page
-- and this disagree, one of them is wrong and it matters which.
--
-- It deliberately mirrors the page's rules rather than improving on them:
--
--   * One student counts once. The unique constraint on visit_signups makes
--     that true per student, and a roll-up unions students rather than summing
--     per-visit counts.
--   * "Finished the first stage" means every lesson in the first stage that has
--     any, matched by slug, with status 'completed'.
--   * The three figures are different kinds of fact and are labelled so. The
--     page must not present the self-reported one as verified, and neither does
--     this.
--
-- WHAT IT DOES NOT DO is suppress small cells. The page refuses to report
-- learning figures for a visit with fewer than five signups, because a
-- percentage over one student is a statement about that student. This is the
-- auditor's view, run by an administrator against their own database, so it
-- shows the raw counts — which is also how you check the suppression is firing
-- where it should.

with first_stage as (
  select s.slug, s.title
  from public.curriculum_stages s
  where exists (
    select 1 from public.curriculum_lessons l where l.stage_slug = s.slug
  )
  order by s.number
  limit 1
),
stage_lessons as (
  select l.slug
  from public.curriculum_lessons l
  join first_stage f on f.slug = l.stage_slug
),
cohort as (
  select vs.visit_id, vs.user_id
  from public.visit_signups vs
),
per_student as (
  select
    c.visit_id,
    c.user_id,
    exists (
      select 1 from public.instructor_messages m
      where m.user_id = c.user_id and m.role = 'user'
    ) as asked_the_tutor,
    (
      select count(*) from public.lesson_progress p
      where p.user_id = c.user_id
        and p.status = 'completed'
        and p.lesson_slug in (select slug from stage_lessons)
    ) >= (select count(*) from stage_lessons)
      and (select count(*) from stage_lessons) > 0 as marked_stage_complete,
    exists (
      select 1 from public.objective_mastery om
      where om.user_id = c.user_id and om.is_mastered
    ) as shown_an_objective
  from cohort c
)
select
  v.code,
  o.name                                              as school,
  v.status,
  coalesce(v.confirmed_for::date::text, '-')           as visit_date,
  count(ps.user_id)                                    as signups,
  count(ps.user_id) filter (where ps.asked_the_tutor)  as asked_the_tutor,
  count(ps.user_id) filter (where ps.marked_stage_complete)
                                                       as marked_stage_complete_SELF_REPORTED,
  count(ps.user_id) filter (where ps.shown_an_objective)
                                                       as shown_an_objective_SCORED,
  case when count(ps.user_id) < 5
       then 'suppressed on the page (fewer than 5)'
       else 'reported on the page' end                 as page_behaviour
from public.classroom_visits v
join public.organizations o on o.id = v.organization_id
left join per_student ps on ps.visit_id = v.id
group by v.id, v.code, o.name, v.status, v.confirmed_for
order by v.confirmed_for nulls last;

-- The roll-up, which is what a sponsor funding several visits is quoted.
-- Unions students rather than summing the rows above, so nobody is counted
-- twice even though the unique constraint already makes that impossible —
-- the shape should survive that constraint being relaxed.
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
students as (
  select distinct vs.user_id from public.visit_signups vs
)
select
  (select count(*) from students) as signups_all_visits,
  (select count(*) from students s where exists (
     select 1 from public.instructor_messages m
     where m.user_id = s.user_id and m.role = 'user')) as asked_the_tutor,
  (select count(*) from students s where
     (select count(*) from public.lesson_progress p
      where p.user_id = s.user_id and p.status = 'completed'
        and p.lesson_slug in (select slug from stage_lessons))
     >= (select count(*) from stage_lessons)
     and (select count(*) from stage_lessons) > 0)
       as marked_stage_complete_SELF_REPORTED,
  (select count(*) from students s where exists (
     select 1 from public.objective_mastery om
     where om.user_id = s.user_id and om.is_mastered)) as shown_an_objective_SCORED,
  (select count(*) from stage_lessons) as lessons_in_first_stage;
