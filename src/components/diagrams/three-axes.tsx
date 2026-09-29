/**
 * The three axes, and which control moves the aeroplane about each.
 *
 * Three panels rather than one isometric drawing. An aeroplane in three-quarter
 * view with three axes through it is the handbook's picture and it is beautiful
 * on a page — but on a 375px phone it collapses into a tangle, and this audience
 * is mobile-first. Three small views, each showing one motion, survive the
 * width and are easier to read in any case.
 *
 * Makes factual claims, so it goes in the review queue with the cards.
 */

type PanelProps = {
  label: string;
  axis: string;
  control: string;
  children: React.ReactNode;
};

function Panel({ label, axis, control, children }: PanelProps) {
  return (
    <li className="border-border rounded-lg border p-4">
      <svg viewBox="0 0 160 120" role="presentation" className="h-auto w-full">
        {children}
      </svg>
      <p className="mt-3 font-semibold">{label}</p>
      <p className="text-muted-foreground text-sm text-pretty">
        about the {axis}
      </p>
      <p className="text-gold-strong mt-1 text-sm font-medium">{control}</p>
    </li>
  );
}

/** A simple aeroplane seen from the front, for roll. */
function FrontView() {
  return (
    <g
      className="fill-muted stroke-foreground"
      strokeWidth={2}
      strokeLinejoin="round"
    >
      <ellipse cx={80} cy={62} rx={11} ry={15} />
      <path d="M 70 58 L 22 64 L 22 70 L 70 68 Z" />
      <path d="M 90 58 L 138 64 L 138 70 L 90 68 Z" />
      <path d="M 76 47 L 76 34 L 84 34 L 84 47 Z" />
    </g>
  );
}

/** Side on, for pitch. */
function SideView() {
  return (
    <g
      className="fill-muted stroke-foreground"
      strokeWidth={2}
      strokeLinejoin="round"
    >
      <path d="M 44 66 L 106 66 Q 124 66 130 61 L 130 56 Q 116 53 102 53 L 56 53 Q 47 55 44 60 Z" />
      <path d="M 44 60 L 35 38 L 45 38 L 52 55 Z" />
      <path d="M 46 57 L 28 57 L 28 62 L 46 62 Z" />
      <path d="M 78 64 L 64 74 L 92 74 L 98 64 Z" />
    </g>
  );
}

/** From above, for yaw. */
function TopView() {
  return (
    <g
      className="fill-muted stroke-foreground"
      strokeWidth={2}
      strokeLinejoin="round"
    >
      <ellipse cx={80} cy={60} rx={9} ry={34} />
      <path d="M 74 54 L 26 60 L 26 68 L 74 66 Z" />
      <path d="M 86 54 L 134 60 L 134 68 L 86 66 Z" />
      <path d="M 76 92 L 58 96 L 58 100 L 76 98 Z" />
      <path d="M 84 92 L 102 96 L 102 100 L 84 98 Z" />
    </g>
  );
}

/** A curved arrow showing which way the motion goes. */
function Turn({ d }: { d: string }) {
  return (
    <>
      <defs>
        <marker
          id={`axis-arrow-${d.length}`}
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
      <path
        d={d}
        fill="none"
        className="stroke-gold-strong"
        strokeWidth={3}
        strokeLinecap="round"
        markerEnd={`url(#axis-arrow-${d.length})`}
      />
    </>
  );
}

export function ThreeAxesDiagram() {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      <Panel label="Roll" axis="longitudinal axis" control="Ailerons">
        <Turn d="M 30 96 A 52 52 0 0 1 130 96" />
        <FrontView />
      </Panel>

      <Panel label="Pitch" axis="lateral axis" control="Elevator">
        <Turn d="M 120 96 A 46 46 0 0 0 120 26" />
        <SideView />
      </Panel>

      <Panel label="Yaw" axis="vertical axis" control="Rudder">
        <Turn d="M 34 34 A 52 52 0 0 1 126 34" />
        <TopView />
      </Panel>
    </ul>
  );
}
