import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import ImportForm from "./ImportForm";
import { IMPORT_COLUMNS } from "@/lib/import";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const categories = await db.category.findMany({
    orderBy: { displayOrder: "asc" },
    select: { name: true },
  });

  return (
    <>
      <PageHeader
        title="Bulk import products"
        description="Load your whole price list in one go instead of typing products one at a time. Rows are validated individually — one bad row never stops the rest."
        action={
          <Link href="/api/import-template" className="btn-ghost">
            Download the template CSV
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <ImportForm />
        </div>

        <aside className="space-y-5">
          <div className="card p-5">
            <h2 className="font-display text-xl">Columns</h2>
            <p className="mt-1 text-[13px] text-ink-600">
              Put these in the first row. Order doesn&apos;t matter, and capitals and
              spaces are ignored. Extra columns are skipped.
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              {IMPORT_COLUMNS.map((c) => (
                <div key={c.key}>
                  <dt className="font-mono font-semibold">
                    {c.label}
                    {c.required && <span className="ml-1 text-rose-600">*</span>}
                  </dt>
                  <dd className="text-[13px] text-ink-600">{c.note}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[13px] text-ink-600">
              <span className="text-rose-600">*</span> required. A row whose{" "}
              <code className="font-mono">code</code> matches an existing product
              updates that product instead of creating a duplicate.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="font-display text-xl">Category names</h2>
            <p className="mt-1 text-[13px] text-ink-600">
              The <code className="font-mono">category</code> column must match one of
              these exactly (or its URL slug):
            </p>
            <ul className="mt-3 space-y-1 text-[13px] text-ink-600">
              {categories.map((c) => (
                <li key={c.name}>{c.name}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
