/**
 * A simplified airspace profile: the classes, stacked, seen from the side.
 *
 * Drawn from the handbook's own airspace profile figure and its labelling —
 * Class A through E, with the 700 ft AGL, 1,200 ft AGL and 14,500 ft MSL
 * floors it marks.
 *
 * THE NUMBERS HERE ARE REGULATORY, not aircraft-specific, which is why this
 * diagram carries them when the others carry none. 14 CFR part 71 fixes them
 * and they are the same at every airport in the country.
 *
 * SIMPLIFIED ON PURPOSE, and the caption says so. Real Class B and C shelves
 * are drawn per airport and no two are alike; the shapes here show the idea of
 * a tiered floor, not any particular airport's. A student who took these as a
 * specific airport's dimensions would be reading the wrong thing, so the
 * caption sends them to the sectional chart for the real boundaries.
 *
 * TALL AND NARROW, WHICH IS THE WHOLE REASON THE LAYOUT LOOKS LIKE THIS. The
 * first version was 500 units wide, and on a 375px phone that scaled its
 * altitude labels to 9px — measured, not guessed. An airspace diagram whose
 * altitudes cannot be read on the device most of these students own is not a
 * diagram. Every unit of width here is spent deliberately; the altitudes get a
 * gutter down the right and nothing else may move into it.
 *
 * Each block is painted twice — an opaque rectangle, then a tinted one over it
 * — so the Class E floor running behind it is hidden rather than showing
 * through. A dashed line crossing the inside of Class B would say that Class E
 * exists in there, which is exactly wrong.
 */

const GROUND = 340;
const GUTTER = 282;

type BlockProps = { x: number; width: number; top: number; bottom?: number };

function Block({ x, width, top, bottom = GROUND }: BlockProps) {
  return (
    <>
      <rect
        x={x}
        y={top}
        width={width}
        height={bottom - top}
        className="fill-background"
      />
      <rect
        x={x}
        y={top}
        width={width}
        height={bottom - top}
        className="fill-gold/20 stroke-gold-strong"
        strokeWidth={2}
      />
    </>
  );
}

export function AirspaceProfileDiagram() {
  return (
    <svg
      viewBox="0 0 390 392"
      role="img"
      aria-labelledby="airspace-title airspace-desc"
      className="h-auto w-full"
    >
      <title id="airspace-title">
        A simplified side view of the classes of airspace
      </title>
      <desc id="airspace-desc">
        Airspace seen from the side, from the ground upwards. Class A sits above
        eighteen thousand feet mean sea level everywhere. Below it lies Class E,
        whose floor is usually one thousand two hundred feet above ground, or
        seven hundred feet near an airport with an instrument approach. Class G
        is the uncontrolled airspace beneath that floor. Class B, C and D are
        blocks of controlled airspace around airports, rising from the surface.
        Class B and C step outwards as they get higher; Class D is a single
        block.
      </desc>

      {/* --- Class A: everywhere, above 18,000 MSL ------------------------ */}
      <Block x={8} width={264} top={24} bottom={64} />
      <text
        x={144}
        y={50}
        textAnchor="middle"
        className="fill-foreground text-[16px] font-semibold"
      >
        Class A
      </text>
      <text
        x={GUTTER}
        y={50}
        textAnchor="start"
        className="fill-muted-foreground text-[16px] font-medium"
      >
        18,000 ft MSL
      </text>

      {/* --- 14,500 MSL, above which there is no Class G ------------------ */}
      <line
        x1={8}
        y1={118}
        x2={272}
        y2={118}
        className="stroke-muted-foreground"
        strokeWidth={1.5}
        strokeDasharray="6 6"
      />
      <text
        x={GUTTER}
        y={123}
        textAnchor="start"
        className="fill-muted-foreground text-[16px] font-medium"
      >
        14,500 ft MSL
      </text>

      {/* --- the Class E floor, stepping down near the airport ------------ */}
      {/* Drawn before the blocks, which paint over it. */}
      <path
        d="M 8 296 L 218 296 L 218 312 L 272 312"
        className="stroke-foreground"
        strokeWidth={2}
        fill="none"
        strokeDasharray="7 5"
      />
      <text
        x={GUTTER}
        y={294}
        textAnchor="start"
        className="fill-muted-foreground text-[16px] font-medium"
      >
        1,200 ft AGL
      </text>
      <text
        x={GUTTER}
        y={322}
        textAnchor="start"
        className="fill-muted-foreground text-[16px] font-medium"
      >
        700 ft AGL
      </text>

      {/* --- the airport blocks ------------------------------------------- */}
      <Block x={54} width={80} top={178} bottom={232} />
      <Block x={78} width={32} top={232} />
      <Block x={150} width={72} top={216} bottom={260} />
      <Block x={170} width={32} top={260} />
      <Block x={232} width={36} top={268} />

      <g className="fill-foreground text-[16px] font-semibold">
        <text x={102} y={172} textAnchor="middle">
          Class B
        </text>
        <text x={186} y={208} textAnchor="middle">
          Class C
        </text>
        <text x={250} y={260} textAnchor="middle">
          Class D
        </text>
        <text x={10} y={140} textAnchor="start">
          Class E
        </text>
        <text x={10} y={326} textAnchor="start">
          Class G
        </text>
      </g>

      {/* --- the ground ---------------------------------------------------- */}
      <line
        x1={4}
        y1={GROUND}
        x2={276}
        y2={GROUND}
        className="stroke-foreground"
        strokeWidth={3}
      />
      <text
        x={144}
        y={366}
        textAnchor="middle"
        className="fill-muted-foreground text-[16px] font-medium"
      >
        Surface
      </text>
    </svg>
  );
}
