import { HandbookFigure, HandbookCredit } from "./handbook-figure";

/**
 * The three axes, and which control moves the aeroplane about each.
 *
 * The handbook's own illustration, cut into its three panels.
 *
 * ONE FILE PER PANEL, NOT ONE FOR THE FIGURE. The handbook prints these three
 * side by side across a page, and a single 1,200px image shown at 285px renders
 * its "Longitudinal axis" label at about five pixels. Cut apart they stack one
 * per row on a phone and the labels land near fourteen, which is the same
 * arithmetic that governs the hand-drawn diagrams — a figure the audience
 * cannot read is not a figure.
 *
 * THE CONTROL NAMES ARE OURS AND ARE NOT IN THE ARTWORK. The handbook's panels
 * name the motion and the axis; they do not say which control does it, and that
 * pairing is the thing a student is actually examined on. It is HTML rather
 * than part of the image, so it follows the theme, stays selectable, and can be
 * corrected without re-cutting a raster.
 */

const PANELS: ReadonlyArray<{
  src: string;
  width: number;
  height: number;
  motion: string;
  axis: string;
  control: string;
  alt: string;
}> = [
  {
    src: "/figures/axis-roll.webp",
    width: 460,
    height: 524,
    motion: "Roll",
    axis: "longitudinal axis",
    control: "Ailerons",
    alt: "An aeroplane banked, rotating about a rod running from its nose to its tail, labelled the longitudinal axis.",
  },
  {
    src: "/figures/axis-pitch.webp",
    width: 456,
    height: 537,
    motion: "Pitch",
    axis: "lateral axis",
    control: "Elevator",
    alt: "An aeroplane nose-up, rotating about a rod running wingtip to wingtip, labelled the lateral axis.",
  },
  {
    src: "/figures/axis-yaw.webp",
    width: 453,
    height: 537,
    motion: "Yaw",
    axis: "vertical axis",
    control: "Rudder",
    alt: "An aeroplane turning flat, rotating about a rod running vertically through it, labelled the vertical axis.",
  },
];

export function ThreeAxesDiagram() {
  return (
    <div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {PANELS.map((panel) => (
          <li key={panel.motion}>
            <HandbookFigure
              src={panel.src}
              width={panel.width}
              height={panel.height}
              alt={panel.alt}
            />
            <p className="mt-2 font-semibold">{panel.motion}</p>
            <p className="text-muted-foreground text-sm text-pretty">
              about the {panel.axis}
            </p>
            <p className="text-gold-strong mt-1 text-sm font-medium">
              {panel.control}
            </p>
          </li>
        ))}
      </ul>
      <HandbookCredit />
    </div>
  );
}
