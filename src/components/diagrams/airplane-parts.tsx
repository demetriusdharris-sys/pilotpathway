/**
 * The five major components of an airplane.
 *
 * Drawn from the handbook's own airplane components figure and its labelling:
 * empennage, powerplant, fuselage, wing, landing gear.
 *
 * THESE FIVE AND NO MORE. The same handbook page goes on to name bulkheads,
 * stringers, longerons and struts, and a first lesson that named all of them
 * would teach a student to skim. The five are the ones a CFI will point at on
 * a walk-round, and the ones every later lesson builds on.
 *
 * "Empennage" rather than "tail" because it is the word on the checklist, in
 * the handbook and in the oral exam. Lowering the vocabulary is exactly the
 * kind of well-meant adaptation that leaves a student unprepared in the room
 * where it counts.
 */

const CALLOUTS: ReadonlyArray<{
  label: string;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  line: string;
}> = [
  {
    label: "Powerplant",
    x: 372,
    y: 112,
    anchor: "start",
    line: "M 374 120 L 350 140",
  },
  {
    label: "Empennage",
    x: 40,
    y: 74,
    anchor: "start",
    line: "M 96 80 L 112 96",
  },
  {
    label: "Fuselage",
    x: 228,
    y: 110,
    anchor: "middle",
    line: "M 228 118 L 228 138",
  },
  {
    label: "Wing",
    x: 146,
    y: 238,
    anchor: "middle",
    line: "M 160 230 L 208 194",
  },
  {
    label: "Landing gear",
    x: 340,
    y: 256,
    anchor: "middle",
    line: "M 326 248 L 256 222",
  },
];

export function AirplanePartsDiagram() {
  return (
    <svg
      viewBox="0 0 460 286"
      role="img"
      aria-labelledby="parts-title parts-desc"
      className="h-auto w-full"
    >
      <title id="parts-title">
        The five major components of an airplane, seen from the side
      </title>
      <desc id="parts-desc">
        An airplane seen from the side with five parts named. The powerplant is
        the engine and propeller at the nose. The fuselage is the main body. The
        wing extends from the middle of the fuselage. The empennage is the tail
        assembly at the rear, made up of the vertical fin and the horizontal
        tailplane. The landing gear is the wheels beneath the aircraft.
      </desc>

      {/* --- the aeroplane ------------------------------------------------ */}
      <g
        className="fill-muted stroke-foreground"
        strokeWidth={2}
        strokeLinejoin="round"
      >
        {/* fuselage */}
        <path d="M 118 168 L 300 168 Q 336 168 348 158 L 348 144 Q 326 136 300 136 L 150 136 Q 126 142 118 152 Z" />
        {/* vertical fin */}
        <path d="M 118 152 L 100 90 L 122 90 L 140 142 Z" />
        {/* horizontal tailplane */}
        <path d="M 124 146 L 82 146 L 82 155 L 124 155 Z" />
        {/* wing, seen edge on */}
        <path d="M 232 164 L 200 194 L 256 194 L 272 164 Z" />
      </g>

      {/* propeller */}
      <line
        x1={354}
        y1={120}
        x2={354}
        y2={180}
        className="stroke-foreground"
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* --- landing gear -------------------------------------------------- */}
      <g className="stroke-foreground" strokeWidth={3} strokeLinecap="round">
        <line x1={238} y1={192} x2={240} y2={206} />
        <line x1={330} y1={168} x2={332} y2={190} />
      </g>
      <g
        className="fill-background stroke-foreground"
        strokeWidth={2.5}
        strokeLinejoin="round"
      >
        <circle cx={240} cy={216} r={12} />
        <circle cx={332} cy={198} r={9} />
      </g>

      {/* --- callouts ------------------------------------------------------ */}
      <g
        className="stroke-gold-strong"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      >
        {CALLOUTS.map((c) => (
          <path key={c.label} d={c.line} />
        ))}
      </g>
      <g className="fill-foreground text-[14px] font-semibold">
        {CALLOUTS.map((c) => (
          <text key={c.label} x={c.x} y={c.y} textAnchor={c.anchor}>
            {c.label}
          </text>
        ))}
      </g>
    </svg>
  );
}
