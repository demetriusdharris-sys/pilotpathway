/**
 * The standard left-hand traffic pattern, leg by leg.
 *
 * Drawn from the handbook's own labelling of its single-runway traffic pattern
 * figure: entry, crosswind, downwind, base, final, departure. Those are the
 * words a student will hear on the radio and read in the AIM, so they are the
 * words on the picture.
 *
 * LEFT TRAFFIC ONLY, and the caption says so. Right-hand patterns exist and are
 * published per runway; a diagram implying every pattern turns left would teach
 * something a student has to unlearn at the first airport that does not.
 *
 * No altitudes and no distances. Pattern altitude varies by airport and by
 * aircraft category, and a number on a picture is the kind of thing a student
 * repeats as though it were a rule.
 *
 * The entry arrow deliberately meets the downwind leg well above the leg's own
 * label. Drawn the obvious way, at midfield next to the word, the arrowhead
 * lands on top of "Downwind" and the two become unreadable together.
 */

const LEGS: ReadonlyArray<{ d: string; label: string }> = [
  { d: "M 250 80 L 250 48", label: "Departure" },
  { d: "M 250 42 L 126 42", label: "Crosswind" },
  { d: "M 120 48 L 120 272", label: "Downwind" },
  { d: "M 126 278 L 242 278", label: "Base" },
  { d: "M 250 272 L 250 254", label: "Final" },
];

const CORNERS = [
  "M 250 48 Q 250 42 244 42",
  "M 126 42 Q 120 42 120 48",
  "M 120 272 Q 120 278 126 278",
  "M 242 278 Q 250 278 250 272",
];

export function TrafficPatternDiagram() {
  return (
    <svg
      viewBox="0 0 400 330"
      role="img"
      aria-labelledby="pattern-title pattern-desc"
      className="h-auto w-full"
    >
      <title id="pattern-title">
        The standard left-hand traffic pattern at an airport
      </title>
      <desc id="pattern-desc">
        A runway seen from above with a rectangular circuit around it. An
        aircraft enters at forty-five degrees to the downwind leg, which runs
        parallel to the runway in the opposite direction to landing. It then
        turns left onto base, left again onto final, and lands. After take-off
        it climbs straight ahead on the departure leg, then turns left onto
        crosswind and left again to rejoin downwind. Every turn is to the left.
      </desc>

      <defs>
        <marker
          id="tp-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
      </defs>

      {/* --- the runway -------------------------------------------------- */}
      <rect
        x={240}
        y={80}
        width={20}
        height={172}
        rx={2}
        className="fill-muted stroke-foreground"
        strokeWidth={2}
      />
      <line
        x1={250}
        y1={96}
        x2={250}
        y2={236}
        className="stroke-foreground"
        strokeWidth={2}
        strokeDasharray="8 10"
        opacity={0.5}
      />
      <text
        transform="rotate(-90 282 166)"
        x={282}
        y={166}
        textAnchor="middle"
        className="fill-muted-foreground text-[16px] font-medium tracking-[0.18em]"
      >
        RUNWAY
      </text>

      {/* --- the circuit -------------------------------------------------- */}
      <g
        className="stroke-foreground"
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
      >
        {LEGS.map((leg) => (
          <path key={leg.label} d={leg.d} markerEnd="url(#tp-arrow)" />
        ))}
      </g>

      {/* The turns, so the circuit reads as one path rather than five arrows. */}
      <g
        className="stroke-foreground"
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        opacity={0.55}
      >
        {CORNERS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {/* --- the 45 degree entry ------------------------------------------ */}
      <path
        d="M 56 96 L 112 152"
        className="stroke-gold-strong"
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        markerEnd="url(#tp-arrow)"
      />
      <text
        x={28}
        y={86}
        textAnchor="start"
        className="fill-gold-strong text-[16px] font-semibold"
      >
        Entry, 45&deg;
      </text>

      {/* --- leg names ---------------------------------------------------- */}
      <g className="fill-foreground text-[16px] font-semibold">
        <text x={268} y={62} textAnchor="start">
          Departure
        </text>
        <text x={186} y={30} textAnchor="middle">
          Crosswind
        </text>
        <text x={110} y={234} textAnchor="end">
          Downwind
        </text>
        <text x={184} y={300} textAnchor="middle">
          Base
        </text>
        <text x={268} y={272} textAnchor="start">
          Final
        </text>
      </g>
    </svg>
  );
}
