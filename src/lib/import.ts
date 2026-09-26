import "server-only";
import Papa from "papaparse";
import * as XLSX from "xlsx-republish";
import { db } from "./db";
import { slugify } from "./format";

export type ImportRow = Record<string, string>;

export type RowError = { row: number; field: string; message: string; raw: string };

export type ImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: RowError[];
  totalRows: number;
};

/** Columns the importer understands. Header matching is case/space-insensitive. */
export const IMPORT_COLUMNS = [
  { key: "name", label: "name", required: true, note: "Product name" },
  { key: "category", label: "category", required: true, note: "Category name or slug — must already exist" },
  { key: "spec", label: "spec", required: false, note: "Pack/size line, free text" },
  { key: "price", label: "price", required: false, note: "Number only. Leave blank for Price on Enquiry" },
  { key: "code", label: "code", required: false, note: "Your product code" },
  { key: "description", label: "description", required: false, note: "Longer text for the product page" },
  { key: "availability", label: "availability", required: false, note: "in_stock | limited | made_to_order" },
  { key: "image", label: "image", required: false, note: "Image URL or path. Several photos of the same item: separate them with | (the first is the main one)" },
  { key: "published", label: "published", required: false, note: "yes/no — defaults to yes" },
] as const;

export const SAMPLE_CSV_HEADER = IMPORT_COLUMNS.map((c) => c.label).join(",");

const normaliseKey = (k: string) => k.trim().toLowerCase().replace(/[\s_-]+/g, "");

function remapHeaders(row: Record<string, unknown>): ImportRow {
  const out: ImportRow = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const key = normaliseKey(rawKey);
    const match = IMPORT_COLUMNS.find((c) => normaliseKey(c.label) === key);
    if (match) out[match.key] = value === null || value === undefined ? "" : String(value).trim();
  }
  return out;
}

export function parseImportFile(buffer: Buffer, filename: string): ImportRow[] {
  if (/\.(xlsx|xls)$/i.test(filename)) {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    return json.map(remapHeaders);
  }

  const text = buffer.toString("utf8");
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
  });
  return parsed.data.map(remapHeaders);
}

/**
 * Validates and imports rows. Validation is per-row: one bad row never aborts
 * the whole file, and every rejection is reported back with its row number, the
 * offending field and the raw value, so the shop owner can fix the spreadsheet.
 *
 * A row whose `code` matches an existing product updates that product rather
 * than creating a duplicate.
 */
