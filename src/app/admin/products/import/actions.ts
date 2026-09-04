"use server";

import { revalidatePath } from "next/cache";
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
