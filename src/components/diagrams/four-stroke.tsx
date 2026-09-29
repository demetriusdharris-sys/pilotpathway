/**
 * The four-stroke cycle of a spark-ignition piston engine.
 *
 * Drawn from the handbook's own four-stroke figure and its labelling: intake,
 * compression, power, exhaust, with the intake and exhaust valves, the spark
 * plug, the piston, the connecting rod and the crankshaft.
 *
 * Four panels rather than one animated cylinder. The order is the whole point
 * and a student needs to see the four positions at once to compare them; an
 * animation would also be motion nobody asked for, on a page a student may be
 * reading on a bus.
 *
 * Two turns of the crankshaft produce one power stroke. That is the fact most
 * often got wrong, so the caption says it rather than leaving it to be counted
 * off the picture.
 */

type StrokeProps = {
  /** Top of the piston crown. Higher number is further down the cylinder. */
  piston: number;
  intakeOpen?: boolean;
  exhaustOpen?: boolean;
  spark?: boolean;
  /** Which way the piston is travelling during this stroke. */
  moving: "down" | "up";
};

function Cylinder({
  piston,
  intakeOpen = false,
  exhaustOpen = false,
  spark = false,
  moving,
}: StrokeProps) {
  const valve = (x: number, open: boolean) => (
    <g className="stroke-foreground" strokeWidth={2} strokeLinecap="round">
      <line x1={x} y1={6} x2={x} y2={open ? 34 : 26} />
      <line
        x1={x - 7}
        y1={open ? 34 : 26}
        x2={x + 7}
        y2={open ? 34 : 26}
        strokeWidth={4}
      />
    </g>
  );

  return (
    <svg viewBox="0 0 120 164" role="presentation" className="h-auto w-full">
      <defs>
        <marker
          id={`fs-arrow-${moving}`}
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

      {/* cylinder walls, open at the top where the valves sit */}
      <path
        d="M 30 22 L 30 112 L 90 112 L 90 22"
        className="fill-muted stroke-foreground"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {valve(44, intakeOpen)}
      {valve(76, exhaustOpen)}

      {/* spark plug, centre top */}
      <g className="stroke-foreground" strokeWidth={2} strokeLinecap="round">
        <line x1={60} y1={4} x2={60} y2={20} />
      </g>
      {spark ? (
        <g className="stroke-gold-strong" strokeWidth={2} strokeLinecap="round">
          <line x1={52} y1={26} x2={68} y2={26} />
          <line x1={55} y1={20} x2={65} y2={32} />
          <line x1={65} y1={20} x2={55} y2={32} />
        </g>
      ) : null}

      {/* piston */}
      <rect
        x={31}
        y={piston}
        width={58}
        height={16}
        className="fill-background stroke-foreground"
        strokeWidth={2}
      />

      {/* which way it is going */}
      <line
        x1={60}
        y1={moving === "down" ? piston - 16 : piston + 30}
        x2={60}
        y2={moving === "down" ? piston - 4 : piston + 18}
        className="stroke-gold-strong"
        strokeWidth={3}
        strokeLinecap="round"
        markerEnd={`url(#fs-arrow-${moving})`}
      />

      {/* connecting rod and crankshaft */}
      <line
        x1={60}
        y1={piston + 16}
        x2={60}
        y2={134}
        className="stroke-foreground"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle
        cx={60}
        cy={142}
        r={11}
        className="fill-muted stroke-foreground"
        strokeWidth={2}
      />
    </svg>
  );
}

const STROKES: ReadonlyArray<{
  n: number;
  name: string;
  says: string;
  cylinder: StrokeProps;
}> = [
  {
    n: 1,
    name: "Intake",
    says: "Intake valve open. The piston draws in the fuel and air mixture.",
    cylinder: { piston: 84, intakeOpen: true, moving: "down" },
  },
  {
    n: 2,
    name: "Compression",
    says: "Both valves closed. The piston squeezes the mixture.",
    cylinder: { piston: 40, moving: "up" },
  },
  {
    n: 3,
    name: "Power",
    says: "The spark plug fires and the burning mixture drives the piston down.",
    cylinder: { piston: 52, spark: true, moving: "down" },
  },
  {
    n: 4,
    name: "Exhaust",
    says: "Exhaust valve open. The piston pushes the burned gases out.",
    cylinder: { piston: 40, exhaustOpen: true, moving: "up" },
  },
];

export function FourStrokeDiagram() {
  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STROKES.map((stroke) => (
          <li key={stroke.name} className="border-border rounded-lg border p-3">
            <Cylinder {...stroke.cylinder} />
            <p className="mt-2 font-semibold">
              <span className="text-gold-strong tabular-nums">{stroke.n}.</span>{" "}
              {stroke.name}
            </p>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              {stroke.says}
            </p>
          </li>
        ))}
      </ul>

      {/* The parts, named once rather than crowded onto four small drawings. */}
      <p className="text-muted-foreground mt-3 text-sm text-pretty">
        In each cylinder: the spark plug at the top centre, the intake valve on
        the left and the exhaust valve on the right, the piston below them, and
        the connecting rod running down to the crankshaft.
      </p>
    </div>
  );
}
