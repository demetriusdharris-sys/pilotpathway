/**
 * Every diagram, as plain data.
 *
 * NO JSX IN THIS FILE, on purpose. `scripts/import-diagrams.mjs` imports it
 * through Node's TypeScript stripping to generate the sync migration, the same
 * way `check-assembly.mjs` reads the practice blueprint. A component here would
 * make it unreadable to Node and the catalogue and the database would drift —
 * which is the failure the card pipeline is built to avoid.
 *
 * The components themselves live in `src/components/diagrams/` and are joined
 * to these entries by key in `src/components/diagrams/index.tsx`.
 *
 * SOURCES ARE NAMED, NEVER NUMBERED. No figure numbers and no chapter numbers:
 * they are revision-specific, and a student who repeats a stale one to an
 * examiner pays for our mistake. Same rule the cards and questions follow.
 */

export type DiagramEntry = {
  /** Permanent. It is what the database row matches on. */
  key: string;
  lessonSlug: string;
  title: string;
  /** Shown under the diagram. Says what case it shows, so nothing is implied. */
  caption: string;
  /** What it was drawn from, for the reviewer. Never shown to a student. */
  sourceNote: string;
  /** Position within the lesson. */
  position: number;
};

export const DIAGRAMS: readonly DiagramEntry[] = [
  {
    key: "four-forces",
    lessonSlug: "s1-four-forces",
    title: "The four forces in steady, level flight",
    caption:
      "In steady, level flight lift balances weight and thrust balances drag. Change any one of them and the aeroplane accelerates, climbs or descends — the forces are only equal while nothing is changing.",
    sourceNote:
      "The handbook's own four forces illustration, from the aerodynamics of flight chapter, cropped clear of its caption. Public domain.",
    position: 1,
  },
  {
    key: "three-axes",
    lessonSlug: "s1-axes-stability",
    title: "Three axes, three controls",
    caption:
      "Each control moves the aeroplane about one axis, and all three pass through the centre of gravity. In practice they work together — a turn uses aileron and rudder, and holding altitude through it uses elevator.",
    sourceNote:
      "The handbook's own axes illustration, cut into its three panels so it stays readable on a phone. The control named under each panel is ours — the handbook's artwork names the motion and the axis but not the control. Public domain.",
    position: 1,
  },
  {
    key: "airplane-parts",
    lessonSlug: "s1-airplane-parts",
    title: "The five major components",
    caption:
      "Powerplant, fuselage, wing, empennage and landing gear. The handbook names smaller parts too — bulkheads, stringers, longerons — but these five are what a CFI points at on a walk-round, and what every later lesson builds on.",
    sourceNote:
      "The handbook's own components illustration, from the aircraft structure chapter, with each part shaded a different colour. Public domain.",
    position: 1,
  },
  {
    key: "angle-of-attack",
    lessonSlug: "s1-stalls",
    title: "Angle of attack, and what actually causes a stall",
    caption:
      "The wing is level in all three. A stall happens when the wing passes its critical angle of attack — which it can do at any airspeed and in any attitude, including a steep turn or a dive. No number is shown because the critical angle depends on the wing.",
    sourceNote:
      "PHAK, aerodynamics of flight chapter — angle of attack at various speeds, and the critical angle of attack.",
    position: 1,
  },
  {
    key: "airspace-profile",
    lessonSlug: "s1-airspace-intro",
    title: "The classes of airspace, in profile",
    caption:
      "A simplified side view, not any particular airport. The altitudes shown are fixed by regulation and are the same everywhere; the shapes of real Class B and C airspace are drawn per airport and no two are alike, so the sectional chart is what tells you where you are.",
    sourceNote:
      "PHAK, airspace chapter — the airspace profile figure, with the 700 ft AGL, 1,200 ft AGL, 14,500 ft MSL and 18,000 ft MSL boundaries it marks. Altitudes are from 14 CFR part 71.",
    position: 1,
  },
  {
    key: "four-stroke",
    lessonSlug: "s1-engines-fuel",
    title: "The four-stroke cycle",
    caption:
      "Intake, compression, power, exhaust — in that order, in every cylinder. The crankshaft turns twice for each single power stroke, which is why a four-cylinder engine still runs smoothly on one power stroke at a time.",
    sourceNote:
      "PHAK, aircraft systems chapter — the four-stroke cycle figure and the parts it names.",
    position: 1,
  },
  {
    key: "pitot-static",
    lessonSlug: "s1-pitot-static-gyro",
    title: "What feeds which instrument",
    caption:
      "Only the airspeed indicator receives ram air from the pitot tube; all three receive static pressure. That one fact is what lets you reason out what a blocked pitot tube or a blocked static port will do, instead of memorising a table of symptoms.",
    sourceNote:
      "PHAK, flight instruments chapter — the pitot-static system figure and its labelling.",
    position: 1,
  },
  {
    key: "traffic-pattern",
    lessonSlug: "s1-pattern",
    title: "The traffic pattern, leg by leg",
    caption:
      "A standard left-hand pattern. Right-hand patterns exist and are published per runway, so check before you fly. No altitude is shown because pattern altitude varies by airport and by aircraft.",
    sourceNote:
      "PHAK, airport operations chapter — the single-runway traffic pattern figure. Leg names taken from the handbook's own labelling.",
    position: 1,
  },
  {
    key: "hold-short",
    lessonSlug: "s1-airport-ramp",
    title: "The runway holding position marking",
    caption:
      "Solid lines face the side you hold on; dashed lines face the runway. Taxiing out you meet the solid pair first and stop there unless you have been cleared. Landing, you are only clear of the runway once the whole aeroplane is past the dashed pair.",
    sourceNote:
      "PHAK, airport operations chapter, and the AIM's marking standards. Identical at every US airport, so nothing here varies by field or aircraft.",
    position: 1,
  },
  {
    key: "airport-signs",
    lessonSlug: "s1-airport-ramp",
    title: "Reading the signs",
    caption:
      "One rule covers all of them: a black background says where you are, a yellow background says where you are going, and red says stop and get a clearance first. The letters shown are generic — no real airport's layout is reproduced.",
    sourceNote:
      "PHAK, airport operations chapter, and the AIM's sign standards. The colour code is national.",
    position: 2,
  },
  {
    key: "segmented-circle",
    lessonSlug: "s1-airport-ramp",
    title: "Working out the runway with nobody to ask",
    caption:
      "At a field with no tower this is often the only thing that will tell you. The wind cone says which runway; the segmented circle's hooks say which way the circuit turns. A right-hand pattern is drawn here deliberately — the only reason to read one is to catch the case that is not the usual left.",
    sourceNote:
      "PHAK, airport operations chapter — wind direction indicators and the segmented circle, with the handbook's own names for the parts.",
    position: 3,
  },
];

export function diagramsForLesson(lessonSlug: string): DiagramEntry[] {
  return DIAGRAMS.filter((entry) => entry.lessonSlug === lessonSlug).sort(
    (a, b) => a.position - b.position,
  );
}
