"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { refreshPublicPages } from "@/lib/revalidate";
import { importProducts, parseImportFile, type ImportResult } from "@/lib/import";

export type ImportState = {
  error?: string;
  result?: ImportResult;
  dryRun?: boolean;
};

const MAX_BYTES = 5 * 1024 * 1024;

export async function importAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireSession();

  const file = formData.get("file");
  const dryRun = formData.get("dryRun") === "on";

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a .csv or .xlsx file to import." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That file is over 5 MB. Split it into smaller batches." };
  }
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
    return { error: "Unsupported file type. Export your spreadsheet as .csv or .xlsx." };
  }

  let rows;
  try {
    rows = parseImportFile(Buffer.from(await file.arrayBuffer()), file.name);
  } catch {
    return {
      error:
        "We couldn't read that file. Check it opens in Excel and that the first row contains the column headers.",
    };
  }

  if (rows.length === 0) {
    return {
      error:
        "No rows found. The first row must be the column headers (name, category, spec, price…).",
    };
  }
  if (rows.length > 2000) {
    return { error: "That's over 2,000 rows. Please split the file into smaller batches." };
  }

  const result = await importProducts(rows, { dryRun });

  if (!dryRun) {
    refreshPublicPages();
    revalidatePath("/admin/products");
  }

  return { result, dryRun };
}

// ------------------------------------------------------------ PDF import ---

const pdfRow = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(120),
  subcategory: z.string().trim().max(120).default(""),
  spec: z.string().trim().max(300).default(""),
  price: z.string().trim().max(20).default(""),
  code: z.string().trim().max(40).default(""),
  description: z.string().trim().max(3000).default(""),
  availability: z.enum(["in_stock", "limited", "made_to_order"]).default("in_stock"),
  // Uploaded photo URLs, main first, joined the way the CSV importer reads them.
  image: z.string().trim().max(4000).default(""),
  published: z.enum(["yes", "no"]).default("yes"),
});

export type PdfPublishState = { error?: string; result?: ImportResult };

/**
 * The last step of "Import from PDF": the rows the admin checked on the review
 * screen go through exactly the same importer as a CSV, so the same rules hold
 * -- per-row validation, a matching code updates rather than duplicates, and
 * an empty subcategory is filed automatically from the name.
 */
export async function publishPdfRowsAction(rows: unknown): Promise<PdfPublishState> {
  await requireSession();
  const parsed = z.array(pdfRow).min(1).max(2000).safeParse(rows);
  if (!parsed.success) {
    return { error: "Some products are missing a name or category. Fill them in and try again." };
  }
  const result = await importProducts(parsed.data);
  refreshPublicPages();
  revalidatePath("/admin/products");
  return { result };
}
