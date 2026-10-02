import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/format";
import { PHOTO_EDGE, THUMB_EDGE, photoJpegs } from "@/lib/pdf-photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Decoding and re-encoding 920 photographs takes about twelve seconds on a
// cold instance, and the platform default is ten. Warm instances serve from
// the cache in src/lib/pdf-photos.ts and finish in well under a second.
export const maxDuration = 60;

// Design tokens, mirrored from src/app/globals.css.
const ROSE = rgb(0.608, 0.173, 0.353);
const INK = rgb(0.165, 0.114, 0.133);
const MUTED = rgb(0.42, 0.353, 0.38);
const LINE = rgb(0.929, 0.878, 0.894);
const CREAM = rgb(1, 0.984, 0.969);

const A4 = { w: 595.28, h: 841.89 };
const M = 48;

/**
 * Generates the downloadable catalogue PDF from live database contents — this
 * replaces the shop's old "share a Google Drive PDF link" workflow, so it must
 * never be a hand-maintained file.
 *
 * Optional query params: ?category=<slug> to export a single category.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const categorySlug = url.searchParams.get("category") ?? undefined;

  // A slug that matches nothing would otherwise produce a cover page promising
  // "0 products across 0 categories" — a valid PDF of nothing, which looks like
  // the shop has no stock rather than like a bad link.
  const [settings, categories] = await Promise.all([
    getSettings(),
    db.category.findMany({
      where: categorySlug ? { slug: categorySlug } : undefined,
      orderBy: { displayOrder: "asc" },
      include: {
        products: {
          where: { published: true },
          orderBy: { name: "asc" },
          include: {
            // Primary first, then the shop's own order. A product page shows
            // the first large and up to two more as a strip beneath it.
            images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 3 },
          },
        },
      },
    }),
  ]);

  if (categorySlug && categories.length === 0) {
    return NextResponse.json({ error: "No such category." }, { status: 404 });
  }

  const only = categorySlug ? categories[0] : null;

  const doc = await PDFDocument.create();
  doc.setTitle(
    only
      ? `${settings.businessName} — ${only.name}`
      : `${settings.businessName} — Product Catalogue`,
  );
  doc.setAuthor(settings.businessName);
  doc.setSubject("Event décor, artificial flowers and SFX catalogue");
  doc.setCreationDate(new Date());

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const totalProducts = categories.reduce((n, c) => n + c.products.length, 0);
  const generatedOn = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ---------------------------------------------------------------- cover ---
  const cover = doc.addPage([A4.w, A4.h]);
  cover.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: CREAM });
  cover.drawRectangle({ x: 0, y: A4.h - 260, width: A4.w, height: 260, color: rgb(0.984, 0.929, 0.949) });
  cover.drawText(settings.businessName, {
    x: M, y: A4.h - 150, size: 40, font: bold, color: ROSE,
  });
  cover.drawText(settings.tagline, { x: M, y: A4.h - 182, size: 13, font: regular, color: MUTED });
  cover.drawText(only ? only.name : "Product Catalogue", {
    x: M, y: A4.h - 330, size: 26, font: bold, color: INK,
  });
  cover.drawText(
    only
      ? `${totalProducts} product${totalProducts === 1 ? "" : "s"} in this category · Generated ${generatedOn}`
      : `${totalProducts} products across ${categories.length} categories · Generated ${generatedOn}`,
    { x: M, y: A4.h - 356, size: 11, font: regular, color: MUTED },
  );

  let cy = A4.h - 420;
  for (const line of [
    `${settings.addressLine},`,
    `${settings.city} – ${settings.pincode}`,
    `Phone: ${settings.phone}`,
    `WhatsApp: ${settings.phone}`,
    `Email: ${settings.email}`,
    `Hours: ${settings.hours}`,
    settings.gstin ? `GSTIN: ${settings.gstin}` : "",
  ].filter(Boolean)) {
    cover.drawText(line, { x: M, y: cy, size: 11, font: regular, color: INK });
    cy -= 18;
  }

  cover.drawRectangle({ x: M, y: 150, width: A4.w - M * 2, height: 78, color: rgb(0.984, 0.929, 0.949) });
  cover.drawText("How to order", { x: M + 16, y: 200, size: 12, font: bold, color: ROSE });
  cover.drawText(
    "We do not take online payments. Message us on WhatsApp with the product name",
    { x: M + 16, y: 182, size: 10, font: regular, color: INK },
  );
  cover.drawText(
    "or code, and we'll confirm stock, final rate and delivery.",
    { x: M + 16, y: 168, size: 10, font: regular, color: INK },
  );

  // ---------------------------------------------------------- photographs ---
  // Every photo the catalogue is about to draw, converted up front so the page
  // loop below is pure layout. Nothing here can fail the request: an image
  // that cannot be read comes back null and its page draws a panel instead.
  const requests: { url: string; edge: number }[] = [];
  for (const category of categories) {
    for (const product of category.products) {
      product.images.forEach((image, i) => {
        requests.push({ url: image.url, edge: i === 0 ? PHOTO_EDGE : THUMB_EDGE });
      });
    }
  }
  const photos = await photoJpegs(requests);

  // pdf-lib writes one copy of an embedded image however many pages draw it,
  // but only if it is handed the same embedded object — so embed once per URL.
  const embedded = new Map<string, Awaited<ReturnType<typeof doc.embedJpg>> | null>();
  const embed = async (url: string, edge: number) => {
    const key = `${edge}:${url}`;
    if (embedded.has(key)) return embedded.get(key)!;
    const bytes = photos.get(key);
    if (!bytes) {
      embedded.set(key, null);
      return null;
    }
    try {
      const image = await doc.embedJpg(bytes);
      embedded.set(key, image);
      return image;
    } catch {
      embedded.set(key, null);
      return null;
    }
  };

  // --------------------------------------------------------- product pages ---
  // One product to a page, the way the shop's own supplier catalogue is laid
  // out: the photograph is the thing being sold, and a customer picking décor
  // is choosing by eye. The compact table this replaced is still here, as the
  // price list at the back, so nothing the old PDF did well was lost.
  // The band a product page may draw in: under the category rule, above the
  // footer. Photo and caption are measured together and centred in it, rather
  // than the photo sitting in a fixed box — otherwise a product with no spec
  // line and no extra photos leaves a third of the page empty under it, and
  // one with all three is cramped.
  const CONTENT_TOP = A4.h - M - 26;
  const CONTENT_BOTTOM = 84;
  const CONTENT_H = CONTENT_TOP - CONTENT_BOTTOM;
  const COL_W = A4.w - M * 2;
  const GAP = 28;
  const THUMB = 62;
  const THUMB_GAP = 10;

  const centred = (text: string, font: PDFFont, size: number) =>
    (A4.w - font.widthOfTextAtSize(text, size)) / 2;

  for (const category of categories) {
    for (const product of category.products) {
      const page = doc.addPage([A4.w, A4.h]);

      // Which category this is, on every page. A 590-page PDF scrolled on a
      // phone otherwise gives no clue where you are.
      page.drawText(sanitise(category.name).toUpperCase(), {
        x: M, y: A4.h - M, size: 8, font: bold, color: MUTED,
      });
      page.drawLine({
        start: { x: M, y: A4.h - M - 10 }, end: { x: A4.w - M, y: A4.h - M - 10 },
        thickness: 0.7, color: LINE,
      });

      const nameLines = wrapText(product.name, bold, 19, COL_W).slice(0, 2);
      const specLines = wrapText(product.spec, regular, 9.5, COL_W);
      const extras = product.images.slice(1);
      const captionH =
        nameLines.length * 23 + 22 + specLines.length * 12 + (extras.length ? 22 + THUMB : 0);

      const main = product.images[0] ? await embed(product.images[0].url, PHOTO_EDGE) : null;
      const maxPhotoH = CONTENT_H - captionH - GAP;
      const photoW = main ? Math.min(COL_W, main.width * (maxPhotoH / main.height)) : COL_W;
      const photoH = main ? Math.min(maxPhotoH, main.height * (COL_W / main.width)) : Math.min(maxPhotoH, 340);

      const top = CONTENT_TOP - (CONTENT_H - (photoH + GAP + captionH)) / 2;

      if (main) {
        page.drawImage(main, { x: (A4.w - photoW) / 2, y: top - photoH, width: photoW, height: photoH });
      } else {
        page.drawRectangle({
          x: M, y: top - photoH, width: COL_W, height: photoH,
          color: CREAM, borderColor: LINE, borderWidth: 0.7,
        });
        const note = "Photo coming soon";
        page.drawText(note, {
          x: centred(note, regular, 11), y: top - photoH / 2, size: 11, font: regular, color: MUTED,
        });
      }

      // ----------------------------------------------------------- caption ---
      let cy = top - photoH - GAP;
      for (const line of nameLines) {
        page.drawText(line, { x: centred(line, bold, 19), y: cy - 15, size: 19, font: bold, color: INK });
        cy -= 23;
      }

      const price = formatPrice(product.price, product.priceOnEnquiry).replace("₹", "Rs ");
      const meta = product.code ? `Code ${sanitise(product.code)}  ·  ${price}` : price;
      page.drawText(meta, {
        x: centred(meta, bold, 12), y: cy - 15, size: 12, font: bold,
        color: product.priceOnEnquiry ? MUTED : ROSE,
      });
      cy -= 22;

      for (const line of specLines) {
        page.drawText(line, { x: centred(line, regular, 9.5), y: cy - 9, size: 9.5, font: regular, color: MUTED });
        cy -= 12;
      }

      // ------------------------------------------------------ extra photos ---
      // The shop photographs a pack shot and a close-up, or the colour range,
      // and the product cards on the site already page through them. Throwing
      // them away here would lose the most useful part of some listings.
      if (extras.length > 0) {
        const stripY = cy - 22 - THUMB;
        const strip = extras.length * THUMB + (extras.length - 1) * THUMB_GAP;
        let x = (A4.w - strip) / 2;
        for (const image of extras) {
          const thumb = await embed(image.url, THUMB_EDGE);
          page.drawRectangle({
            x, y: stripY, width: THUMB, height: THUMB,
            color: CREAM, borderColor: LINE, borderWidth: 0.5,
          });
          if (thumb) {
            const scale = Math.min(THUMB / thumb.width, THUMB / thumb.height);
            const w = thumb.width * scale;
            const h = thumb.height * scale;
            page.drawImage(thumb, {
              x: x + (THUMB - w) / 2, y: stripY + (THUMB - h) / 2, width: w, height: h,
            });
          }
          x += THUMB + THUMB_GAP;
        }
      }
    }
  }

  // ------------------------------------------------------------- price list ---

  // The dense table the catalogue used to be. Keeping it means a customer who
  // already knows what they want can find a code and a rate without scrolling
  // through hundreds of photographs to reach it.
  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - M;

  page.drawText("Price list", { x: M, y, size: 22, font: bold, color: ROSE });
  y -= 18;
  page.drawText("Every product above, with its code and rate.", {
    x: M, y, size: 9.5, font: regular, color: MUTED,
  });
  y -= 28;

  const newPage = () => {
    page = doc.addPage([A4.w, A4.h]);
    y = A4.h - M;
  };

  const ensure = (needed: number) => {
    if (y - needed < M + 30) newPage();
  };

  for (const category of categories) {
    if (category.products.length === 0) continue;

    ensure(70);
    page.drawRectangle({
      x: M - 8, y: y - 24, width: A4.w - (M - 8) * 2, height: 30, color: rgb(0.984, 0.929, 0.949),
    });
    page.drawText(category.name, { x: M, y: y - 16, size: 15, font: bold, color: ROSE });
    y -= 42;

    page.drawText("PRODUCT", { x: M, y, size: 8, font: bold, color: MUTED });
    page.drawText("CODE", { x: 330, y, size: 8, font: bold, color: MUTED });
    page.drawText("PRICE", { x: 470, y, size: 8, font: bold, color: MUTED });
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.7, color: LINE });
    y -= 16;

    for (const product of category.products) {
      const specLines = wrapText(product.spec, regular, 8.5, 265);
      const rowHeight = 16 + specLines.length * 10;
      ensure(rowHeight + 8);

      page.drawText(truncate(product.name, regular, 11, 265), {
        x: M, y, size: 11, font: bold, color: INK,
      });
      page.drawText(product.code ?? "—", { x: 330, y, size: 9.5, font: regular, color: MUTED });

      const price = formatPrice(product.price, product.priceOnEnquiry);
      page.drawText(price.replace("₹", "Rs "), {
        x: 470, y, size: 10, font: bold, color: product.priceOnEnquiry ? MUTED : INK,
      });

      let sy = y - 12;
      for (const line of specLines) {
        page.drawText(line, { x: M, y: sy, size: 8.5, font: regular, color: MUTED });
        sy -= 10;
      }

      y = sy - 8;
      page.drawLine({ start: { x: M, y: y + 4 }, end: { x: A4.w - M, y: y + 4 }, thickness: 0.4, color: LINE });
      y -= 6;
    }

    y -= 12;
  }

  // ---------------------------------------------------------------- footer ---
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    if (i === 0) return;
    p.drawLine({
      start: { x: M, y: M - 6 }, end: { x: A4.w - M, y: M - 6 }, thickness: 0.5, color: LINE,
    });
    p.drawText(settings.pdfFooter, { x: M, y: M - 20, size: 8, font: regular, color: MUTED });
    const label = `Page ${i} of ${pages.length - 1}`;
    p.drawText(label, {
      x: A4.w - M - regular.widthOfTextAtSize(label, 8),
      y: M - 20, size: 8, font: regular, color: MUTED,
    });
  });

  const bytes = await doc.save();
  // The filename says which list it is: a shop that sends four category PDFs
  // in one WhatsApp thread cannot have them all called the same thing.
  const filename = `floralforu-${only ? only.slug : "catalogue"}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) return [];
  const words = sanitise(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let value = sanitise(text);
  while (value.length > 3 && font.widthOfTextAtSize(value, size) > maxWidth) {
    value = value.slice(0, -1);
  }
  return value === sanitise(text) ? value : `${value.slice(0, -1)}…`;
}

/**
 * pdf-lib's standard fonts are WinAnsi-encoded and throw on characters outside
 * that range (₹, curly quotes, ×). Map the ones our data actually contains.
 */
function sanitise(text: string): string {
  return text
    .replace(/₹/g, "Rs ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/×/g, "x")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "");
}
