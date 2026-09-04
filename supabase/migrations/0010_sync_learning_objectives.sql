-- 0010: sync learning objectives from src/lib/curriculum.ts.
--
-- GENERATED FILE. Do not hand-edit it. Regenerate it from
-- src/lib/curriculum.ts, which stays the source of truth for objective ids,
-- text, ordering, and the safety-critical flag. Editing this file by hand is
-- how the two drift apart, and a drifted id is an orphaned mastery record.
--
-- Safe to re-run. The upsert is idempotent: running it twice changes nothing
-- the second time, and an objective that was retired and has since returned to
-- the curriculum is unretired rather than duplicated.
--
-- It refuses to run if it would retire an objective that already has mastery
-- data. Retiring such a row would strand a student's signals and assessments
-- against an objective that no longer exists, so the check raises and the
-- whole transaction aborts, naming the offending ids.
--
-- Written for the Supabase SQL Editor, which wraps a paste in a transaction of
-- its own. An explicit begin/commit here conflicts with that wrapper and
-- dropped the temp table early, so this file opens no transaction of its own.
-- The editor's transaction is what makes the refusal check able to abort the
-- entire sync, and the temp table is dropped explicitly at the end rather than
-- with ON COMMIT DROP.

-- ---------------------------------------------------------------
-- The curriculum, as it stands in src/lib/curriculum.ts.
-- Position is the objective's index within its lesson, from 1.
-- ---------------------------------------------------------------

create temp table curriculum_objectives (
  id text primary key,
  lesson_slug text not null,
  stage_slug text not null,
  position integer not null,
  text text not null,
  is_safety_critical boolean not null
);

insert into curriculum_objectives
  (id, lesson_slug, stage_slug, position, text, is_safety_critical)
