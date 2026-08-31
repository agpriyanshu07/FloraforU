import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const [settings, categories] = await Promise.all([
    getSettings(),
    db.category.findMany({
      where: categorySlug ? { slug: categorySlug } : undefined,
      orderBy: { displayOrder: "asc" },
      include: {
        products: {
          where: { published: true },
          orderBy: { name: "asc" },
        },
      },
    }),
  ]);

  const doc = await PDFDocument.create();
  doc.setTitle(`${settings.businessName} — Product Catalogue`);
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
  cover.drawText("Product Catalogue", { x: M, y: A4.h - 330, size: 26, font: bold, color: INK });
  cover.drawText(
    `${totalProducts} products across ${categories.length} categories · Generated ${generatedOn}`,
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

  // ------------------------------------------------------------- listings ---
  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - M;

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
  const filename = `floralforu-catalogue-${new Date().toISOString().slice(0, 10)}.pdf`;

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
