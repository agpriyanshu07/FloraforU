import { NextResponse } from "next/server";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/format";
import { PHOTO_EDGE, THUMB_EDGE, photoJpegs } from "@/lib/pdf-photos";
import { BRAND, brandFonts, brandLogoPng } from "@/lib/pdf-brand";
import { sanitise, truncate, wrapText } from "@/lib/pdf-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Decoding and re-encoding 920 photographs takes about twelve seconds on a
// cold instance, and the platform default is ten. Warm instances serve from
// the cache in src/lib/pdf-photos.ts and finish in well under a second.
export const maxDuration = 60;

// Design tokens, mirrored from src/app/globals.css via src/lib/pdf-brand.ts.
const hex = (value: string) =>
  rgb(
    parseInt(value.slice(1, 3), 16) / 255,
    parseInt(value.slice(3, 5), 16) / 255,
    parseInt(value.slice(5, 7), 16) / 255,
  );
const ROSE = hex(BRAND.rose600);
const ROSE_DEEP = hex(BRAND.rose700);
const ROSE_TINT = hex(BRAND.rose50);
const INK = hex(BRAND.ink900);
const MUTED = hex(BRAND.ink600);
const LINE = hex(BRAND.line);
const CREAM = hex(BRAND.cream);

const A4 = { w: 595.28, h: 841.89 };
const M = 48;

