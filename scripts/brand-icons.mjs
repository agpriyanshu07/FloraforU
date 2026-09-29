/**
 * Builds the browser-tab and home-screen icons from the shop's real logo.
 *
 * These were a placeholder: a rose disc with "FfU" set in Georgia, drawn
 * before the shop supplied artwork. Every icon is now the traced logo
 * (scripts/logo-vectorise.py) -- the whole mark, ring and dotted arc and
 * sprig and all -- at every size.
 *
 * An earlier version of this script dropped to the FfU monogram alone for the
 * 16px slot, because the ring and sprig do go soft down there. The shop asked
 * for the real logo and nothing else, which is their call to make: at 16px it
 * is a little mushy, and at 32px -- what a retina tab strip actually draws --
 * it reads clearly.
 *
 * The mark fills 0.96 of the disc rather than the 0.78 it started at. Rendered
 * side by side at 0.78/0.88/0.96/1.04, that is where "FfU" becomes legible at
 * 32px without the sprig being cut off by the disc edge.
 *
 * The disc itself is not decoration: the mark is black line art on cream,
 * which disappears entirely against dark browser chrome. The disc gives the
 * icon its own background and a recognisable silhouette in a crowded tab strip.
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

/** The traced mark's own coordinate space. */
const MARK_VIEWBOX = { w: 584, h: 515 };
/** How much of the disc the mark fills. See the note at the top of the file. */
const FIT = 0.96;

function pathData() {
  const svg = readFileSync(MARK, "utf8");
  const d = svg.match(/ d="([^"]+)"/);
  if (!d) throw new Error(`no path found in ${MARK}`);
  // The traced artwork carries two decimal places, which is worth keeping for
  // the 112px footer lockup but not here: rounding to one cuts the favicon
  // roughly in half, and at 48px the difference is a fraction of a pixel.
  return d[1].replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));
}

function disc(inner) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}">` +
    `<circle cx="${BOX / 2}" cy="${BOX / 2}" r="${BOX / 2}" fill="${ROSE}"/>` +
    `${inner}</svg>`
  );
}

/** The whole mark, fitted inside the disc. */
function fullMarkSvg(d) {
  const scale = (BOX * FIT) / Math.max(MARK_VIEWBOX.w, MARK_VIEWBOX.h);
  const tx = (BOX - MARK_VIEWBOX.w * scale) / 2;
  const ty = (BOX - MARK_VIEWBOX.h * scale) / 2;
  return disc(
    `<g transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${scale.toFixed(4)})">` +
      `<path fill="#ffffff" fill-rule="nonzero" d="${d}"/></g>`,
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
    { size: 16, png: await raster(page, full, 16) },
    { size: 32, png: await raster(page, full, 32) },
    { size: 48, png: await raster(page, full, 48) },
  ]),
);

await browser.close();

for (const f of ["icon.svg", "apple-icon.png", "favicon.ico"]) {
  const { size } = await import("node:fs").then((fs) => fs.statSync(join(APP, f)));
  console.log(`src/app/${f.padEnd(16)} ${String(size).padStart(6)} bytes`);
}
