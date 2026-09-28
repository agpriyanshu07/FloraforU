#!/usr/bin/env python3
"""Compose each category's cover image from the shop's own product photos.

The category card renders its image at aspect-[5/3] with object-cover, so a
photo that is not 5:3 gets cropped by the browser at whatever size the grid
happens to give it. Composing at 5:3 here means the crop is chosen once,
deliberately, and looks the same on every screen.

The photos are the shop's own catalogue photos, already published on the
product pages. Stock libraries and image search were the other option and
are worse on both counts: the licensing is somebody else's to grant, and a
generic photo of somebody else's marigolds sells this shop's stock less well
than a photo of the marigolds it actually has on the shelf.

Each entry is (published photo path, fraction to trim off the bottom). The
trim removes a camera stamp or a caption bar baked into the photo. Photos
carrying another company's watermark were rejected outright rather than
cropped -- see the batch 11 notes for why.

Two categories get no cover and keep their placeholder artwork:
festive-puja-items is down to a single product whose only photo crops badly,
and ring-platter-varmala has no products left at all. A deliberate
placeholder beats a bad photograph.

Run from the repo root:  python3 scripts/category-cover-build.py
"""
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "public/img/categories"
W, H, GAP = 1200, 720, 4
CREAM = (255, 251, 247)          # --color-cream, so the seams match the card

COVERS: dict[str, list[tuple[str, float]]] = {
    "artificial-flowers-greenery": [
        ("/img/products/205.webp", 0),   # Gendu (Merry Gold)
        ("/img/products/110.webp", 0.09),   # Small Peony
        ("/img/products/215.webp", 0),   # Rose Bunch
    ],
    "backdrops-wall-panels-cloths": [
        ("/img/products/3913.webp", 0),   # Bright Lycra Redvelvet Work Wall
        ("/img/products/3935.webp", 0),   # Round Table Cover (Design 4)
        ("/img/products/3303.webp", 0),   # Velvet Panel Kamal
    ],
    "lights-lighting-decor": [
        ("/img/products/elephant-shell-hanging.webp", 0),   # Elephant Shell Hanging
        ("/img/products/3602.webp", 0),   # Hanging Butterfly (Design 2)
        ("/img/products/3626-2.webp", 0),   # Umbrella Light Stand
    ],
    "lamps-diyas": [
        ("/img/products/702.webp", 0),   # Crystal Balloon Lamp
        ("/img/products/709.webp", 0),   # Golden Lamp
        ("/img/products/2313-2.webp", 0),   # LED Diya
    ],
    "pots-vases": [
        ("/img/products/3109.webp", 0),   # Marble Pot
        ("/img/products/3107.webp", 0),   # Patta Pot (24 in)
        ("/img/products/3821.webp", 0),   # Lucky Pot 6 Inch
    ],
    "sfx-special-effects": [
        ("/img/products/615.webp", 0.14),   # Co2 LED Confetti Gun (3 In 1)
        ("/img/products/604-2.webp", 0),   # Paper Confetti
        ("/img/products/618.webp", 0),   # Dry Ice Big Machine
    ],
    "rajasthani-haldi-mehndi-decor": [
        ("/img/products/461.webp", 0),   # 3 Churdi Tassal
        ("/img/products/421.webp", 0),   # Wool Tassal
        ("/img/products/470.webp", 0),   # Wool Chakri
    ],
    "packing-bouquet-accessories": [
        ("/img/products/1608.webp", 0),   # Glitter Ribbon
        ("/img/products/1612.webp", 0),   # Wire Ribbon
        ("/img/products/1605.webp", 0),   # Ribbon Bow (75 × 5 cm)
    ],
    "gift-boxes-trays-bags-baskets": [
        ("/img/products/1304.webp", 0),   # Red Velvet Tokri
        ("/img/products/1103.webp", 0),   # Dry Fruit Tray (Bandej, 10 × 14 in)
        ("/img/products/1512.webp", 0),   # Fancy Work Potli
    ],
    "carpets-flooring": [
        ("/img/products/carpet-20.webp", 0),   # Plain Carpet (Red)
        ("/img/products/331.webp", 0),   # Grass Roll
        ("/img/products/carpet-16.webp", 0.08),   # Carpet Design 5036 (Pink & Gold)
    ],
    "mirror-decor": [
        ("/img/products/3802-2.webp", 0),   # Mirror Wall
        ("/img/products/3809.webp", 0),   # Elephant
        ("/img/products/502.webp", 0),   # Mirror Ball
    ],
    "cooler-fan": [
        ("/img/products/tank-19.webp", 0),   # 115 L Water Tank
        ("/img/products/tank-17.webp", 0),   # 150 L Water Tank
    ],
    "sofa-chair": [
        ("/img/products/ex5-p16.webp", 0),   # Blue Dewana (Sagwan Wood)
    ],
    "accessories": [
        ("/img/products/3634.webp", 0),   # Wooden Butterfly (6 × 6 ft)
        ("/img/products/711.webp", 0),   # Cycle
        ("/img/products/3633.webp", 0),   # Wooden Butterfly (2 × 2 ft)
    ],
}


