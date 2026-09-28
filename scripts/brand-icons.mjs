/**
 * Builds the browser-tab and home-screen icons from the shop's real logo.
 *
 * Until now these were a placeholder: a rose disc with "FfU" set in Georgia,
 * drawn before the shop supplied artwork. This replaces them with the traced
 * logo (scripts/logo-vectorise.py), so the tab shows the actual mark.
 *
 * Two versions, because one file cannot serve both ends of the size range:
 *
 *   - The full mark (ring, dotted arc, sprig, FfU) for 32px and up. Rendered
 *     side by side at 16/32/48/64, the sprig turns to a grey smear below 32px
 *     but reads clearly at and above it.
 *   - The FfU monogram alone, lifted from that same traced artwork -- the
 *     shop's own letterforms, not a substitute typeface -- for the 16px slot,
 *     where the ring and sprig are illegible either way.
 *
 * Both sit on a rose-600 disc. The mark is black line art on cream, which
 * disappears entirely against a dark browser chrome; the disc gives the icon
 * its own background and a recognisable silhouette in a crowded tab strip.
 *
 * Chromium does the rasterising (it is already a dev dependency via
 * Playwright) and the .ico container is assembled by hand, because the format
 * is a header plus one directory entry per embedded PNG.
 *
 *   node scripts/brand-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const MARK = join(ROOT, "public/img/brand/logo-ffu-mark.svg");
const APP = join(ROOT, "src/app");

const ROSE = "#9b2c5a";      // --color-rose-600, the brand disc
const BOX = 640;             // working viewBox; every icon scales from this

/** The traced mark's own coordinate space, and where the FfU glyphs sit in it. */
const MARK_VIEWBOX = { w: 584, h: 515 };
const MONOGRAM = { x0: 160.5, y0: 201.2, x1: 366.3, y1: 304.9 };
/** Indices of the F, f and U contours within the traced path. */
const MONOGRAM_CONTOURS = [4, 3, 2];

function pathData() {
  const svg = readFileSync(MARK, "utf8");
  const d = svg.match(/ d="([^"]+)"/);
  if (!d) throw new Error(`no path found in ${MARK}`);
  // The traced artwork carries two decimal places, which is worth keeping for
  // the 112px footer lockup but not here: rounding to one cuts the favicon
  // roughly in half, and at 48px the difference is a fraction of a pixel.
  return d[1].replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));
}

/** Splits the single traced path into its separate closed contours. */
function contours(d) {
  return d
    .split("M")
    .filter((s) => s.trim())
    .map((s) => `M${s}`);
}

function disc(inner) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}">` +
    `<circle cx="${BOX / 2}" cy="${BOX / 2}" r="${BOX / 2}" fill="${ROSE}"/>` +
    `${inner}</svg>`
  );
}

/** The whole mark, fitted inside the disc with room to breathe. */
function fullMarkSvg(d) {
  const fit = 0.78;
  const scale = (BOX * fit) / Math.max(MARK_VIEWBOX.w, MARK_VIEWBOX.h);
  const tx = (BOX - MARK_VIEWBOX.w * scale) / 2;
  const ty = (BOX - MARK_VIEWBOX.h * scale) / 2;
  return disc(
    `<g transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${scale.toFixed(4)})">` +
      `<path fill="#ffffff" fill-rule="nonzero" d="${d}"/></g>`,
  );
}

/** Just the FfU glyphs, set large -- the 16px fallback. */
function monogramSvg(d) {
  const glyphs = MONOGRAM_CONTOURS.map((i) => contours(d)[i]).join("");
  const { x0, y0, x1, y1 } = MONOGRAM;
  const scale = (BOX * 0.66) / (x1 - x0);
  const tx = BOX / 2 - ((x0 + x1) / 2) * scale;
  const ty = BOX / 2 - ((y0 + y1) / 2) * scale;
  return disc(
    `<g transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${scale.toFixed(4)})">` +
      `<path fill="#ffffff" fill-rule="nonzero" d="${glyphs}"/></g>`,
  );
}

async function raster(page, svg, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0">` +
      `<div style="width:${size}px;height:${size}px">` +
      svg.replace("<svg ", `<svg style="width:100%;height:100%;display:block" `) +
      `</div></body></html>`,
  );
  return page.screenshot({ omitBackground: true });
}

/** ICO is a 6-byte header, then a 16-byte entry per image, then the PNGs. */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);            // reserved
  header.writeUInt16LE(1, 2);            // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, png }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size === 256 ? 0 : size, 0);
    e.writeUInt8(size === 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);                  // palette colours: none, it is RGBA
    e.writeUInt8(0, 3);                  // reserved
    e.writeUInt16LE(1, 4);               // colour planes
    e.writeUInt16LE(32, 6);              // bits per pixel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

const d = pathData();
const full = fullMarkSvg(d);
const mono = monogramSvg(d);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ deviceScaleFactor: 1 });

// The SVG favicon is what every current browser actually uses, and it scales
// cleanly, so it gets the full mark.
writeFileSync(join(APP, "icon.svg"), `${full}\n`);

// 180px, so the full mark's detail survives on an iOS home screen.
writeFileSync(join(APP, "apple-icon.png"), await raster(page, full, 180));

writeFileSync(
  join(APP, "favicon.ico"),
  ico([
    { size: 16, png: await raster(page, mono, 16) },
    { size: 32, png: await raster(page, full, 32) },
    { size: 48, png: await raster(page, full, 48) },
  ]),
);

await browser.close();

for (const f of ["icon.svg", "apple-icon.png", "favicon.ico"]) {
  const { size } = await import("node:fs").then((fs) => fs.statSync(join(APP, f)));
  console.log(`src/app/${f.padEnd(16)} ${String(size).padStart(6)} bytes`);
}
