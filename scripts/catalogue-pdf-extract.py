#!/usr/bin/env python3
"""
Pulls the raw facts out of the shop's catalogue PDF: one product per page,
plus that product's cut-out photo.

Deliberately mechanical. It reads the code, the name and the price lines
exactly as the PDF states them and writes them to JSON — it does not tidy
wording, guess a category or invent a spec line. Those are judgement calls and
they are made once, in the open, in catalogue-rows.json, rather than hidden in
a regex here.

How the product photo is picked, by elimination:

  * an image that repeats across pages is the border or the bouquet icon;
  * an image that repeats within one page is a decorative motif — the floral
    sprays are placed two and three times to a page;
  * an image the size and shape of the page is the page background.

Whatever survives is the product, largest first. All three rules are about
how a thing is used rather than what it looks like, which is why they hold
on a catalogue this script has never seen.

It is not infallible: a page whose only decoration appears once still offers
it as a candidate. Every photo is written out and the order is reported, so a
wrong pick is visible in the audit rather than silent.

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
    repeated_within_page: set[str] = set()
    page_aspect = 594.96 / 842.25
    for page in range(1, pages + 1):
        files = page_images(pdf, page, work)
        per_page[page] = files
        seen_on_page: dict[str, int] = {}
        for f in files:
            d = hashlib.md5(f.read_bytes()).hexdigest()
            digests[f] = d
            seen_on_page[d] = seen_on_page.get(d, 0) + 1
        for d, n in seen_on_page.items():
            counts[d] = counts.get(d, 0) + 1      # count each image once per page
            if n > 1:
                repeated_within_page.add(d)       # placed twice: decoration

    # Pass 2 — text, and the one image that belongs to this page alone.
    rows = []
    for page in range(1, pages + 1):
        lines = page_text(pdf, page)
        # Not every page carries a code: the furniture and the LED lights are
        # listed by name alone. When the first line is not a code it is the
        # start of the name, and dropping it silently renamed "BADA SHAGUN
        # CHAIR" to "CHAIR".
        # The code sits on a line of its own, but not always the first one: on
        # the newer pages the size arrows are typeset above it, so the page
        # opens "(6 Feet)" and the code follows. Looking only at line one lost
        # the code on those pages entirely.
        code_at = next(
            (i for i, ln in enumerate(lines[:3]) if re.fullmatch(r"\d{3,6}", ln)), None
        )
        code = lines[code_at] if code_at is not None else None
        body = [ln for i, ln in enumerate(lines) if i != code_at]
        price_at = next((i for i, ln in enumerate(body) if re.match(r"(?i)price", ln)), None)
        name_lines = body[:price_at] if price_at is not None else body
        price_lines = body[price_at:] if price_at is not None else []

        def collect(drop_repeats: bool) -> list:
            out = []
            for f in per_page[page]:
                if counts[digests[f]] > 1:       # appears on other pages: decoration
                    continue
                if drop_repeats and digests[f] in repeated_within_page:
                    continue
                im = Image.open(f)
                if im.mode == "L":               # a soft mask, not an image
                    continue
                w, h = im.size
                if w * h > 1_000_000 and abs(w / h - page_aspect) < 0.02:
                    continue                      # the page itself, not a product
                out.append((w * h, f, im.size))
            out.sort(reverse=True)
            return out

        candidates = collect(drop_repeats=True)
        if not candidates:
            # Some layouts print the product photo twice on its own page, which
            # the within-page rule reads as decoration and throws away. Stripping
            # decoration must never strip everything: when it does, keep the
            # repeats — a duplicated photo beats no photo.
            seen: set[str] = set()
            candidates = [
                c for c in collect(drop_repeats=False)
                if not (digests[c[1]] in seen or seen.add(digests[c[1]]))
            ]

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
