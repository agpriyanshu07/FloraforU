#!/usr/bin/env python3
"""
Pulls the raw facts out of the shop's catalogue PDF: one product per page,
plus that product's cut-out photo.

Deliberately mechanical. It reads the code, the name and the price lines
exactly as the PDF states them and writes them to JSON — it does not tidy
wording, guess a category or invent a spec line. Those are judgement calls and
they are made once, in the open, in catalogue-rows.json, rather than hidden in
a regex here.

How the product photo is picked: every page carries the same decorative
border and the same little bouquet icon, so the images that repeat across
pages are decoration by definition. Hash them all, keep the ones unique to a
single page, and the largest of those is the product. That holds without
knowing anything about the layout, which matters because the sample is 25
pages and the real catalogue will not be.

A page can carry several photos of the same item — a pack shot and a close-up,
or the colour range — and all of them are kept, largest first. The shop's
product cards already page through multiple photos, so throwing the extras away
would lose the best part of the catalogue.

Photos come out of the PDF as RGB plus a separate soft mask; the two are
composited back into one RGBA image, so the cut-outs stay cut out.

    python3 scripts/catalogue-pdf-extract.py <catalogue.pdf> <out-dir>

Needs poppler-utils (pdftotext, pdfimages) and Pillow.
"""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image


def page_count(pdf: Path) -> int:
    out = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True).stdout
    return int(re.search(r"^Pages:\s+(\d+)", out, re.M).group(1))


def page_text(pdf: Path, page: int) -> list[str]:
    out = subprocess.run(
        ["pdftotext", "-f", str(page), "-l", str(page), str(pdf), "-"],
        capture_output=True, text=True,
    ).stdout
    return [ln.strip() for ln in out.splitlines() if ln.strip()]


def page_images(pdf: Path, page: int, work: Path) -> list[Path]:
    prefix = work / f"p{page:03d}"
    subprocess.run(
        ["pdfimages", "-f", str(page), "-l", str(page), "-png", "-p", str(pdf), str(prefix)],
        check=True, capture_output=True,
    )
    return sorted(work.glob(f"p{page:03d}-*.png"))


def composite(rgb: Path, mask: Path | None) -> Image.Image:
    im = Image.open(rgb).convert("RGB")
    if mask is None:
        return im.convert("RGBA")
    alpha = Image.open(mask).convert("L")
    if alpha.size != im.size:
        alpha = alpha.resize(im.size)
    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out


def main() -> None:
    pdf = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    work = out_dir / "_raw"
    photos = out_dir / "photos"
    for d in (work, photos):
        d.mkdir(parents=True, exist_ok=True)

    pages = page_count(pdf)
    print(f"{pdf.name}: {pages} pages")

    # Pass 1 — every image on every page, fingerprinted.
    per_page: dict[int, list[Path]] = {}
    digests: dict[Path, str] = {}
    counts: dict[str, int] = {}
    for page in range(1, pages + 1):
        files = page_images(pdf, page, work)
        per_page[page] = files
        seen_on_page = set()
        for f in files:
            d = hashlib.md5(f.read_bytes()).hexdigest()
            digests[f] = d
            if d not in seen_on_page:            # count each image once per page
                seen_on_page.add(d)
                counts[d] = counts.get(d, 0) + 1

    # Pass 2 — text, and the one image that belongs to this page alone.
    rows = []
    for page in range(1, pages + 1):
        lines = page_text(pdf, page)
        code = lines[0] if lines and re.fullmatch(r"\d{3,6}", lines[0]) else None
        price_at = next((i for i, ln in enumerate(lines) if re.match(r"(?i)price", ln)), None)
        name_lines = lines[1:price_at] if price_at else lines[1:]
        price_lines = lines[price_at:] if price_at is not None else []

        candidates = []
        for f in per_page[page]:
            if counts[digests[f]] > 1:           # appears on other pages: decoration
                continue
            im = Image.open(f)
            if im.mode == "L":                   # a soft mask, not an image
                continue
            candidates.append((im.size[0] * im.size[1], f, im.size))
        candidates.sort(reverse=True)

        saved = []
        stem = code or f"page{page:03d}"
        for n, (_, rgb, size) in enumerate(candidates, start=1):
            # The mask is the greyscale image of identical size that follows it.
            idx = per_page[page].index(rgb)
            mask = None
            for f in per_page[page][idx + 1: idx + 3]:
                im = Image.open(f)
                if im.mode == "L" and im.size == size:
                    mask = f
                    break
            img = composite(rgb, mask)
            name = f"{stem}.webp" if n == 1 else f"{stem}-{n}.webp"
            img.save(photos / name, "WEBP", quality=88, method=6)
            saved.append({"file": f"photos/{name}", "px": list(size)})

        rows.append({
            "page": page,
            "code": code,
            "name_raw": " ".join(name_lines),
            "price_lines": price_lines,
            "photos": saved,
        })
        shots = f"{len(saved)} photo" + ("s" if len(saved) != 1 else "")
        print(f"  p{page:>3}  {code or '???':<6}  {' '.join(name_lines)[:34]:<34}  {shots if saved else 'NO PHOTO'}")

    (out_dir / "catalogue-raw.json").write_text(json.dumps(rows, indent=2, ensure_ascii=False))
    missing = [r["page"] for r in rows if not r["photos"] or not r["code"]]
    print(f"\n{len(rows)} pages -> {out_dir/'catalogue-raw.json'}")
    print("pages needing a look:", missing or "none")


if __name__ == "__main__":
    main()