values
  ('s1-welcome.training-path', 's1-welcome', 'stage-1', 1, 'Describe the path from first lesson to private pilot certificate', false),
  ('s1-welcome.what-is-the-acs', 's1-welcome', 'stage-1', 2, 'Explain what the ACS is and how it sets the standard', false),
  ('s1-welcome.cfi-vs-ai', 's1-welcome', 'stage-1', 3, 'State what a human CFI must do that an AI instructor cannot', false),
  ('s1-imsafe-pave.imsafe-checklist', 's1-imsafe-pave', 'stage-1', 1, 'Apply the IMSAFE checklist to your own condition before a flight', true),
  ('s1-imsafe-pave.pave-checklist', 's1-imsafe-pave', 'stage-1', 2, 'Apply the PAVE checklist to pilot, aircraft, environment, and external pressure', true),
  ('s1-imsafe-pave.hazardous-attitudes', 's1-imsafe-pave', 'stage-1', 3, 'Describe the hazardous attitudes and their antidotes', true),
  ('s1-airplane-parts.primary-controls', 's1-airplane-parts', 'stage-1', 1, 'Identify the primary flight controls and the axis each one works about', false),
  ('s1-airplane-parts.flaps', 's1-airplane-parts', 'stage-1', 2, 'Describe what flaps do and when they are used', false),
  ('s1-airplane-parts.major-components', 's1-airplane-parts', 'stage-1', 3, 'Name the major components of a typical training airplane', false),
  ('s1-four-forces.four-forces', 's1-four-forces', 'stage-1', 1, 'Name the four forces and describe how they act in steady flight', false),
  ('s1-four-forces.aoa-and-lift', 's1-four-forces', 'stage-1', 2, 'Explain how angle of attack relates to lift', false),
  ('s1-four-forces.stall-is-aoa', 's1-four-forces', 'stage-1', 3, 'Describe a stall in terms of angle of attack rather than airspeed', true),
  ('s1-axes-stability.three-axes', 's1-axes-stability', 'stage-1', 1, 'Describe motion about the lateral, longitudinal, and vertical axes', false),
  ('s1-axes-stability.stability-vs-control', 's1-axes-stability', 'stage-1', 2, 'Explain the difference between stability and controllability', false),
  ('s1-axes-stability.adverse-yaw', 's1-axes-stability', 'stage-1', 3, 'Describe what adverse yaw is and how it is corrected', false),
  ('s1-engines-fuel.fuel-system-path', 's1-engines-fuel', 'stage-1', 1, 'Trace the fuel system from tank to engine on a typical trainer', true),
  ('s1-engines-fuel.magnetos-and-runup', 's1-engines-fuel', 'stage-1', 2, 'Explain why there are two magnetos and what the runup check confirms', false),
  ('s1-engines-fuel.verify-fuel', 's1-engines-fuel', 'stage-1', 3, 'Describe how to verify fuel quantity and quality before flight', true),
  ('s1-pitot-static-gyro.instrument-groups', 's1-pitot-static-gyro', 'stage-1', 1, 'Identify which instruments are pitot-static and which are gyroscopic', false),
  ('s1-pitot-static-gyro.blocked-pitot-static', 's1-pitot-static-gyro', 'stage-1', 2, 'Describe the indications of a blocked pitot tube and a blocked static port', false),
  ('s1-pitot-static-gyro.six-pack-readings', 's1-pitot-static-gyro', 'stage-1', 3, 'Explain what each instrument in the primary group tells you', false),
  ('s1-airport-ramp.runway-numbering', 's1-airport-ramp', 'stage-1', 1, 'Determine runway numbers from magnetic heading', false),
  ('s1-airport-ramp.markings-and-signs', 's1-airport-ramp', 'stage-1', 2, 'Interpret common runway and taxiway markings and signs', false),
  ('s1-airport-ramp.hold-short', 's1-airport-ramp', 'stage-1', 3, 'Explain what hold short means and why it is never optional', true),
  ('s1-radio.standard-call', 's1-radio', 'stage-1', 1, 'Build a standard radio call: who you are calling, who you are, where you are, what you want', false),
  ('s1-radio.nontowered-ctaf', 's1-radio', 'stage-1', 2, 'Describe operating at a nontowered airport using the CTAF', false),
  ('s1-radio.readback-errors', 's1-radio', 'stage-1', 3, 'Explain what to do after a readback error or a missed call', false),
  ('s1-airspace-intro.airspace-classes', 's1-airspace-intro', 'stage-1', 1, 'Describe the dimensions and entry requirements of each airspace class', false),
  ('s1-airspace-intro.vfr-minimums', 's1-airspace-intro', 'stage-1', 2, 'State the basic VFR weather minimums a student pilot will use', true),
  ('s1-airspace-intro.sectional-boundaries', 's1-airspace-intro', 'stage-1', 3, 'Identify airspace boundaries on a sectional chart', false),
  ('s1-weather-intro.weather-drivers', 's1-weather-intro', 'stage-1', 1, 'Describe how temperature, pressure, and moisture drive weather', false),
  ('s1-weather-intro.metar-and-taf', 's1-weather-intro', 'stage-1', 2, 'Read a METAR and a TAF and say what they mean in plain language', false),
  ('s1-weather-intro.fog-storms-icing', 's1-weather-intro', 'stage-1', 3, 'Explain the conditions that produce fog, thunderstorms, and icing', true),
  ('s1-regs-pic.pic-authority', 's1-regs-pic', 'stage-1', 1, 'Describe the authority and responsibility of the pilot in command', true),
  ('s1-regs-pic.student-limitations', 's1-regs-pic', 'stage-1', 2, 'Describe student pilot privileges and limitations', true),
  ('s1-regs-pic.required-documents', 's1-regs-pic', 'stage-1', 3, 'Identify the documents required aboard the aircraft and on your person', false),
  ('s1-preflight.airworthiness', 's1-preflight', 'stage-1', 1, 'Determine whether an aircraft is airworthy before flight', false),
  ('s1-preflight.walkaround-flow', 's1-preflight', 'stage-1', 2, 'Perform a systematic preflight inspection using the checklist', false),
  ('s1-preflight.start-taxi-runup', 's1-preflight', 'stage-1', 3, 'Describe proper engine starting, taxi, and runup procedures', false),
  ('s1-stalls.stall-any-airspeed', 's1-stalls', 'stage-1', 1, 'Explain why a wing can stall at any airspeed and any attitude', true),
  ('s1-stalls.stall-warning-signs', 's1-stalls', 'stage-1', 2, 'Describe the indications that precede a stall', true),
  ('s1-stalls.stall-recovery-spins', 's1-stalls', 'stage-1', 3, 'Describe the general stall recovery procedure and why spin awareness matters', true),
  ('s1-pattern.pattern-legs', 's1-pattern', 'stage-1', 1, 'Describe a standard traffic pattern and each of its legs', false),
  ('s1-pattern.right-of-way', 's1-pattern', 'stage-1', 2, 'State the basic right-of-way rules that apply in the pattern', true),
  ('s1-pattern.go-around', 's1-pattern', 'stage-1', 3, 'Explain when and why to go around', true),
  ('s1-solo-knowledge.solo-endorsements', 's1-solo-knowledge', 'stage-1', 1, 'Describe the knowledge and endorsements required before solo flight', false),
  ('s1-solo-knowledge.solo-limitations', 's1-solo-knowledge', 'stage-1', 2, 'Explain the limitations that apply to a student pilot flying solo', false),
  ('s1-solo-knowledge.who-can-endorse', 's1-solo-knowledge', 'stage-1', 3, 'State who is authorized to endorse you and who is not', false);

