/**
 * The pitot-static system: which instrument is fed by which source.
 *
 * Drawn from the handbook's own pitot-static figure and its labelling — pitot
 * tube, ram air, static port and the three instruments.
 *
 * THE TEACHING POINT IS THE PLUMBING, not the instrument faces. Only the
 * airspeed indicator receives ram air; all three receive static. That single
 * fact is what lets a student reason out a blocked pitot tube or a blocked
 * static port instead of memorising a table of symptoms, so the two lines are
 * drawn in different colours and named in a legend rather than left to be
 * traced.
 *
 * The dials are deliberately blank. A needle position would be a reading, and
 * a reading on a schematic is a number a student may carry away as typical.
 *
 * Instrument names sit UNDER the dials, not beside them. Beside them the
 * drawing needed 520 units of width, which on a 375px phone rendered the
 * labels at 9px — measured. Underneath, the same diagram fits 400 units and
 * every label clears 11px on the same phone.
 */

type InstrumentProps = { cy: number; name: string };

function Instrument({ cy, name }: InstrumentProps) {
  return (
    <>
      <circle
        cx={298}
        cy={cy}
        r={28}
        className="fill-muted stroke-foreground"
        strokeWidth={2}
      />
      <circle
        cx={298}
        cy={cy}
        r={20}
        className="fill-background stroke-foreground"
        strokeWidth={1.5}
        opacity={0.7}
      />
      <text
        x={298}
        y={cy + 44}
        textAnchor="middle"
        className="fill-foreground text-[16px] font-semibold"
      >
        {name}
      </text>
    </>
  );
}

export function PitotStaticDiagram() {
  return (
    <svg
      viewBox="0 0 400 346"
      role="img"
      aria-labelledby="pitot-title pitot-desc"
      className="h-auto w-full"
    >
      <title id="pitot-title">
        The pitot-static system and the three instruments it feeds
      </title>
      <desc id="pitot-desc">
        A pitot tube facing forward into the airflow collects ram air, and a
        single line carries it to the airspeed indicator only. A static port set
        flush in the side of the fuselage collects still air, and a second line
        carries it to all three instruments: the airspeed indicator, the
        altimeter and the vertical speed indicator. The airspeed indicator is
        the only instrument connected to both.
      </desc>

      <defs>
        <marker
          id="ps-arrow"
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

      {/* --- ram air into the pitot tube ---------------------------------- */}
      <text
        x={6}
        y={40}
        textAnchor="start"
        className="fill-gold-strong text-[16px] font-semibold"
      >
        Ram air
      </text>
      <line
        x1={6}
        y1={61}
        x2={30}
        y2={61}
        className="stroke-gold-strong"
        strokeWidth={2.5}
        strokeLinecap="round"
        markerEnd="url(#ps-arrow)"
      />

      {/* the pitot tube itself */}
      <path
        d="M 34 52 L 68 52 L 68 70 L 34 70 Z"
        className="fill-muted stroke-foreground"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <line
        x1={51}
        y1={70}
        x2={51}
        y2={82}
        className="stroke-foreground"
        strokeWidth={2}
      />
      <text
        x={30}
        y={100}
        textAnchor="start"
        className="fill-muted-foreground text-[16px] font-medium"
      >
        Pitot tube
      </text>

      {/* --- the fuselage wall and the static port ------------------------ */}
      <line
        x1={26}
        y1={142}
        x2={26}
        y2={252}
        className="stroke-foreground"
        strokeWidth={3}
      />
      <rect
        x={21}
        y={190}
        width={10}
        height={16}
        className="fill-muted stroke-foreground"
        strokeWidth={2}
      />
      <text
        x={36}
        y={234}
        textAnchor="start"
        className="fill-muted-foreground text-[16px] font-medium"
      >
        Static port
      </text>

      {/* --- the pitot line: to the airspeed indicator only --------------- */}
      <path
        d="M 68 61 L 210 61 L 210 46 L 270 46"
        className="stroke-gold-strong"
        strokeWidth={3}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* --- the static line: a trunk feeding all three ------------------- */}
      <g
        className="stroke-foreground"
        strokeWidth={2.5}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M 31 198 L 160 198" />
        <path d="M 160 74 L 160 250" />
        <path d="M 160 74 L 270 74" />
        <path d="M 160 158 L 270 158" />
        <path d="M 160 250 L 270 250" />
      </g>

      {/* --- the instruments ---------------------------------------------- */}
      <Instrument cy={60} name="Airspeed" />
      <Instrument cy={158} name="Altimeter" />
      <Instrument cy={250} name="Vertical speed" />

      {/* --- legend -------------------------------------------------------- */}
      <g className="text-[16px] font-medium">
        <line
          x1={8}
          y1={312}
          x2={34}
          y2={312}
          className="stroke-gold-strong"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <text x={42} y={317} className="fill-muted-foreground">
          Ram air &mdash; airspeed only
        </text>
        <line
          x1={8}
          y1={336}
          x2={34}
          y2={336}
          className="stroke-foreground"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <text x={42} y={341} className="fill-muted-foreground">
          Static &mdash; all three
        </text>
      </g>
    </svg>
  );
}
