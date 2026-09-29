-- GENERATED FILE. Do not hand-edit it. Regenerate with:
--
--     node scripts/import-diagrams.mjs
--
-- The catalogue in src/lib/diagrams/catalogue.ts is the source of truth, and
-- the drawings are React components joined to it by key. This file carries only
-- what a reviewer reads and what a student reads underneath the picture.
--
-- Safe to re-run. Two things it will never do:
--
--   * It never approves a diagram. Everything arrives as 'draft', and a diagram
--     asserts facts — the four forces are only equal in unaccelerated flight,
--     and a picture that implied otherwise teaches something to unlearn.
--   * It never keeps an approval alive across a wording change. A changed title
--     or caption knocks the diagram back to draft and clears its reviewer.
--
-- Diagrams dropped from the catalogue are retired, not deleted.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create temp table incoming_diagrams (
  diagram_key text primary key,
  lesson_slug text not null,
  position integer not null,
  title text not null,
  caption text not null,
  source_note text
);

insert into incoming_diagrams
  (diagram_key, lesson_slug, position, title, caption, source_note)
values
  ('four-forces', 's1-four-forces', 1, 'The four forces in steady, level flight', 'In steady, level flight lift balances weight and thrust balances drag. Change any one of them and the aeroplane accelerates, climbs or descends — the forces are only equal while nothing is changing.', 'PHAK, aerodynamics of flight chapter — the four forces in unaccelerated flight.'),
  ('three-axes', 's1-axes-stability', 1, 'Three axes, three controls', 'Each control moves the aeroplane about one axis, and all three pass through the centre of gravity. In practice they work together — a turn uses aileron and rudder, and holding altitude through it uses elevator.', 'PHAK, flight controls and aerodynamics chapters — the three axes and the primary control for each.'),
  ('airplane-parts', 's1-airplane-parts', 1, 'The five major components', 'Powerplant, fuselage, wing, empennage and landing gear. The handbook names smaller parts too — bulkheads, stringers, longerons — but these five are what a CFI points at on a walk-round, and what every later lesson builds on.', 'PHAK, aircraft structure chapter — the major components of an airplane. Labels taken from the handbook''s own figure.'),
  ('angle-of-attack', 's1-stalls', 1, 'Angle of attack, and what actually causes a stall', 'The wing is level in all three. A stall happens when the wing passes its critical angle of attack — which it can do at any airspeed and in any attitude, including a steep turn or a dive. No number is shown because the critical angle depends on the wing.', 'PHAK, aerodynamics of flight chapter — angle of attack at various speeds, and the critical angle of attack.'),
  ('airspace-profile', 's1-airspace-intro', 1, 'The classes of airspace, in profile', 'A simplified side view, not any particular airport. The altitudes shown are fixed by regulation and are the same everywhere; the shapes of real Class B and C airspace are drawn per airport and no two are alike, so the sectional chart is what tells you where you are.', 'PHAK, airspace chapter — the airspace profile figure, with the 700 ft AGL, 1,200 ft AGL, 14,500 ft MSL and 18,000 ft MSL boundaries it marks. Altitudes are from 14 CFR part 71.'),
  ('four-stroke', 's1-engines-fuel', 1, 'The four-stroke cycle', 'Intake, compression, power, exhaust — in that order, in every cylinder. The crankshaft turns twice for each single power stroke, which is why a four-cylinder engine still runs smoothly on one power stroke at a time.', 'PHAK, aircraft systems chapter — the four-stroke cycle figure and the parts it names.'),
  ('pitot-static', 's1-pitot-static-gyro', 1, 'What feeds which instrument', 'Only the airspeed indicator receives ram air from the pitot tube; all three receive static pressure. That one fact is what lets you reason out what a blocked pitot tube or a blocked static port will do, instead of memorising a table of symptoms.', 'PHAK, flight instruments chapter — the pitot-static system figure and its labelling.'),
  ('traffic-pattern', 's1-pattern', 1, 'The traffic pattern, leg by leg', 'A standard left-hand pattern. Right-hand patterns exist and are published per runway, so check before you fly. No altitude is shown because pattern altitude varies by airport and by aircraft.', 'PHAK, airport operations chapter — the single-runway traffic pattern figure. Leg names taken from the handbook''s own labelling.');

-- ---------------------------------------------------------------
-- Refuse to run if a diagram points at a lesson that does not exist. A typo in
-- a slug would otherwise import a diagram nobody ever sees.
-- ---------------------------------------------------------------

do $check$
declare
  unknown_lessons text;
begin
  select string_agg(distinct i.lesson_slug, ', ' order by i.lesson_slug)
    into unknown_lessons
  from incoming_diagrams i
  where not exists (
    select 1 from public.curriculum_lessons l where l.slug = i.lesson_slug
  );

  if unknown_lessons is not null then
    raise exception
      'Refusing to import: these lesson slugs do not exist: %.', unknown_lessons;
  end if;
end;
$check$;

insert into public.lesson_diagrams
  (diagram_key, lesson_slug, position, title, caption, source_note, status)
select diagram_key, lesson_slug, position, title, caption, source_note, 'draft'
from incoming_diagrams
on conflict (diagram_key) do update set
  lesson_slug = excluded.lesson_slug,
  position    = excluded.position,
  title       = excluded.title,
  caption     = excluded.caption,
  source_note = excluded.source_note,
  updated_at  = now(),
  status = case
    when public.lesson_diagrams.title is distinct from excluded.title
      or public.lesson_diagrams.caption is distinct from excluded.caption
    then 'draft'
    else public.lesson_diagrams.status
  end,
  reviewed_by = case
    when public.lesson_diagrams.title is distinct from excluded.title
      or public.lesson_diagrams.caption is distinct from excluded.caption
    then null
    else public.lesson_diagrams.reviewed_by
  end,
  reviewed_at = case
    when public.lesson_diagrams.title is distinct from excluded.title
      or public.lesson_diagrams.caption is distinct from excluded.caption
    then null
    else public.lesson_diagrams.reviewed_at
  end;

update public.lesson_diagrams d
set status = 'retired', updated_at = now()
where d.status <> 'retired'
  and not exists (
    select 1 from incoming_diagrams i where i.diagram_key = d.diagram_key
  );

drop table incoming_diagrams;

-- ---------------------------------------------------------------
-- Report.
-- ---------------------------------------------------------------

select
  count(*) as total_diagrams,
  count(*) filter (where status = 'draft') as draft_diagrams,
  count(*) filter (where status = 'approved') as approved_diagrams,
  count(*) filter (where status = 'retired') as retired_diagrams
from public.lesson_diagrams;