/**
 * Generates the downloadable catalogue PDF from live database contents — this
 * replaces the shop's old "share a Google Drive PDF link" workflow, so it must
 * never be a hand-maintained file.
 *
 * Optional query params:
 *   ?category=<slug>          one category
 *   ?category=<slug>&sub=<slug>  one subcategory inside it
 *
 * The scoping is the point. Most enquiries are about one kind of thing, and
 * the shop answers them on WhatsApp — sending 183 gift boxes to someone asking
 * about dry fruit trays is the same as sending nothing. A subcategory download
 * has to contain that subcategory and nothing else.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const categorySlug = url.searchParams.get("category") ?? undefined;
  const subSlug = url.searchParams.get("sub") ?? undefined;

  // A subcategory slug is only unique inside its category — "Hanging" exists
  // under both Lights and Artificial Flowers — so one without a category names
  // nothing in particular.
  if (subSlug && !categorySlug) {
    return NextResponse.json(
      { error: "A subcategory download needs its category too." },
      { status: 400 },
    );
  }

  // A slug that matches nothing would otherwise produce a cover page promising
  // "0 products across 0 categories" — a valid PDF of nothing, which looks like
  // the shop has no stock rather than like a bad link.
  const [settings, categories] = await Promise.all([
    getSettings(),
    db.category.findMany({
      where: categorySlug ? { slug: categorySlug } : undefined,
      orderBy: { displayOrder: "asc" },
      include: {
        subcategories: { select: { id: true, slug: true, name: true } },
        products: {
          where: { published: true, ...(subSlug ? { subcategory: { slug: subSlug } } : {}) },
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

  // Checked against the category's own subcategories rather than inferred from
  // an empty product list: a real-but-empty subcategory and a slug that does
  // not exist both yield nothing, and only one of them is a broken link.
  const sub = subSlug ? only!.subcategories.find((x) => x.slug === subSlug) : undefined;
  if (subSlug && !sub) {
    return NextResponse.json({ error: "No such subcategory in that category." }, { status: 404 });
  }

  const doc = await PDFDocument.create();
  doc.setTitle(
    sub
      ? `${settings.businessName} — ${only!.name} — ${sub.name}`
      : only
        ? `${settings.businessName} — ${only.name}`
        : `${settings.businessName} — Product Catalogue`,
  );
  doc.setAuthor(settings.businessName);
  doc.setSubject("Event décor, artificial flowers and SFX catalogue");
  doc.setCreationDate(new Date());

  // The shop's own typefaces instead of Helvetica. This is also what lets the
  // catalogue print its own category names: the standard PDF fonts are
  // WinAnsi-encoded, so everything was being stripped to ASCII first and every
  // page of this category was headed "LIGHTS & LIGHTING DCOR".
  doc.registerFontkit(fontkit);
  const faces = await brandFonts();
  const display = await doc.embedFont(faces.displayBold, { subset: true });
  const regular = await doc.embedFont(faces.sansRegular, { subset: true });
  const bold = await doc.embedFont(faces.sansBold, { subset: true });

  const logoCream = await brandLogoPng(BRAND.cream, 900);
  const logoMark = await brandLogoPng(BRAND.rose600, 220);
  const coverLogo = logoCream ? await doc.embedPng(logoCream).catch(() => null) : null;
  const markLogo = logoMark ? await doc.embedPng(logoMark).catch(() => null) : null;

  /** What this export is of, in words. Used on the cover and in the header. */
  const scopeTitle = sub ? sub.name : only ? only.name : "Product Catalogue";

  const totalProducts = categories.reduce((n, c) => n + c.products.length, 0);
  const generatedOn = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ---------------------------------------------------------------- cover ---
  // Built from the site's own design tokens and the shop's real logo, so a
  // catalogue forwarded on WhatsApp still looks like it came from the shop
  // rather than from a reporting tool.
  const cover = doc.addPage([A4.w, A4.h]);
  const BAND = 300;
  cover.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: CREAM });
  cover.drawRectangle({ x: 0, y: A4.h - BAND, width: A4.w, height: BAND, color: ROSE });
  // A thin deeper edge under the band: the same trim the site uses to stop a
  // large flat colour meeting white with nothing between them.
  cover.drawRectangle({ x: 0, y: A4.h - BAND - 5, width: A4.w, height: 5, color: ROSE_DEEP });

  const mid = (text: string, font: PDFFont, size: number) =>
    (A4.w - font.widthOfTextAtSize(text, size)) / 2;

  if (coverLogo) {
    const w = 104;
    const h = (coverLogo.height / coverLogo.width) * w;
    cover.drawImage(coverLogo, { x: (A4.w - w) / 2, y: A4.h - 56 - h, width: w, height: h });
  }
  cover.drawText(sanitise(settings.businessName), {
    x: mid(sanitise(settings.businessName), display, 34), y: A4.h - 216, size: 34, font: display, color: CREAM,
  });
  cover.drawText(sanitise(settings.tagline), {
    x: mid(sanitise(settings.tagline), regular, 10.5), y: A4.h - 240, size: 10.5, font: regular, color: hex(BRAND.rose100),
  });

  // What this particular download is. On a subcategory export the parent
  // category is the smaller line above it, so the file says where it sits.
  let ty = A4.h - BAND - 64;
  if (sub) {
    const parent = sanitise(only!.name).toUpperCase();
    cover.drawText(parent, { x: mid(parent, bold, 9), y: ty, size: 9, font: bold, color: ROSE });
    ty -= 30;
  }
  for (const line of wrapText(scopeTitle, display, 27, A4.w - M * 2).slice(0, 2)) {
    cover.drawText(line, { x: mid(line, display, 27), y: ty, size: 27, font: display, color: INK });
    ty -= 32;
  }

  const countLine = `${totalProducts} product${totalProducts === 1 ? "" : "s"}${
    only ? "" : ` across ${categories.length} categories`
  }  ·  ${generatedOn}`;
  cover.drawText(countLine, {
    x: mid(countLine, regular, 10), y: ty - 2, size: 10, font: regular, color: MUTED,
  });

  // ---- contact card
  const cardH = 128;
  const cardY = 232;
  cover.drawRectangle({
    x: M, y: cardY, width: A4.w - M * 2, height: cardH,
    color: ROSE_TINT, borderColor: LINE, borderWidth: 0.8,
  });
  cover.drawText(sanitise(settings.legalName || settings.businessName), {
    x: M + 20, y: cardY + cardH - 26, size: 12, font: display, color: ROSE,
  });
  let cy = cardY + cardH - 46;
  for (const line of [
    `${settings.addressLine}, ${settings.city} – ${settings.pincode}`,
    `Phone ${settings.phone}   ·   WhatsApp ${settings.phone}`,
    `${settings.email}   ·   ${settings.hours}`,
    settings.gstin ? `GSTIN ${settings.gstin}` : "",
  ].filter(Boolean)) {
    cover.drawText(sanitise(line), { x: M + 20, y: cy, size: 9.5, font: regular, color: INK });
    cy -= 15;
  }

  // ---- how to order
  cover.drawRectangle({ x: M, y: 128, width: A4.w - M * 2, height: 78, color: CREAM, borderColor: ROSE, borderWidth: 0.8 });
  cover.drawText("How to order", { x: M + 20, y: 178, size: 11.5, font: display, color: ROSE });
  cover.drawText(
    "We do not take online payments. Message us on WhatsApp with the product",
    { x: M + 20, y: 160, size: 9.5, font: regular, color: INK },
  );
  cover.drawText(
    "name or code, and we'll confirm stock, the final rate and delivery.",
    { x: M + 20, y: 146, size: 9.5, font: regular, color: INK },
  );

  const site = sanitise(settings.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""));
  cover.drawText(site, { x: mid(site, bold, 10), y: 92, size: 10, font: bold, color: ROSE });
  if (settings.instagram) {
    const ig = sanitise("@" + settings.instagram.replace(/\/$/, "").split("/").pop());
    cover.drawText(ig, { x: mid(ig, regular, 9), y: 76, size: 9, font: regular, color: MUTED });
  }

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

      // Which category this is, on every page, with the shop's mark beside it.
      // A 590-page PDF scrolled on a phone otherwise gives no clue where you
      // are or whose catalogue it is.
      let hx = M;
      if (markLogo) {
        const h = 13;
        const w = (markLogo.width / markLogo.height) * h;
        page.drawImage(markLogo, { x: M, y: A4.h - M - 3, width: w, height: h });
        hx = M + w + 7;
      }
      const trail = sanitise(sub ? `${category.name} · ${sub.name}` : category.name).toUpperCase();
      page.drawText(trail, { x: hx, y: A4.h - M, size: 8, font: bold, color: MUTED });
      page.drawText(site, {
        x: A4.w - M - regular.widthOfTextAtSize(site, 8),
        y: A4.h - M, size: 8, font: regular, color: MUTED,
      });
      page.drawLine({
        start: { x: M, y: A4.h - M - 10 }, end: { x: A4.w - M, y: A4.h - M - 10 },
        thickness: 0.7, color: LINE,
      });

      const nameLines = wrapText(product.name, display, 19, COL_W).slice(0, 2);
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
        page.drawText(line, { x: centred(line, display, 19), y: cy - 15, size: 19, font: display, color: INK });
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

  page.drawText("Price list", { x: M, y, size: 22, font: display, color: ROSE });
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
    page.drawText(sanitise(sub ? `${category.name} · ${sub.name}` : category.name), {
      x: M, y: y - 16, size: 15, font: display, color: ROSE,
    });
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
      page.drawText(sanitise(product.code ?? "—"), { x: 330, y, size: 9.5, font: regular, color: MUTED });

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
    p.drawText(sanitise(settings.pdfFooter), { x: M, y: M - 20, size: 8, font: regular, color: MUTED });
    const label = `Page ${i} of ${pages.length - 1}`;
    p.drawText(label, {
      x: A4.w - M - regular.widthOfTextAtSize(label, 8),
      y: M - 20, size: 8, font: regular, color: MUTED,
    });
  });

  const bytes = await doc.save();
  // The filename says which list it is: a shop that sends four category PDFs
  // in one WhatsApp thread cannot have them all called the same thing.
  const filename = `floralforu-${only ? only.slug : "catalogue"}${
    sub ? `-${sub.slug}` : ""
  }-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
