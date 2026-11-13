/**
 * Builds fixtures/sample-catalogue.pdf, the test catalogue for "Add products
 * from a PDF". It is laid out the way the shop's real catalogue is, including
 * the parts that make picking the product photo hard:
 *
 *   - a border image on every page          -> must be ignored (repeats across pages)
 *   - a flower spray placed twice per page  -> must be ignored (repeats within a page)
 *   - a page-sized background on one page   -> must be ignored
 *   - a small WhatsApp-style icon           -> must be ignored (too small)
 *   - one product photo per page, one page with two photos of the same item
 *   - a cover page with no product, and a product with no price printed
 *
 *     npx tsx scripts/make-sample-catalogue-pdf.mts
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const solid = (w: number, h: number, r: number, g: number, b: number, label: string) =>
  sharp({ create: { width: w, height: h, channels: 4, background: { r, g, b, alpha: 1 } } })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${w}" height="${h}"><circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 3}" fill="white"/><text x="50%" y="55%" font-size="${Math.round(h / 8)}" text-anchor="middle" fill="black">${label}</text></svg>`,
        ),
      },
    ])
    .png()
    .toBuffer();

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);

const border = await doc.embedPng(await solid(600, 40, 155, 44, 90, "border"));
const spray = await doc.embedPng(await solid(160, 160, 120, 180, 90, "spray"));
const icon = await doc.embedPng(await solid(64, 64, 37, 211, 102, "wa"));
const background = await doc.embedPng(await solid(1240, 1754, 250, 240, 230, "bg"));

const W = 595.28;
const H = 841.89;

function furniture(page: ReturnType<typeof doc.addPage>) {
  page.drawImage(border, { x: 0, y: H - 40, width: W, height: 40 });
  page.drawImage(spray, { x: 20, y: 20, width: 90, height: 90 });
  page.drawImage(spray, { x: W - 110, y: 20, width: 90, height: 90 });
  page.drawImage(icon, { x: W / 2 - 10, y: 30, width: 20, height: 20 });
}

// Cover.
{
  const p = doc.addPage([W, H]);
  furniture(p);
  p.drawText("FloralforU Product Catalogue", { x: 120, y: 500, size: 26, font: bold });
  p.drawText("Shop no LGF A1, Dhanbad", { x: 200, y: 460, size: 14, font });
}

const products = [
  { code: "9901", lines: ["Test Rose Bunch", "Pack of 12 stems"], price: "Price - 120/- Per Pcs", colour: [200, 40, 80] as const, photos: 1 },
  { code: "9902", lines: ["Test Velvet Pannel"], price: "Price: 300/- Per Mtr", colour: [120, 20, 60] as const, photos: 2 },
  { code: "9903", lines: ["Test Tiwal Pannel Haldi", "Size:2*4 Feet"], price: "Price: /- Per Mtr", colour: [230, 180, 30] as const, photos: 1, background: true },
];

for (const prod of products) {
  const p = doc.addPage([W, H]);
  if (prod.background) p.drawImage(background, { x: 0, y: 0, width: W, height: H });
  furniture(p);
  p.drawText(prod.code, { x: 60, y: H - 90, size: 18, font: bold });
  prod.lines.forEach((ln, i) => p.drawText(ln, { x: 60, y: H - 120 - i * 22, size: 16, font }));
  for (let i = 0; i < prod.photos; i++) {
    const [r, g, b] = prod.colour;
    const img = await doc.embedPng(await solid(900, 900, r - i * 40, g, b + i * 40, `${prod.code}-${i + 1}`));
    p.drawImage(img, { x: 80 + i * 230, y: 220, width: i === 0 ? 300 : 200, height: i === 0 ? 300 : 200 });
  }
  p.drawText(prod.price, { x: 60, y: 160, size: 16, font: bold, color: rgb(0.6, 0.1, 0.3) });
}

writeFileSync("fixtures/sample-catalogue.pdf", await doc.save());
console.log("fixtures/sample-catalogue.pdf written");
