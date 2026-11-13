import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import PdfImporter from "./PdfImporter";

export const dynamic = "force-dynamic";

export default async function ImportPdfPage() {
  const [categories, coded] = await Promise.all([
    db.category.findMany({
      orderBy: { displayOrder: "asc" },
      select: {
        slug: true,
        name: true,
        subcategories: { select: { name: true }, orderBy: { displayOrder: "asc" } },
      },
    }),
    db.product.findMany({ where: { code: { not: null } }, select: { code: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Add products from a PDF"
        description="Upload your catalogue PDF. Each page is read for you — name, code, price, size and category — and the product photo is picked out. You check everything before it goes on the site."
        action={
          <Link href="/admin/products/import" className="btn-ghost">
            Use a spreadsheet instead
          </Link>
        }
      />
      <PdfImporter
        categories={categories.map((c) => ({ slug: c.slug, name: c.name, subcategories: c.subcategories.map((s) => s.name) }))}
        existingByCode={Object.fromEntries(coded.map((p) => [p.code!, p.name]))}
        ready={{ reader: Boolean(process.env.ANTHROPIC_API_KEY?.trim()), photos: isCloudinaryConfigured() }}
      />
    </>
  );
}
