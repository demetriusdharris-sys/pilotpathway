/**
 * The four kinds of airport sign, by what their colours mean.
 *
 * Drawn from the handbook's airport operations chapter and the AIM. Standard
 * across every US airport, so nothing here varies by field or by aircraft.
 *
 * THE COLOURS ARE THE INFORMATION, so they are hardcoded rather than themed.
 * Every other diagram in this set follows the light and dark theme, because its
 * colours are decoration. Here a yellow background means "where you are going"
 * and a black one means "where you are"; a sign redrawn in the theme's palette
 * would be a different sign. They are fixed, and they are legible on both
 * backgrounds because the sign carries its own panel.
 *
 * THE RULE IS WORTH MORE THAN THE EXAMPLES. A student will meet signs this set
 * does not contain, so the lesson is the colour code — red forbids, black says
 * where you are, yellow says where you are going — rather than four shapes to
 * memorise. The headings say the rule and the sign demonstrates it.
 *
 * No airport's real signage is reproduced. The letters and numbers are
 * deliberately generic, because a student who learned a specific field's layout
 * from a diagram would be learning the wrong thing.
 */

type SignProps = {
  background: string;
  text: string;
  label: string;
  border?: string;
};

function Sign({ background, text, label, border }: SignProps) {
  return (
    <svg viewBox="0 0 160 76" role="presentation" className="h-auto w-full">
      <rect
        x={6}
        y={6}
        width={148}
        height={64}
        rx={6}
        fill={background}
        stroke={border ?? "#1A1A1A"}
        strokeWidth={border ? 5 : 2}
      />
      <text
        x={80}
        y={52}
        textAnchor="middle"
        fill={label}
        className="text-[30px] font-bold"
      >
        {text}
      </text>
    </svg>
  );
}

const SIGNS: ReadonlyArray<{
  sign: SignProps;
  name: string;
  rule: string;
}> = [
  {
    sign: { background: "#B3261E", text: "15-33", label: "#FFFFFF" },
    name: "White on red",
    rule:
      "A runway is ahead. This is the only sign that forbids something — do not pass it without a clearance.",
  },
  {
    sign: {
      background: "#1A1A1A",
      text: "B",
      label: "#F2C230",
      border: "#F2C230",
    },
    name: "Yellow on black",
    rule: "Where you are now. This is taxiway Bravo, under your wheels.",
  },
  {
    sign: { background: "#F2C230", text: "B →", label: "#1A1A1A" },
    name: "Black on yellow",
    rule: "Where that way goes. An arrow means you have to turn to get there.",
  },
  {
    sign: { background: "#F2C230", text: "RAMP →", label: "#1A1A1A" },
    name: "Black on yellow",
    rule: "The same rule for somewhere that is not a taxiway — a ramp, or the fuel pumps.",
  },
];

export function AirportSignsDiagram() {
  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SIGNS.map((entry) => (
          <li key={entry.rule} className="border-border rounded-lg border p-3">
            <Sign {...entry.sign} />
            <p className="mt-2 font-semibold">{entry.name}</p>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              {entry.rule}
            </p>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground mt-3 text-sm text-pretty">
        One rule covers all of them: a black background tells you where you are,
        a yellow background tells you where you are going, and red tells you to
        stop and get a clearance first.
      </p>
    </div>
  );
}
