-- 0020: mastery means the last three answers, not a ninety-day clean sheet.
--
-- The rule from 0009 was "three correct, and no wrong answer in the last 90
-- days". Found on the live site Sep 17 2026: a test student answered one card
-- wrong, then answered it correctly five times in a row, and the objective
-- still did not count. Under that rule it could not count until December.
--
-- That is the wrong rule for a ground school. Getting something wrong and then
-- working it out is the behaviour the quiz exists to produce, and a rule that
-- punishes it for three months teaches students to avoid answering rather than
-- to learn. It is also hard to explain to a student, and a rule a student
-- cannot explain is one they will not trust.
--
-- The new rule: the LAST THREE attempts are all correct. Still three in a row,
-- so a lucky guess does not carry it. A later wrong answer still takes the
-- mark away, so it stays an honest claim about now. Recovery is immediate —
-- answer correctly three times and it counts again.
--
-- Nothing is rewritten. Mastery is computed in a view, never stored (0009),
-- precisely so the rule can change without a migration touching a single
-- student's history. The same answers are simply read by a fairer rule.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create or replace view public.objective_mastery
with (security_invoker = true)
as
with ranked as (
  select
    a.user_id,
    a.objective_id,
    a.is_correct,
    a.assessed_at,
    -- 1 is the newest attempt. Ties broken by id so the order is total and
    -- two answers recorded in the same instant cannot both be "the third".
    row_number() over (
      partition by a.user_id, a.objective_id
      order by a.assessed_at desc, a.id desc
    ) as recency
  from public.objective_assessments a
)
select
  r.user_id,
  r.objective_id,
  o.lesson_slug,
  o.is_safety_critical,
  count(*) as attempts,
  count(*) filter (where r.is_correct) as correct,
  max(r.assessed_at) as last_assessed_at,
  -- Three attempts exist, and the three most recent are all correct.
  (count(*) filter (where r.recency <= 3) = 3
   and bool_and(r.is_correct) filter (where r.recency <= 3)) as is_mastered
from ranked r
join public.learning_objectives o on o.id = r.objective_id
group by r.user_id, r.objective_id, o.lesson_slug, o.is_safety_critical;

-- ---------------------------------------------------------------
-- Report. One row per objective anyone has answered, so the effect of the new
-- rule is visible immediately. The test objective answered wrong once and then
-- correctly five times should now read is_mastered = true.
-- ---------------------------------------------------------------

select objective_id, attempts, correct, is_mastered, last_assessed_at
from public.objective_mastery
order by last_assessed_at desc;