-- ---------------------------------------------------------------
-- Refusal check. Runs before any write.
--
-- An objective that has left the curriculum but still carries mastery data
-- must not be retired silently. Someone has to decide what happens to that
-- student history first, so this aborts and says which ids are involved.
-- ---------------------------------------------------------------

do $check$
declare
  stranded text;
begin
  select string_agg(o.id, ', ' order by o.id)
    into stranded
  from public.learning_objectives o
  where not exists (
      select 1 from curriculum_objectives c where c.id = o.id
    )
    and (
      exists (
        select 1 from public.objective_signals s where s.objective_id = o.id
      )
      or exists (
        select 1
        from public.objective_assessments a
        where a.objective_id = o.id
      )
    );

  if stranded is not null then
    raise exception
      'Refusing to sync: these objectives are gone from curriculum.ts but still have mastery data: %. Decide what happens to that history before retiring them.',
      stranded;
  end if;
end;
$check$;

-- ---------------------------------------------------------------
-- Upsert. retired_at is cleared so an objective that comes back is
-- unretired rather than left dead with its history detached.
-- ---------------------------------------------------------------

insert into public.learning_objectives
  (id, lesson_slug, stage_slug, position, text, is_safety_critical)
select id, lesson_slug, stage_slug, position, text, is_safety_critical
from curriculum_objectives
on conflict (id) do update set
  lesson_slug        = excluded.lesson_slug,
  stage_slug         = excluded.stage_slug,
  position           = excluded.position,
  text               = excluded.text,
  is_safety_critical = excluded.is_safety_critical,
  retired_at         = null,
  updated_at         = now();

-- ---------------------------------------------------------------
-- Retire whatever the curriculum no longer contains. Anything that
-- reaches this point has no mastery data, by the check above.
-- ---------------------------------------------------------------

update public.learning_objectives o
set retired_at = now(),
    updated_at = now()
where o.retired_at is null
  and not exists (
    select 1 from curriculum_objectives c where c.id = o.id
  );

drop table curriculum_objectives;

-- ---------------------------------------------------------------
-- Report.
-- ---------------------------------------------------------------

select
  count(*) as total_objectives,
  count(*) filter (where retired_at is null) as active_objectives,
  count(*) filter (where retired_at is not null) as retired_objectives,
  count(*) filter (where is_safety_critical) as safety_critical_objectives
from public.learning_objectives;
