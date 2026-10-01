/**
 * The runway holding position marking, and which side of it you are on.
 *
 * Drawn from the handbook's airport operations chapter and the AIM's marking
 * standards. These are the same at every airport in the United States, which
 * is what makes them safe to draw: unlike an airspeed or a pattern altitude,
 * nothing here varies by aircraft or by field.
 *
 * THE MOST SAFETY-CRITICAL PICTURE IN STAGE 1. A runway incursion is one of
 * the few things in this stage that kills people, and it is almost entirely a
 * recognition problem — a student either knows what four yellow lines and a red
 * sign mean or they do not. It cannot be reasoned out from first principles,
 * and the target student has, by definition, never stood on a taxiway.
 *
 * THE ASYMMETRY IS THE LESSON. Solid lines face the holding side; dashed lines
 * face the runway side. Approaching, you meet the solid pair first and must
 * stop unless you have been cleared. Leaving, you are only clear of the runway
 * once the whole aeroplane is past the dashed pair — which is why the diagram
 * shows both directions rather than one.
 *
 * No clearance wording is put in a student's mouth here. What ATC says, and
 * what to read back, belongs with their instructor and the AIM.
 */

export function HoldShortDiagram() {
  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-labelledby="hold-title hold-desc"
      className="h-auto w-full"
    >
      <title id="hold-title">
        A runway holding position marking seen from above, with its sign
      </title>
      <desc id="hold-desc">
        A taxiway meets a runway. Across the taxiway lie four yellow lines: two
        solid on the taxiway side, nearest the holding aircraft, and two dashed
        on the runway side. An aircraft taxiing towards the runway must stop
        before the solid lines unless it has been cleared to cross or to enter.
        An aircraft that has landed is only clear of the runway once it is
        entirely past the dashed lines. Beside the marking stands a red sign
        with white numbers naming the runway ahead.
      </desc>

      {/* --- the runway ---------------------------------------------------- */}
      <rect x={0} y={0} width={400} height={118} className="fill-muted" />
      <line
        x1={0}
        y1={118}
        x2={400}
        y2={118}
        className="stroke-foreground"
        strokeWidth={2}
      />
      <g className="stroke-background" strokeWidth={5} strokeDasharray="26 22">
        <line x1={0} y1={58} x2={400} y2={58} />
      </g>
      <text
        x={16}
        y={34}
        className="fill-muted-foreground text-[16px] font-semibold tracking-[0.15em]"
      >
        RUNWAY
      </text>

      {/* --- the holding position marking ---------------------------------- */}
      {/* Dashed pair on the runway side. */}
      <g className="stroke-gold-strong" strokeWidth={5} strokeDasharray="16 12">
        <line x1={8} y1={134} x2={392} y2={134} />
        <line x1={8} y1={148} x2={392} y2={148} />
      </g>
      {/* Solid pair on the holding side. */}
      <g className="stroke-gold-strong" strokeWidth={5}>
        <line x1={8} y1={166} x2={392} y2={166} />
        <line x1={8} y1={180} x2={392} y2={180} />
      </g>

      {/* --- the taxiway --------------------------------------------------- */}
      <text
        x={16}
        y={286}
        className="fill-muted-foreground text-[16px] font-semibold tracking-[0.15em]"
      >
        TAXIWAY
      </text>

      {/* --- the mandatory sign -------------------------------------------- */}
      {/* White on red means a runway is ahead: do not pass it without a
          clearance. The only sign colour that forbids something. */}
      <g>
        <rect
          x={282}
          y={198}
          width={100}
          height={48}
          rx={4}
          fill="#B3261E"
          className="stroke-foreground"
          strokeWidth={2}
        />
        <text
          x={332}
          y={231}
          textAnchor="middle"
          fill="#FFFFFF"
          className="text-[26px] font-bold"
        >
          15-33
        </text>
      </g>
      <text
        x={332}
        y={268}
        textAnchor="middle"
        className="fill-muted-foreground text-[16px] font-medium"
      >
        The runway ahead
      </text>

      {/* --- which way you are going --------------------------------------- */}
      <defs>
        <marker
          id="hs-arrow"
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

      {/* Approaching: stop at the solid lines. */}
      <line
        x1={70}
        y1={262}
        x2={70}
        y2={196}
        className="stroke-foreground"
        strokeWidth={3}
        strokeLinecap="round"
        markerEnd="url(#hs-arrow)"
      />
      <text
        x={86}
        y={222}
        className="fill-foreground text-[16px] font-semibold"
      >
        Hold here
      </text>
      <text
        x={86}
        y={242}
        className="fill-muted-foreground text-[16px]"
      >
        Solid lines on your side
      </text>

      {/* Leaving: clear once past the dashed lines. */}
      <line
        x1={190}
        y1={126}
        x2={190}
        y2={190}
        className="stroke-foreground"
        strokeWidth={3}
        strokeLinecap="round"
        markerEnd="url(#hs-arrow)"
      />
      <text
        x={204}
        y={104}
        className="fill-foreground text-[16px] font-semibold"
      >
        Clear of the runway
      </text>
      <text
        x={204}
        y={84}
        className="fill-muted-foreground text-[16px]"
      >
        Only once fully past
      </text>
    </svg>
  );
}
