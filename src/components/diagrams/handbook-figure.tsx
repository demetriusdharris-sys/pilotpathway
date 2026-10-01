import Image from "next/image";

/**
 * An illustration taken from the FAA's handbook, rather than drawn here.
 *
 * WHY SOME DIAGRAMS ARE IMAGES AND MOST ARE NOT. Schematics — the airspace
 * profile, the pitot-static plumbing, a traffic pattern — are better as vector:
 * they stay a couple of kilobytes, follow dark mode, and are sharp at any size.
 * But a schematic aeroplane drawn by hand looks like a schematic aeroplane, and
 * four of these diagrams need an aircraft a student recognises. The handbook's
 * own illustrations are professionally drawn, authoritative, already reviewed by
 * the FAA, and public domain. Hand-drawing a worse version of a figure that
 * already exists is not craft.
 *
 * They are rasters, so three things are true and worth remembering:
 *
 *   * THEY DO NOT FOLLOW DARK MODE. Each carries its own pale background, so it
 *     sits on the page as a plate rather than inverting. That is deliberate:
 *     a figure recoloured to the theme would be a different figure.
 *   * THEY ARE DRAWN FOR A PRINTED PAGE. A full-width handbook figure shrunk to
 *     285px renders its labels around 5px — unreadable on the phones this
 *     audience owns. Wide figures are cut into panels that stack instead, which
 *     is why the three axes are three files rather than one.
 *   * NO FIGURE NUMBER MAY BE INSIDE THE CROP. Numbers are revision-specific,
 *     and one baked into a raster cannot be edited out later. Captions are
 *     cropped away and any figure whose artwork contains a cross-reference is
 *     drawn by hand instead.
 *
 * Extracted by scripts/extract-phak-figures.py. Public domain: works of the US
 * federal government. Credited anyway — "from the FAA handbook" is a reason for
 * a student to trust the picture, not a disclaimer.
 */
export function HandbookFigure({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className="border-border h-auto w-full rounded-md border"
      sizes="(max-width: 640px) 100vw, 700px"
    />
  );
}

/** Said once under a group of figures, never per panel. */
export function HandbookCredit() {
  return (
    <p className="text-muted-foreground mt-3 text-xs text-pretty">
      Illustration from the FAA Pilot&rsquo;s Handbook of Aeronautical Knowledge,
      which is in the public domain.
    </p>
  );
}
