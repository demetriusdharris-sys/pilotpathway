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
      "PHAK, aerodynamics of flight chapter — the four forces in unaccelerated flight.",
    position: 1,
  },
  {
    key: "three-axes",
    lessonSlug: "s1-axes-stability",
    title: "Three axes, three controls",
    caption:
      "Each control moves the aeroplane about one axis, and all three pass through the centre of gravity. In practice they work together — a turn uses aileron and rudder, and holding altitude through it uses elevator.",
    sourceNote:
      "PHAK, flight controls and aerodynamics chapters — the three axes and the primary control for each.",
    position: 1,
  },
];

export function diagramsForLesson(lessonSlug: string): DiagramEntry[] {
  return DIAGRAMS.filter((entry) => entry.lessonSlug === lessonSlug).sort(
    (a, b) => a.position - b.position,
  );
}