export async function importProducts(
  rows: ImportRow[],
  options: { dryRun?: boolean } = {},
): Promise<ImportResult> {
  const categories = await db.category.findMany({
    select: { id: true, name: true, slug: true },
  });
  const categoryByKey = new Map<string, string>();
  for (const c of categories) {
    categoryByKey.set(normaliseKey(c.name), c.id);
    categoryByKey.set(normaliseKey(c.slug), c.id);
  }

  const result: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    totalRows: rows.length,
  };

  const seenCodes = new Set<string>();

  for (const [i, row] of rows.entries()) {
    // +2: one for the header row, one because spreadsheets are 1-indexed.
    const rowNumber = i + 2;
    const rowErrors: RowError[] = [];

    const name = (row.name ?? "").trim();
    if (name.length < 2) {
      rowErrors.push({
        row: rowNumber,
        field: "name",
        message: "Product name is missing or too short.",
        raw: name,
      });
    }

    const categoryRaw = (row.category ?? "").trim();
    const categoryId = categoryByKey.get(normaliseKey(categoryRaw));
    if (!categoryId) {
      rowErrors.push({
        row: rowNumber,
        field: "category",
        message: categoryRaw
          ? `No category called "${categoryRaw}". Create it first, or correct the spelling.`
          : "Category is required.",
        raw: categoryRaw,
      });
    }

    const priceRaw = (row.price ?? "").trim().replace(/[₹,\s]/g, "");
    let price: number | null = null;
    let priceOnEnquiry = true;
    if (priceRaw !== "") {
      const parsedPrice = Number(priceRaw);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        rowErrors.push({
          row: rowNumber,
          field: "price",
          message: "Price must be a number (or blank for Price on Enquiry).",
          raw: row.price ?? "",
        });
      } else {
        price = parsedPrice;
        priceOnEnquiry = false;
      }
    }

    const availabilityRaw = normaliseKey(row.availability ?? "instock") || "instock";
    const availabilityMap: Record<string, string> = {
      instock: "in_stock",
      limited: "limited",
      madetoorder: "made_to_order",
    };
    const availability = availabilityMap[availabilityRaw];
    if (!availability) {
      rowErrors.push({
        row: rowNumber,
        field: "availability",
        message: "Use in_stock, limited or made_to_order (or leave blank).",
        raw: row.availability ?? "",
      });
    }

    const code = (row.code ?? "").trim();
    if (code && seenCodes.has(code)) {
      rowErrors.push({
        row: rowNumber,
        field: "code",
        message: `Code "${code}" appears more than once in this file.`,
        raw: code,
      });
    }
    if (code) seenCodes.add(code);

    if (rowErrors.length > 0) {
      result.errors.push(...rowErrors);
      result.skipped += 1;
      continue;
    }

    if (options.dryRun) {
      result.imported += 1;
      continue;
    }

    const publishedRaw = normaliseKey(row.published ?? "yes");
    const published = !["no", "false", "0", "draft"].includes(publishedRaw);
    // One cell, several photos. Décor sells on how it looks and most of these
    // items come in a range of colours, which the product card already pages
    // through — so a catalogue page showing four views should not lose three of
    // them on the way in. The first is the primary; blanks and duplicates are
    // dropped so a trailing "|" or a repeated path cannot create empty rows.
    const images = [
      ...new Set(
        (row.image ?? "")
          .split("|")
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    ];

    // Code first, name second. Not everything in the catalogue is numbered —
    // the furniture and the LED lights are listed by name alone — and without
    // the fallback a second upload of the same file silently creates a second
    // copy of every one of them.
    const existing = code
      ? await db.product.findFirst({ where: { code }, select: { id: true, slug: true } })
      : await db.product.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
          select: { id: true, slug: true },
        });

    const data = {
      name,
      code: code || null,
      spec: (row.spec ?? "").trim(),
      description: (row.description ?? "").trim(),
      price,
      priceOnEnquiry,
      availability: availability!,
      published,
      categoryId: categoryId!,
    };

    const photoRows = (productId: string) =>
      images.map((url, i) => ({
        productId,
        url,
        alt: `${name} — FloralforU`,
        position: i,
        isPrimary: i === 0,
      }));

    if (existing) {
      // A row matched by code can carry a different name — that is the whole
      // point of re-importing a corrected price list. The slug has to follow,
      // or a product ends up living at someone else's URL: importing this
      // catalogue over the seeded placeholders put "Paper Fan" on
      // /product/glue-stick. The old slug is kept so any link already sent on
      // WhatsApp redirects to the new one rather than 404ing.
      const slug = await freeSlug(name, existing.id);
      const moved = slug !== existing.slug;
      await db.product.update({
        where: { id: existing.id },
        data: moved
          ? { ...data, slug, previousSlugs: { push: existing.slug } }
          : data,
      });
      // Only when the row actually carries photos: an import meant to correct
      // prices must not strip the pictures off every product it touches.
      if (images.length > 0) {
        await db.productImage.deleteMany({ where: { productId: existing.id } });
        await db.productImage.createMany({ data: photoRows(existing.id) });
      }
      result.updated += 1;
    } else {
      const slug = await freeSlug(name);
      const created = await db.product.create({ data: { ...data, slug } });
      if (images.length > 0) {
        await db.productImage.createMany({ data: photoRows(created.id) });
      }
      result.imported += 1;
    }
  }

  return result;
}

async function freeSlug(name: string, ignoreId?: string): Promise<string> {
  const seed = slugify(name);
  let candidate = seed;
  let n = 2;
  // `ignoreId` keeps a product from colliding with itself on re-import, which
  // would walk its own slug to -2, -3, -4 on every run.
  while (
    await db.product.findFirst({
      where: { slug: candidate, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
      select: { id: true },
    })
  ) {
    candidate = `${seed}-${n++}`;
  }
  return candidate;
}
