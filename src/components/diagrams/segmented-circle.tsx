/**
 * How to work out the runway and the pattern with nobody to ask.
 *
 * Drawn from the handbook's airport operations chapter — the wind direction
 * indicators and the segmented circle, with the handbook's own names for the
 * parts: wind cone, landing strip indicator, traffic pattern indicator.
 *
 * WHY THIS IS IN STAGE 1 AT ALL. Most training happens at fields with no tower,
 * where nothing tells you which runway is in use or which way the circuit turns
 * — you look. A student who has only ever been told "enter on the forty-five"
 * has no way to know which side that is at an unfamiliar field, and the answer
 * is painted on the ground in the middle of the airport.
 *
 * TWO PANELS, because they answer two different questions. The wind cone says
 * which runway; the segmented circle says which way round. Students routinely
 * merge them into one half-remembered thing.
 *
 * A right-hand pattern is drawn deliberately. Left traffic is the default and
 * the traffic pattern diagram already shows it; the only reason to read a
 * segmented circle is to catch the case where it is not.
 */

function WindCone() {
  return (
    <svg viewBox="0 0 200 150" role="presentation" className="h-auto w-full">
      <defs>
        <marker
          id="sc-wind"
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

      {/* The wind, coming from the left. */}
      <line
        x1={10}
        y1={34}
        x2={78}
        y2={34}
        className="stroke-muted-foreground"
        strokeWidth={3}
        strokeLinecap="round"
        markerEnd="url(#sc-wind)"
      />

      {/* Mast. */}
      <line
        x1={46}
        y1={62}
        x2={46}
        y2={132}
        className="stroke-foreground"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <line
        x1={28}
        y1={132}
        x2={64}
        y2={132}
        className="stroke-foreground"
        strokeWidth={4}
        strokeLinecap="round"
      />

      {/* The sock: mouth into the wind, tail streaming downwind. */}
      <path
        d="M 50 58 L 150 72 L 150 90 L 50 92 Z"
        className="fill-muted stroke-foreground"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <g className="stroke-gold-strong" strokeWidth={8}>
        <line x1={78} y1={65} x2={78} y2={92} />
        <line x1={112} y1={69} x2={112} y2={91} />
      </g>

      {/* Landing the other way — into the wind. */}
      <g
        className="fill-muted stroke-foreground"
        strokeWidth={2}
        strokeLinejoin="round"
      >
        <path d="M 96 120 L 128 120 L 138 115 L 138 110 L 128 106 L 100 106 L 94 112 Z" />
        <path d="M 114 110 L 110 96 L 118 96 L 124 108 Z" />
      </g>
      <line
        x1={88}
        y1={113}
        x2={64}
        y2={113}
        className="stroke-gold-strong"
        strokeWidth={3}
        strokeLinecap="round"
        markerEnd="url(#sc-wind)"
      />
    </svg>
  );
}

function SegmentedCircle() {
  const segments = [];
  for (let i = 0; i < 8; i++) {
    const a0 = (i * 45 + 6) * (Math.PI / 180);
    const a1 = (i * 45 + 39) * (Math.PI / 180);
    const r = 56;
    segments.push(
      `M ${100 + r * Math.cos(a0)} ${75 + r * Math.sin(a0)} A ${r} ${r} 0 0 1 ${
        100 + r * Math.cos(a1)
      } ${75 + r * Math.sin(a1)}`,
    );
  }

  return (
    <svg viewBox="0 0 200 150" role="presentation" className="h-auto w-full">
      {/* The circle itself, laid out in segments on the ground. */}
      <g
        className="stroke-muted-foreground"
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      >
        {segments.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {/* Landing strip indicators: the runway, as seen from above. */}
      <g className="stroke-foreground" strokeWidth={5} strokeLinecap="round">
        <line x1={88} y1={26} x2={88} y2={124} />
        <line x1={112} y1={26} x2={112} y2={124} />
      </g>

      {/* Traffic pattern indicators: the hook bends the way the base leg lies.
          Bent to the right here, so this field flies right traffic. */}
      <g
        className="stroke-gold-strong"
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 88 26 L 88 16 L 128 16" />
        <path d="M 112 124 L 112 134 L 72 134" />
      </g>
    </svg>
  );
}

export function SegmentedCircleDiagram() {
  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li className="border-border rounded-lg border p-4">
          <WindCone />
          <p className="mt-2 font-semibold">Which runway</p>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            The cone fills from the open end, so it streams away from the wind.
            Here the wind comes from the left, so you land towards the left
            &mdash; into it. Aircraft take off and land into the wind.
          </p>
        </li>

        <li className="border-border rounded-lg border p-4">
          <SegmentedCircle />
          <p className="mt-2 font-semibold">Which way round</p>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            The two long bars are the runway seen from above. The hook at each
            end bends the way the base leg lies &mdash; bent right, as here, the
            field flies right traffic rather than the usual left.
          </p>
        </li>
      </ul>

      <p className="text-muted-foreground mt-3 text-sm text-pretty">
        Both sit in the open, away from the runways, so they can be read from
        the air. At a field with no tower this is often the only thing that will
        tell you.
      </p>
    </div>
  );
}
