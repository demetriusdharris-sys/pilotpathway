-- 0027: sync the question bank from docs/questions/*.md.
--
-- GENERATED FILE. Do not hand-edit it. Regenerate with:
--
--     node scripts/import-questions.mjs
--
-- The reviewed markdown is the source of truth.
--
-- Safe to re-run. Two things it will never do:
--
--   * It never approves a question. Everything arrives as 'draft'. Approval
--     means a CFI's name and the date written against the row — a human act.
--   * It never keeps an approval alive across a content change. 0026's
--     trigger resets any question whose words change back to draft and clears
--     its reviewer, whichever path the change arrived by.
--
-- Questions removed from the markdown are RETIRED, not deleted: a retired row
-- stops being served while the record that it existed, and any student's
-- answers to it, stay intact.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create temp table incoming_questions (
  source_key text primary key,
  acs_code text not null,
  knowledge_area text not null,
  objective_id text,
  stem text not null,
  choice_a text not null,
  choice_b text not null,
  choice_c text not null,
  correct_choice char(1) not null,
  explanation text not null,
  figure_ref text,
  figure_supplement text,
  difficulty smallint not null,
  authored_by text,
  source_note text
);

insert into incoming_questions
  (source_key, acs_code, knowledge_area, objective_id, stem, choice_a, choice_b,
   choice_c, correct_choice, explanation, figure_ref, figure_supplement,
   difficulty, authored_by, source_note)
values
  ('PA.I.C.K2a.q1', 'PA.I.C.K2a', 'Aviation weather and weather services', 's1-weather-intro.metar-and-taf', 'What does a METAR tell you?', 'Conditions that were observed at a station at a particular time', 'Conditions forecast for an airport over a coming period', 'Conditions reported by a pilot from the air', 'A', 'A METAR is an observation — what was measured, where, and when. B describes a TAF, which is a forecast covering a period around an airport. C describes a pilot report, which comes from an aircraft rather than a reporting station. The distinction matters because only one of the three can be wrong about the future.', null, null, 1, 'Claude (Opus 5), written from the sources named per question', 'PHAK, aviation weather services chapter — METAR versus TAF'),
  ('PA.I.C.K2a.q2', 'PA.I.C.K2a', 'Aviation weather and weather services', 's1-weather-intro.metar-and-taf', 'The wind in a written METAR and the wind a tower reads to you are referenced differently. How?', 'The written report uses true north; the spoken wind is magnetic', 'Both are magnetic, so they always agree', 'The written report is referenced to the runway in use', 'A', 'Written reports give wind direction relative to true north, while a tower or ATIS speaks it relative to magnetic north — the same reference runways are numbered in. B is wrong because the two references genuinely differ, which is why a runway chosen from a written report can surprise you. C is wrong because no weather report is referenced to a runway; runway selection is something you work out from the wind, not something the report does for you.', null, null, 2, 'Claude (Opus 5), written from the sources named per question', 'AIM, wind direction reporting — true versus magnetic reference'),
  ('PA.I.C.K3d.q1', 'PA.I.C.K3d', 'Aviation weather and weather services', 's1-weather-intro.weather-drivers', 'Through the afternoon the temperature and the dew point move closer together. What does that suggest?', 'The air is drying out', 'Visible moisture is becoming more likely', 'The wind is about to strengthen', 'B', 'The dew point is the temperature at which air can hold no more water vapour, so a narrowing spread means the air is closer to giving that moisture up as cloud, mist or fog. A is backwards: a narrowing spread means the opposite of drying. C is unrelated — wind comes from pressure differences, not from the spread.', null, null, 2, 'Claude (Opus 5), written from the sources named per question', 'PHAK, weather theory chapter — temperature, dew point and condensation'),
  ('PA.I.C.K3i.q1', 'PA.I.C.K3i', 'Aviation weather and weather services', 's1-weather-intro.fog-storms-icing', 'What has to be present for structural ice to form on an airframe?', 'Freezing temperatures alone', 'Visible moisture alone', 'Visible moisture, and a temperature at or below freezing where the aircraft is flying', 'C', 'Structural ice needs both at once: something to freeze, and cold enough for it to freeze on the airframe. A is wrong because cold clear air leaves nothing to accumulate. B is wrong because cloud well above freezing does not ice an aircraft. The pair is what makes icing forecastable rather than a surprise.', null, null, 2, 'Claude (Opus 5), written from the sources named per question', 'PHAK, weather theory chapter — structural icing conditions'),
  ('PA.I.C.K3.q1', 'PA.I.C.K3', 'Aviation weather and weather services', 's1-weather-intro.fog-storms-icing', 'Which combination is required for a thunderstorm to form?', 'Moisture, unstable air, and a lifting action', 'Cold air, high pressure, and strong surface wind', 'Rain already falling, high humidity, and darkness', 'A', 'All three ingredients must be present: water vapour to work with, air that keeps rising once started, and something to start it — heating, terrain or a front. B describes conditions more typical of a clear, stable day. C confuses a consequence with a cause: rain is something a storm produces, not something it needs to begin.', null, null, 3, 'Claude (Opus 5), written from the sources named per question', 'PHAK, weather theory chapter — thunderstorm formation requirements');

-- ---------------------------------------------------------------
-- Refuse to run if a question points at an objective that does not exist. A
-- typo would otherwise import a question that can never be linked back to a
-- lesson for the student to go and read.
-- ---------------------------------------------------------------

do $check$
declare
  unknown_objectives text;
begin
  select string_agg(distinct i.objective_id, ', ' order by i.objective_id)
    into unknown_objectives
  from incoming_questions i
  where i.objective_id is not null
    and not exists (
      select 1 from public.learning_objectives o where o.id = i.objective_id
    );

  if unknown_objectives is not null then
    raise exception
      'Refusing to import: these objective ids do not exist: %. Check them against learning_objectives.',
      unknown_objectives;
  end if;
end;
$check$;

-- ---------------------------------------------------------------
-- Upsert on source_key. Content changes trip 0026's trigger, which returns
-- the row to draft and clears its reviewer.
-- ---------------------------------------------------------------

insert into public.question_bank
  (source_key, acs_code, knowledge_area, objective_id, stem, choice_a, choice_b,
   choice_c, correct_choice, explanation, figure_ref, figure_supplement,
   difficulty, authored_by, source_note, review_status)
select source_key, acs_code, knowledge_area, objective_id, stem, choice_a, choice_b,
       choice_c, correct_choice, explanation, figure_ref, figure_supplement,
       difficulty, authored_by, source_note, 'draft'
from incoming_questions
on conflict (source_key) do update set
  acs_code          = excluded.acs_code,
  knowledge_area    = excluded.knowledge_area,
  objective_id      = excluded.objective_id,
  stem              = excluded.stem,
  choice_a          = excluded.choice_a,
  choice_b          = excluded.choice_b,
  choice_c          = excluded.choice_c,
  correct_choice    = excluded.correct_choice,
  explanation       = excluded.explanation,
  figure_ref        = excluded.figure_ref,
  figure_supplement = excluded.figure_supplement,
  difficulty        = excluded.difficulty,
  authored_by       = excluded.authored_by,
  source_note       = excluded.source_note;

-- ---------------------------------------------------------------
-- Retire what the documents no longer contain. Only rows that came from this
-- pipeline: anything with no source_key was written by hand and is not ours
-- to retire.
-- ---------------------------------------------------------------

update public.question_bank q
set review_status = 'retired'
where q.source_key is not null
  and q.review_status <> 'retired'
  and not exists (
    select 1 from incoming_questions i where i.source_key = q.source_key
  );

drop table incoming_questions;

-- ---------------------------------------------------------------
-- Report. Expect 5 questions, all draft until a CFI signs them.
-- ---------------------------------------------------------------

select
  count(*) as total_questions,
  count(*) filter (where review_status = 'draft') as draft,
  count(*) filter (where review_status = 'cfi_approved') as approved,
  count(*) filter (where review_status = 'retired') as retired,
  count(distinct acs_code) as acs_codes_covered
from public.question_bank;
