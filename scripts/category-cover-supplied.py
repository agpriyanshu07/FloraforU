#!/usr/bin/env python3
"""Crop owner-supplied category photographs to the category card's shape.

Some categories are covered by a single supplied photograph rather than a
montage of the shop's own product photos. Those are built here; the montages
are built by category-cover-build.py. Both write the same
public/img/categories/<slug>-cover.webp, and the seed picks up whichever
exists.

The card renders at aspect-[5/3] with object-cover, so the crop is chosen
here, by eye, rather than left to the browser at whatever width the grid
happens to give it. CROPS holds the chosen window for each photo; where it
is None the photo is centre-cropped, which is right when the subject fills
the frame.

Nothing is upscaled. A supplied photo smaller than WIDTH keeps its own
resolution rather than being stretched to a number that adds no detail.

Run from the repo root:  python3 scripts/category-cover-supplied.py
"""
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "data/categories"
OUT = REPO / "public/img/categories"
ASPECT = 5 / 3
WIDTH = 1200          # cap, never a target to upscale to

# slug -> crop box in source pixels, or None to centre-crop.
CROPS: dict[str, tuple[int, int, int, int] | None] = {
    # Flowers fill the frame; centre is right.
    "artificial-flowers-greenery": None,
    # The drape and both floral stands sit mid-frame; centre keeps the candles.
    "backdrops-wall-panels-cloths": None,
    # Shifted up from centre: a centre crop cut the top row of hexagons off,
    # and the mirrors are the subject.
    "mirror-decor": (0, 150, 2000, 1350),
    # Portrait source. This window holds the name cutout, both rings and the
    # flowered hoop; centre would have been close but loses the top roses.
    "ring-platter-varmala": None,
    # Top of frame only: lower down, the solar panel and the wall anchors come
    # into shot and it stops reading as lighting and starts reading as a
    # packaging photo.
    "lights-lighting-decor": (0, 0, 1500, 900),
    # Already wider than 5:3, so this trims the sides; the fan stays whole.
    "cooler-fan": None,
    # Portrait source; centre keeps the sofa, the table and the rug.
    "sofa-chair": None,
    # Near 5:3 already, so centre only trims a little off the top and bottom.
    "pots-vases": None,
    # Wider than 5:3; centre keeps the crate, the basket and the ribbons.
    "gift-boxes-trays-bags-baskets": None,
    # These two carry another company's watermark across the middle of the
    # photograph -- "www.ArpanFlowers.com" and "dreamstime". Both were flagged
    # and the owner chose to use them anyway, so they are centre-cropped like
    # any other and the watermark stays where it is. It is not cropped around
    # or painted out.
    "packing-bouquet-accessories": None,
    "festive-puja-items": None,
    # Portrait source; centre lands on the brass turtle diya, which is the
    # one thing in focus.
    "lamps-diyas": None,
    # A flat illustration rather than a photograph, unlike every other cover.
    # The butterfly still sits inside the 5:3 window at centre.
    "accessories": None,
    # Already close to 5:3; centre keeps the full stack of rolls.
    "carpets-flooring": None,
}


def centre_box(w: int, h: int) -> tuple[int, int, int, int]:
    ch = round(w / ASPECT)
    if ch <= h:
        top = (h - ch) // 2
        return (0, top, w, top + ch)
    cw = round(h * ASPECT)
    left = (w - cw) // 2
    return (left, 0, left + cw, h)


def build(slug: str, box: tuple[int, int, int, int] | None) -> tuple[int, int, int]:
    src = next((p for p in SRC.glob(f"{slug}.*")), None)
    if src is None:
        raise SystemExit(f"no source photo for {slug} in {SRC}")
    im = Image.open(src).convert("RGB")
    im = im.crop(box or centre_box(*im.size))
    if im.width > WIDTH:
        im = im.resize((WIDTH, round(WIDTH / ASPECT)), Image.LANCZOS)
    dst = OUT / f"{slug}-cover.webp"
    im.save(dst, "WEBP", quality=90, method=6)
    return im.width, im.height, dst.stat().st_size


if __name__ == "__main__":
    for slug, box in CROPS.items():
        w, h, size = build(slug, box)
        print(f"{slug:<34} {w:>4}x{h:<4} {size // 1024:>4} KB")
    print(f"\n{len(CROPS)} covers written to public/img/categories/")
    import json
    slugs = sorted(p.name[: -len("-cover.webp")] for p in OUT.glob("*-cover.webp"))
    (REPO / "src/lib/category-covers.json").write_text(json.dumps(slugs, indent=1) + "\n")
    print(f"manifest: {len(slugs)} slugs have a cover")
