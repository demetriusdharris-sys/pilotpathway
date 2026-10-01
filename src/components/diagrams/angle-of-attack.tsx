/**
 * Angle of attack, and the one thing that causes a stall.
 *
 * Drawn from the handbook's own angle-of-attack figure and its labelling:
 * flight path, relative wind, and the same wing at level high speed, level
 * cruise and level low speed.
 *
 * NO DEGREES ANYWHERE, deliberately. The critical angle of attack depends on
 * the airfoil, and a number printed on a picture is exactly what a student
 * repeats as though it were a rule. The point is that the angle is the same
 * every time for a given wing — not what it measures.
 *
 * Three attitudes with the wing level in all three, because "a stall is about
 * angle of attack, not airspeed and not attitude" is the single most misread
 * idea in this stage. A wing can stall at any airspeed and in any attitude,
 * and a picture that only showed a nose-high slow aeroplane would quietly
 * teach the opposite. The caption says it in words as well.
 */

// Radius of the angle wedge. Large enough that the wedge reaches past the
// airfoil's thickness, or it reads as a tick mark buried in the wing.
const R = 46;

type WingProps = {
  /** Angle of attack in degrees, for the drawing only — never labelled. */
  angle: number;
  stalled?: boolean;
};

function Wing({ angle, stalled = false }: WingProps) {
  const rad = (angle * Math.PI) / 180;
  const endX = 52 + R * Math.cos(rad);
  const endY = 70 - R * Math.sin(rad);

  return (
    <svg viewBox="0 0 170 128" role="presentation" className="h-auto w-full">
      <defs>
        <marker
          id={`aoa-arrow-${angle}`}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
      </defs>

      {/* Relative wind: horizontal, because the wing is level in all three. */}
      <g
        className="stroke-muted-foreground"
        strokeWidth={2}
        strokeLinecap="round"
      >
        <line x1={4} y1={70} x2={40} y2={70} markerEnd={`url(#aoa-arrow-${angle})`} />
        <line x1={4} y1={54} x2={30} y2={54} opacity={0.6} />
        <line x1={4} y1={86} x2={30} y2={86} opacity={0.6} />
      </g>

      {/* THE WING GOES DOWN FIRST, and the order is the whole diagram.
          Drawn last — the obvious way — its opaque fill painted over the chord
          line and the angle arc, so the one thing this picture exists to show
          was invisible on the small-angle panel and half hidden on the others.
          The chord line running through the airfoil is also how the handbook
          draws it. */}
      <g transform={`rotate(${-angle} 52 70)`}>
        <path
          d="M 52 70 C 62 60 86 58 106 63 L 132 70 C 102 76 72 77 52 70 Z"
          className="fill-muted stroke-foreground"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </g>

      {/* The chord line, extended, so the angle between it and the wind shows. */}
      <line
        x1={52}
        y1={70}
        x2={endX + 56 * Math.cos(rad)}
        y2={endY - 56 * Math.sin(rad)}
        className="stroke-foreground"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        opacity={0.9}
      />

      {/* The angle itself: a filled wedge from the relative wind round to the
          chord, with its vertex at the leading edge. An arc alone was a short
          stroke lying inside the airfoil and read as a smudge. Filled, the
          three panels can be compared at a glance, which is the entire point —
          the wedge grows, the wing does not change, and the airspeed label
          underneath is the only other thing that differs. */}
      <path
        d={`M 52 70 L ${52 + R} 70 A ${R} ${R} 0 0 0 ${endX} ${endY} Z`}
        className="fill-gold/30 stroke-gold-strong"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

      {/* Separated airflow, only on the stalled one. */}
      {stalled ? (
        <g
          className="stroke-gold-strong"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        >
          <path d="M 86 36 q 7 -7 14 0 q 7 7 14 0" />
          <path d="M 100 24 q 7 -7 14 0 q 7 7 14 0" />
        </g>
      ) : null}
    </svg>
  );
}

const CASES: ReadonlyArray<{
  angle: number;
  label: string;
  says: string;
  stalled?: boolean;
}> = [
  {
    angle: 4,
    label: "Fast",
    says: "Flying quickly, the wing meets the air at a small angle and makes enough lift.",
  },
  {
    angle: 11,
    label: "Slow",
    says: "Flying slowly, the same wing needs a larger angle to make the same lift.",
  },
  {
    angle: 19,
    label: "Stalled",
    says: "Past the critical angle the airflow separates and lift falls away. This is a stall.",
    stalled: true,
  },
];

export function AngleOfAttackDiagram() {
  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {CASES.map((entry) => (
          <li key={entry.label} className="border-border rounded-lg border p-4">
            <Wing angle={entry.angle} stalled={entry.stalled} />
            <p className="mt-2 font-semibold">{entry.label}</p>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              {entry.says}
            </p>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground mt-3 text-sm text-pretty">
        The wing is level in all three. The angle marked in gold is the angle of
        attack &mdash; between the chord line of the wing and the relative wind.
      </p>
    </div>
  );
}
