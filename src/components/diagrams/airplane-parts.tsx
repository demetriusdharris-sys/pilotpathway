import { HandbookFigure, HandbookCredit } from "./handbook-figure";

/**
 * The five major components of an airplane.
 *
 * The handbook's own illustration. It is a three-quarter view with each
 * component shaded a different colour, which does something a side-on line
 * drawing cannot: the empennage reads as one assembly rather than two fins, and
 * the wing is visibly a surface rather than an edge. That was what the
 * hand-drawn version got worst.
 *
 * FIVE AND NO MORE, which is why this figure and not the one beside it in the
 * handbook. The facing page breaks the same aeroplane into bulkheads,
 * stringers, longerons and struts, and a first lesson naming all of them
 * teaches a student to skim. These five are what a CFI points at on a
 * walk-round and what every later lesson builds on.
 *
 * "Empennage" rather than "tail", here because the handbook labels it so and in
 * our own writing because it is the word on the checklist and in the oral exam.
 * Lowering the vocabulary is exactly the kind of well-meant adaptation that
 * leaves a student unprepared in the room where it counts.
 */
export function AirplanePartsDiagram() {
  return (
    <div>
      <HandbookFigure
        src="/figures/airplane-parts.webp"
        width={732}
        height={516}
        alt="A high-wing aeroplane seen from in front and above, with five parts shaded in different colours and labelled. The powerplant is the engine and propeller at the nose. The fuselage is the main body. The wing extends from the top of the fuselage on each side. The empennage is the tail assembly, both the upright fin and the horizontal surfaces. The landing gear is the wheels beneath."
      />
      <HandbookCredit />
    </div>
  );
}
