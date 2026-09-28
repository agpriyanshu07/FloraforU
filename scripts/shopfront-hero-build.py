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

# The signboard prints the shop's GSTIN, which is legible at hero size. It is
# on a public shopfront and is a public identifier, but the homepage is not the
# street, so it comes off. Coordinates are in the cropped hero, left/right and
# top/bottom of the glyph rows. The address and phone on the lower strip stay:
# those are contact details the site publishes anyway and a customer needs.
GSTIN_BOX = (482, 641, 106, 118)
GSTIN_ABOVE = (100, 105)    # clean board rows to sample above the text
GSTIN_BELOW = (119, 122)    # and below, stopping short of the pink lettering


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


def drop_gstin(im: Image.Image) -> Image.Image:
    """Fill the GSTIN line with the board around it.

    The strip is flat board, so each column is interpolated between the clean
    rows above and below it. Sampling is by median, with a horizontal median
    behind it, so the support wires crossing the board do not streak down
    through the fill. Blurring was the other option and looks like redaction;
    this reads as a board that never carried the line.
    """
    x0, x1, y0, y1 = GSTIN_BOX
    a = np.asarray(im).astype(float)

    def anchor(r0: int, r1: int) -> np.ndarray:
        med = np.median(a[r0:r1 + 1, x0:x1 + 1, :], axis=0)
        k = 11
        pad = np.pad(med, ((k // 2, k // 2), (0, 0)), mode="edge")
        return np.stack([np.median(pad[i:i + k], axis=0) for i in range(med.shape[0])])

    top, bot = anchor(*GSTIN_ABOVE), anchor(*GSTIN_BELOW)
    h = y1 - y0 + 1
    for i in range(h):
        t = (i + 0.5) / h
        a[y0 + i, x0:x1 + 1, :] = top * (1 - t) + bot * t
    return Image.fromarray(np.clip(a, 0, 255).astype("uint8"))


if __name__ == "__main__":
    src = Image.open(SRC).convert("RGB")
    print(f"source {src.size}, tilt {level_error(src):+.3f} deg")

    rot = src.rotate(ANGLE, resample=Image.BICUBIC, expand=False, fillcolor=(0, 0, 0))
    print(f"rotated by {ANGLE:+.2f} deg, residual {level_error(rot):+.3f} deg")

    w = rot.width - 2 * MARGIN
    h = round(w / ASPECT)
    bottom = rot.height - MARGIN
    out = drop_gstin(rot.crop((MARGIN, bottom - h, MARGIN + w, bottom)))

    DST.parent.mkdir(parents=True, exist_ok=True)
    out.save(DST, "WEBP", quality=90, method=6)
    print(f"wrote {DST.relative_to(REPO)}  {out.size}  {DST.stat().st_size // 1024} KB")
