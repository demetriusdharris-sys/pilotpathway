"""Cuts figures out of the FAA handbook into public/figures.

    python scripts/extract-phak-figures.py

Needs pypdfium2 and Pillow, which are LOCAL BUILD TOOLING and not part of the
app's locked stack — nothing here ships, and the committed artifacts are the
.webp files. Install with: python -m pip install pypdfium2 pillow

WHY THIS EXISTS. Most diagrams in this product are hand-drawn SVG, and should
be: schematics stay a couple of kilobytes, follow dark mode and are sharp at any
size. But four of them need an aeroplane a student recognises, and a hand-drawn
Cessna looks like a schematic fish. The handbook's illustrations are
professional, authoritative, already FAA-reviewed, and public domain.

HOW A CROP BOX IS FOUND. Render the page at scale 1 (594x774 for a letter page),
look at it, and read the box off in those coordinates. The numbers below are in
that preview space and are multiplied by SCALE here, so they stay readable and
can be checked against a scale-1 render of the same page.

THREE RULES FOR ANY BOX ADDED HERE:

  * CROP THE CAPTION AWAY. "Figure 3-1." must never reach a student — figure
    numbers are revision-specific, and one baked into a raster cannot be edited
    out later. Check the artwork itself too: some figures carry a cross-
    reference inside the picture, and those must be drawn by hand instead.
  * CUT WIDE FIGURES INTO PANELS. The handbook is typeset for an 8.5x11 page. A
    full-width figure shown at 285px — a 375px phone, less the lesson padding —
    renders its labels around 5px. Panels that stack stay readable.
  * KEEP THE LONG EDGE NEAR 460-820px. That is roughly 1.6x to 2.9x the phone
    container, which is sharp on a dense screen without carrying a page-sized
    image to somebody on a metered connection.
"""

import os
import pypdfium2 as pdfium
from PIL import Image

PDF = "docs/reference/phak.pdf"
OUT = "public/figures"
SCALE = 3

# (page index, (x0, y0, x1, y1) in scale-1 preview coords, name, max width)
FIGURES = [
    # The four forces, from the aerodynamics chapter. Caption cropped away.
    (73, (64, 30, 308, 216), "four-forces", 820),
    # The three axes, one file per panel so they stack on a phone.
    (73, (67, 517, 219, 696), "axis-pitch", 460),
    (73, (220, 517, 377, 696), "axis-roll", 460),
    (73, (378, 517, 529, 696), "axis-yaw", 460),
    # The five major components, from the aircraft structure chapter.
    (74, (36, 500, 280, 672), "airplane-parts", 760),
]


def main() -> None:
    if not os.path.exists(PDF):
        raise SystemExit(
            f"{PDF} is missing. It is gitignored on purpose — ~78MB does not\n"
            "belong in git. Download the Pilot's Handbook of Aeronautical\n"
            "Knowledge (FAA-H-8083-25) from faa.gov and save it there."
        )

    os.makedirs(OUT, exist_ok=True)
    pdf = pdfium.PdfDocument(PDF)
    rendered: dict[int, Image.Image] = {}

    for index, box, name, max_width in FIGURES:
        if index not in rendered:
            rendered[index] = pdf[index].render(scale=SCALE).to_pil().convert("RGB")

        x0, y0, x1, y1 = (value * SCALE for value in box)
        crop = rendered[index].crop((x0, y0, x1, y1))

        if crop.width > max_width:
            height = round(crop.height * max_width / crop.width)
            crop = crop.resize((max_width, height), Image.LANCZOS)

        path = os.path.join(OUT, f"{name}.webp")
        crop.save(path, "WEBP", quality=86, method=6)

        print(
            f"  {name}.webp  {crop.width}x{crop.height}  "
            f"{os.path.getsize(path) / 1024:.0f} KB"
        )

    print(f"\n{len(FIGURES)} figure(s) -> {OUT}")
    print("Width and height in the components must match the sizes above.")


if __name__ == "__main__":
    main()
