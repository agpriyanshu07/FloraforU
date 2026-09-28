#!/usr/bin/env python3
"""Level and crop the shopfront photo into the homepage hero image.

The photo was taken slightly tilted. The angle is not guessed: the top edge
of the signboard is traced column by column, a line is fitted to it, and the
image is rotated by the angle that drives that line flattest. Measured at
-1.10 degrees, which leaves a residual of +0.007 degrees -- level to well
under a tenth of a degree.

Rotating leaves black wedges in the corners, so MARGIN is trimmed off every
edge afterwards. The crop is 5:4 because that is the hero's shape on desktop
(`lg:aspect-[5/4]`); on a phone the same slot is 4:3, and object-cover then
shows the middle 94% of the height, which is why the signboard is given
headroom rather than being pushed against the top edge.

Run from the repo root:  python3 scripts/shopfront-hero-build.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "data/brand/shopfront-source.jpg"
DST = REPO / "public/img/brand/shopfront.webp"

ANGLE = -1.10          # degrees, measured by level_error() below
MARGIN = 12            # px trimmed off each edge to drop the rotation wedges
ASPECT = 5 / 4         # the hero's desktop shape


def level_error(im: Image.Image) -> float:
    """Angle of the signboard's top edge, in degrees. Zero means level."""
    a = np.asarray(im.convert("RGB")).astype(int)
    bright = a.min(2) > 140                      # the white signboard
    tops = []
    for x in range(a.shape[1]):
        col = bright[430:780, x]
        ys = np.nonzero(col)[0]
        if len(ys) < 20:
            continue
        for y in ys:                             # first edge with real depth behind it
            if col[y:y + 15].sum() >= 13:
                tops.append((x, y + 430))
                break
    t = np.array(tops)
    m = (t[:, 0] >= 90) & (t[:, 0] <= 660)       # the board itself, not the side panels
    xs, ys = t[m, 0], t[m, 1]
    res = ys - np.polyval(np.polyfit(xs, ys, 1), xs)
    keep = np.abs(res) < np.percentile(np.abs(res), 80)
    return float(np.degrees(np.arctan(np.polyfit(xs[keep], ys[keep], 1)[0])))


if __name__ == "__main__":
    src = Image.open(SRC).convert("RGB")
    print(f"source {src.size}, tilt {level_error(src):+.3f} deg")

    rot = src.rotate(ANGLE, resample=Image.BICUBIC, expand=False, fillcolor=(0, 0, 0))
    print(f"rotated by {ANGLE:+.2f} deg, residual {level_error(rot):+.3f} deg")

    w = rot.width - 2 * MARGIN
    h = round(w / ASPECT)
    bottom = rot.height - MARGIN
    out = rot.crop((MARGIN, bottom - h, MARGIN + w, bottom))

    DST.parent.mkdir(parents=True, exist_ok=True)
    out.save(DST, "WEBP", quality=90, method=6)
    print(f"wrote {DST.relative_to(REPO)}  {out.size}  {DST.stat().st_size // 1024} KB")
