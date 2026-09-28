#!/usr/bin/env python3
"""Turn the shop's logo photograph into clean SVG line art.

The supplied logo is a JPEG of black line art on cream, soft from
compression and only 675px square. Sharpening a bitmap cannot recover what
the compression threw away, and the site needs the mark from 32px (favicon)
up to 112px and beyond (footer, share card), so the fix is to trace it: the
outline becomes maths and is then crisp at any size.

Steps, in order:
  1. Trim the cream margin down to the ink.
  2. Upscale 3x with LANCZOS *before* thresholding. Tracing the original
     directly follows every JPEG wobble in the edge; resampling first lets
     the threshold land on a smoother boundary.
  3. Threshold at THRESHOLD. Chosen by rendering 150/175/200/215 side by
     side: below this the left of the arc breaks up and the wordmark goes
     spindly, above it the foliage starts to blob together.
  4. Trace, and emit a single path with fill="currentColor" so the mark can
     be recoloured in CSS rather than needing a second file per colour.

Run from the repo root:  python3 scripts/logo-vectorise.py
"""
from pathlib import Path

import numpy as np
import potrace
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "data/brand/logo-original.jpg"
OUT = REPO / "public/img/brand/logo-ffu.svg"
MARK = REPO / "public/img/brand/logo-ffu-mark.svg"

THRESHOLD = 200
UPSCALE = 3
PAD = 14          # cream left around the ink, in source pixels
TURDSIZE = 3      # drop specks smaller than this; the arc's dots are far bigger

# The small "FloralforU" wordmark inside the circle, in traced coordinates.
# It is thirteen contours sitting alone in this band -- the arc passes through
# the same rows but extends well beyond it, so a containment test separates
# them cleanly. Dropped for the small mark, where at 36px that lettering is a
# grey smudge and the name is already set in text beside it.
WORDMARK_BAND = (140, 340, 400, 400)   # x0, y0, x1, y1


def ink_box(a: np.ndarray, w: int, h: int) -> tuple[int, int, int, int]:
    ys, xs = np.nonzero(a < 200)
    return (max(0, xs.min() - PAD), max(0, ys.min() - PAD),
            min(w, xs.max() + 1 + PAD), min(h, ys.max() + 1 + PAD))


def bbox(curve, scale: float) -> tuple[float, float, float, float]:
    pts = [(curve.start_point.x, curve.start_point.y)]
    pts += [(seg.end_point.x, seg.end_point.y) for seg in curve]
    xs = [p[0] / scale for p in pts]
    ys = [p[1] / scale for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def in_band(curve, scale: float) -> bool:
    """True for the small wordmark's own contours, and nothing else.

    The arc runs through the same rows but starts above the band and ends
    below it, so requiring full containment rather than overlap keeps it.
    """
    x0, y0, x1, y1 = bbox(curve, scale)
    bx0, by0, bx1, by1 = WORDMARK_BAND
    return x0 >= bx0 and y0 >= by0 and x1 <= bx1 and y1 <= by1


def to_path_data(path, scale: float, skip_wordmark: bool = False) -> str:
    out = []

    def xy(p):
        return p.x / scale, p.y / scale

    for curve in path:
        if skip_wordmark and in_band(curve, scale):
            continue
        x, y = xy(curve.start_point)
        out.append(f"M{x:.2f} {y:.2f}")
        for seg in curve:
            ex, ey = xy(seg.end_point)
            if seg.is_corner:
                cx, cy = xy(seg.c)
                out.append(f"L{cx:.2f} {cy:.2f}L{ex:.2f} {ey:.2f}")
            else:
                a1, b1 = xy(seg.c1)
                a2, b2 = xy(seg.c2)
                out.append(f"C{a1:.2f} {b1:.2f} {a2:.2f} {b2:.2f} {ex:.2f} {ey:.2f}")
        out.append("Z")
    return "".join(out)


if __name__ == "__main__":
    grey = Image.open(SRC).convert("L")
    a = np.asarray(grey).astype(int)
    crop = grey.crop(ink_box(a, grey.width, grey.height))
    big = crop.resize((crop.width * UPSCALE, crop.height * UPSCALE), Image.LANCZOS)

    ink = np.asarray(big).astype(int) < THRESHOLD
    # potracer treats 0 as the foreground, the opposite way round from what
    # the name Bitmap suggests. Passing the ink mask directly traces the
    # background instead and yields a filled rectangle with the artwork
    # punched out of it -- checked against a plain square before trusting it.
    path = potrace.Bitmap(~ink).trace(turdsize=TURDSIZE, alphamax=1.0,
                                      opticurve=True, opttolerance=0.2)

    w, h = crop.size
    dropped = sum(1 for c in path if in_band(c, UPSCALE))
    for dst, skip, label in ((OUT, False, "full lockup"), (MARK, True, "no wordmark")):
        d = to_path_data(path, UPSCALE, skip_wordmark=skip)
        dst.write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'role="img" aria-label="FloralforU">\n'
            f'  <path fill="currentColor" fill-rule="nonzero" d="{d}"/>\n'
            f'</svg>\n'
        )
        n = len(path) - (dropped if skip else 0)
        print(f"{str(dst.relative_to(REPO)):<36} {label:<12} "
              f"viewBox 0 0 {w} {h}  {n} curves  {dst.stat().st_size // 1024} KB")
    print(f"wordmark contours dropped from the small mark: {dropped}")
