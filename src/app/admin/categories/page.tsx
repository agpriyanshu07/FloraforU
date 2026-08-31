import Link from "next/link";
import Image from "next/image";
import { PageHeader, TableShell, EmptyRow, Banner } from "@/components/admin/ui";
import CategoryForm from "@/components/admin/CategoryForm";
import DeleteCategory from "@/components/admin/DeleteCategory";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;

  const categories = await db.category.findMany({
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  const editing = sp.edit ? categories.find((c) => c.id === sp.edit) : undefined;
  const blocked = sp.blocked ? categories.find((c) => c.id === sp.blocked) : undefined;

  return (
    <>
      <PageHeader
        title="Categories"
        description="Categories drive the site's navigation, the catalogue filter and the SEO copy on each category page."
      />

      {sp.saved && <Banner tone="success">Saved “{sp.saved}”.</Banner>}
      {sp.deleted && (
        <Banner tone="success">
          Category deleted{sp.moved && sp.moved !== "0" ? `, and ${sp.moved} product(s) moved to the category you picked.` : "."}
        </Banner>
      )}
      {blocked && (
        <Banner tone="error">
          “{blocked.name}” still has {sp.count} product{sp.count === "1" ? "" : "s"} in it.
          Pick a category to move them into before deleting — products are never left
          without a category.
        </Banner>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <TableShell
          head={
            <tr>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3">Products</th>
              <th scope="col" className="px-4 py-3">Order</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
        >
          {categories.length === 0 ? (
            <EmptyRow colSpan={4}>No categories yet — add your first one on the right.</EmptyRow>
          ) : (
            categories.map((c) => (
              <tr key={c.id} className={editing?.id === c.id ? "bg-rose-50" : undefined}>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-rose-50">
                      {c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="44px" className="object-cover" />}
                    </span>
                    <span>
                      <span className="block font-medium">{c.name}</span>
                      <span className="block max-w-md text-[12px] text-ink-600">{c.description}</span>
                      <code className="mt-0.5 block text-[11px] text-ink-600">/categories/{c.slug}</code>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-600">{c._count.products}</td>
                <td className="px-4 py-3 text-ink-600">{c.displayOrder}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/categories?edit=${c.id}`} className="btn-ghost btn-sm">
                      Edit
                    </Link>
                    <DeleteCategory
                      id={c.id}
                      name={c.name}
                      productCount={c._count.products}
                      others={categories
                        .filter((o) => o.id !== c.id)
                        .map((o) => ({ id: o.id, name: o.name }))}
                    />
                  </div>
                </td>
              </tr>
            ))
          )}
        </TableShell>

        <div>
          <CategoryForm
            key={editing?.id ?? "new"}
            values={
              editing
                ? {
                    id: editing.id,
                    name: editing.name,
                    description: editing.description,
                    imageUrl: editing.imageUrl ?? "",
                    displayOrder: editing.displayOrder,
                  }
                : { displayOrder: categories.length }
            }
          />
        </div>
      </div>
    </>
  );
}
