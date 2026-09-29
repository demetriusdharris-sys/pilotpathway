/**
 * The four forces in steady, level flight.
 *
 * Drawn rather than lifted from the handbook, and not for the reason first
 * assumed. The PHAK is public domain and its figures are authoritative, so
 * copying them would be legal — but they cannot be copied. Measured against the
 * 25C edition by scripts/build-phak-figures.mjs: of 522 figures, every teaching
 * diagram is vector artwork drawn by the page content stream itself, with
 * gradient meshes, clipping paths and live text. There is no image to lift. The
 * 378 raster images in the file are photographs — cockpits, buildings, a
 * portrait of an administrator.
 *
 * What the handbook does give us is the brief: each label is its own text block,
 * so it tells us its four forces figure is labelled exactly Lift, Weight, Drag
 * and Thrust. We draw from that. An SVG is a couple of kilobytes, sharp at any
 * size and legible in dark mode, which matters for an audience on cheap phones.
 *
 * It still makes factual claims, so it goes in the review queue with the cards.
 *
 * Deliberately steady flight and nothing else. Lift equals weight and thrust
 * equals drag only in unaccelerated flight, and a diagram that implied the
 * forces are always equal would teach something a student has to unlearn. The
 * caption says which case this is.
 */
export function FourForcesDiagram() {
  return (
    <svg
      viewBox="0 0 420 300"
      role="img"
      aria-labelledby="four-forces-title four-forces-desc"
      className="h-auto w-full"
    >
      <title id="four-forces-title">
        The four forces acting on an aeroplane in steady, level flight
      </title>
      <desc id="four-forces-desc">
        An aeroplane seen from the side. Lift points up from the wing, weight
        points down from the centre of gravity, thrust points forward from the
        propeller, and drag points backward. In steady level flight lift
        balances weight and thrust balances drag.
      </desc>

      {/* Arrowheads, one per direction so each inherits its own colour. */}
      <defs>
        <marker
          id="ff-arrow"
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

      {/* --- the aeroplane, side on ------------------------------------- */}
      <g
        className="fill-muted stroke-foreground"
        strokeWidth={2}
        strokeLinejoin="round"
      >
        {/* fuselage */}
        <path d="M 150 152 L 232 152 Q 258 152 268 146 L 268 140 Q 250 136 232 136 L 168 136 Q 154 138 150 144 Z" />
        {/* tail fin */}
        <path d="M 150 144 L 138 112 L 152 112 L 162 138 Z" />
        {/* tailplane */}
        <path d="M 152 140 L 128 140 L 128 146 L 152 146 Z" />
        {/* wing, seen edge-on */}
        <path d="M 196 150 L 176 162 L 214 162 L 222 150 Z" />
      </g>

      {/* propeller */}
      <line
        x1={272}
        y1={126}
        x2={272}
        y2={158}
        className="stroke-foreground"
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* --- lift -------------------------------------------------------- */}
      <g className="stroke-gold-strong" strokeWidth={3} strokeLinecap="round">
        <line x1={200} y1={128} x2={200} y2={52} markerEnd="url(#ff-arrow)" />
      </g>
      <text
        x={200}
        y={40}
        textAnchor="middle"
        className="fill-gold-strong text-[15px] font-semibold"
      >
        Lift
      </text>

      {/* --- weight ------------------------------------------------------ */}
      <g className="stroke-foreground" strokeWidth={3} strokeLinecap="round">
        <line x1={200} y1={168} x2={200} y2={244} markerEnd="url(#ff-arrow)" />
      </g>
      <text
        x={200}
        y={266}
        textAnchor="middle"
        className="fill-foreground text-[15px] font-semibold"
      >
        Weight
      </text>

      {/* --- thrust ------------------------------------------------------ */}
      <g className="stroke-foreground" strokeWidth={3} strokeLinecap="round">
        <line x1={290} y1={146} x2={382} y2={146} markerEnd="url(#ff-arrow)" />
      </g>
      <text
        x={382}
        y={132}
        textAnchor="end"
        className="fill-foreground text-[15px] font-semibold"
      >
        Thrust
      </text>

      {/* --- drag -------------------------------------------------------- */}
      <g className="stroke-foreground" strokeWidth={3} strokeLinecap="round">
        <line x1={118} y1={146} x2={30} y2={146} markerEnd="url(#ff-arrow)" />
      </g>
      <text
        x={30}
        y={132}
        textAnchor="start"
        className="fill-foreground text-[15px] font-semibold"
      >
        Drag
      </text>

      {/* The centre of gravity, where weight acts. */}
      <circle
        cx={200}
        cy={148}
        r={5}
        className="fill-background stroke-foreground"
        strokeWidth={2}
      />
    </svg>
  );
}
