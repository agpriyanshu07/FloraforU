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
  { key: "image", label: "image", required: false, note: "Image URL or path" },
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
    const image = (row.image ?? "").trim();

    const existing = code
      ? await db.product.findFirst({ where: { code }, select: { id: true } })
      : null;

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

    if (existing) {
      await db.product.update({ where: { id: existing.id }, data });
      if (image) {
        await db.productImage.deleteMany({ where: { productId: existing.id } });
        await db.productImage.create({
          data: { productId: existing.id, url: image, alt: `${name} — FloralforU`, isPrimary: true },
        });
      }
      result.updated += 1;
    } else {
      const slug = await freeSlug(name);
      const created = await db.product.create({ data: { ...data, slug } });
      if (image) {
        await db.productImage.create({
          data: { productId: created.id, url: image, alt: `${name} — FloralforU`, isPrimary: true },
        });
      }
      result.imported += 1;
    }
  }

  return result;
}

async function freeSlug(name: string): Promise<string> {
  const seed = slugify(name);
  let candidate = seed;
  let n = 2;
  while (await db.product.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${seed}-${n++}`;
  }
  return candidate;
}
