import { HandbookFigure, HandbookCredit } from "./handbook-figure";

/**
 * The four forces in steady, level flight.
 *
 * The handbook's own illustration rather than a drawing of ours. It was drawn
 * by hand first, with gradients and a shadow and a lift strut, and it still
 * looked like a schematic fish — hand-authoring a recognisable Cessna by typing
 * bezier coordinates and checking a screenshot is a slow loop with a mediocre
 * ceiling. The FAA's version is professionally illustrated, public domain and
 * already reviewed. See handbook-figure.tsx for what that costs.
 *
 * The caption carries the qualification the picture cannot. Lift equals weight
 * and thrust equals drag only in UNACCELERATED flight, and the illustration —
 * like every four-forces diagram ever printed — shows four arrows that look
 * permanently equal. A student who took that literally would have to unlearn
 * it, so the caption says which case this is and nothing in the picture is
 * relied on to say it.
 *
 * It still asserts facts, so it goes in the review queue with the cards.
 */
export function FourForcesDiagram() {
  return (
    <div>
      <HandbookFigure
        src="/figures/four-forces.webp"
        width={732}
        height={558}
        alt="A high-wing training aeroplane in level flight with four arrows through it. Lift points up from the wing and weight points down beneath it, both vertical and opposite. Thrust points forward from the propeller and drag points backward from the tail, opposing each other along the line of flight."
      />
      <HandbookCredit />
    </div>
  );
}