def cover(im: Image.Image, w: int, h: int) -> Image.Image:
    """Centre-crop to exactly w x h, scaling only as far as needed to fill."""
    scale = max(w / im.width, h / im.height)
    im = im.resize((max(w, round(im.width * scale)), max(h, round(im.height * scale))),
                   Image.LANCZOS)
    left, top = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((left, top, left + w, top + h))


def load(rel: str, trim: float) -> Image.Image:
    p = REPO / "public" / rel.lstrip("/")
    if not p.exists():
        raise SystemExit(f"missing photo: {rel}")
    im = Image.open(p).convert("RGB")
    return im.crop((0, 0, im.width, round(im.height * (1 - trim)))) if trim else im


def compose(entries: list[tuple[str, float]]) -> Image.Image:
    sheet = Image.new("RGB", (W, H), CREAM)
    ims = [load(rel, trim) for rel, trim in entries]
    if len(ims) == 1:
        sheet.paste(cover(ims[0], W, H), (0, 0))
    elif len(ims) == 2:
        w = (W - GAP) // 2
        sheet.paste(cover(ims[0], w, H), (0, 0))
        sheet.paste(cover(ims[1], W - w - GAP, H), (w + GAP, 0))
    else:
        lw = round(W * 0.56)
        rw, rh = W - lw - GAP, (H - GAP) // 2
        sheet.paste(cover(ims[0], lw, H), (0, 0))
        sheet.paste(cover(ims[1], rw, rh), (lw + GAP, 0))
        sheet.paste(cover(ims[2], rw, H - rh - GAP), (lw + GAP, rh + GAP))
    return sheet


def write_manifest() -> int:
    """Record which slugs have a cover, for src/lib/category-image.ts.

    The site cannot read public/ at request time on a serverless host, so the
    list has to be committed. Both cover scripts call this, and both scan the
    output directory rather than their own table, so either one alone leaves a
    correct manifest.
    """
    import json

    slugs = sorted(p.name[: -len("-cover.webp")] for p in OUT.glob("*-cover.webp"))
    (REPO / "src/lib/category-covers.json").write_text(json.dumps(slugs, indent=1) + "\n")
    return len(slugs)


SUPPLIED = REPO / "data/categories"

if __name__ == "__main__":
    total = skipped = 0
    for slug, entries in COVERS.items():
        # A photograph the owner supplied beats a montage assembled from
        # product shots, and both scripts write the same <slug>-cover.webp.
        # Without this the two would fight over twelve of these files and
        # whichever ran last would win, which is not something you would
        # notice until a cover quietly changed back.
        if next(SUPPLIED.glob(f"{slug}.*"), None) is not None:
            print(f"{slug:<34} skipped — data/categories has a supplied photo")
            skipped += 1
            continue
        path = OUT / f"{slug}-cover.webp"
        compose(entries).save(path, "WEBP", quality=88, method=6)
        total += path.stat().st_size
        print(f"{slug:<34} {len(entries)} photo(s)  {path.stat().st_size // 1024:>4} KB")
    print(f"\n{len(COVERS) - skipped} montages, {total // 1024} KB total; {skipped} left to supplied photos")
    print(f"manifest: {write_manifest()} slugs have a cover")
