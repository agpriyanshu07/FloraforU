import Link from "next/link";
import Image from "next/image";
import { PageHeader, TableShell, EmptyRow, Banner } from "@/components/admin/ui";
import CategoryForm from "@/components/admin/CategoryForm";
import DeleteCategory from "@/components/admin/DeleteCategory";
import SubcategoryManager from "@/components/admin/SubcategoryManager";
import { db } from "@/lib/db";
import { resolveCategoryImage } from "@/lib/category-image";

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

  // Only loaded for the category being edited. Fetching every category's
  // subcategories to render one list would be fifteen extra counts per page
  // view for a panel that is not on screen.
  const subcategories = editing
    ? await db.subcategory.findMany({
        where: { categoryId: editing.id },
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { products: true } },
        },
      })
    : [];
  const unfiledCount = editing
    ? await db.product.count({ where: { categoryId: editing.id, subcategoryId: null } })
    : 0;
  const blocked = sp.blocked ? categories.find((c) => c.id === sp.blocked) : undefined;

  return (
    <>
      <PageHeader
        title="Categories"
        description="Categories drive the site's navigation, the catalogue filter and the SEO copy on each category page."
      />

      {sp.saved && <Banner tone="success">Saved “{sp.saved}”.</Banner>}
      {sp.subsaved && <Banner tone="success">Subcategory “{sp.subsaved}” saved.</Banner>}
      {sp.subdeleted && (
        <Banner tone="success">
          Subcategory “{sp.subdeleted}” deleted.
          {Number(sp.freed) > 0 && (
            <>
              {" "}Its {sp.freed} product{sp.freed === "1" ? "" : "s"} stayed in the
              category and {sp.freed === "1" ? "is" : "are"} now unfiled.
            </>
          )}
        </Banner>
      )}
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

      {/* The list gets the whole column and the form stacks under it, the way
          Offers has always worked. Side by side, the form took ~300px and the
          list was left with a track that could not fit its own columns: the
          Actions cell ended up 63-124px behind the form, which is the same
          "the buttons are off screen" complaint the card layout fixed on a
          phone. No breakpoint solves it, because how wide the list needs to be
          depends on the rows in it, not on the window. */}
      <div className="flex flex-col gap-8">
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
            <EmptyRow colSpan={4}>No categories yet — add your first one below.</EmptyRow>
          ) : (
            categories.map((c) => (
              <tr key={c.id} className={editing?.id === c.id ? "bg-rose-50" : undefined}>
                <td data-label="" className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-rose-50">
                      {/* Resolved the same way the public cards resolve it, so this thumbnail
    shows what the site shows. The form below still holds the stored value,
    so editing a category cannot silently rewrite it. */}
{resolveCategoryImage(c.slug, c.imageUrl) && (
  <Image src={resolveCategoryImage(c.slug, c.imageUrl)!} alt="" fill sizes="44px" className="object-cover" />
)}
                    </span>
                    <span>
                      <span className="block font-medium">{c.name}</span>
                      <span className="block max-w-md text-[12px] text-ink-600">{c.description}</span>
                      <code className="mt-0.5 block text-[11px] text-ink-600">/categories/{c.slug}</code>
                    </span>
                  </div>
                </td>
                <td data-label="Products" className="px-4 py-3 text-ink-600">{c._count.products}</td>
                <td data-label="Order" className="px-4 py-3 text-ink-600">{c.displayOrder}</td>
                <td data-label="Actions" className="px-4 py-3">
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

        {/* While editing, the form comes first on a phone. The table stacks
            above it otherwise, so tapping Edit reloaded the page at the top
            with the form 2239px below the fold — it read as doing nothing at
            all. On a wide screen the two sit side by side and order is moot. */}
        <div className={editing ? "order-first" : undefined}>
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

          {editing && (
            <div className="mt-6">
              <SubcategoryManager
                categoryId={editing.id}
                categoryName={editing.name}
                categorySlug={editing.slug}
                subcategories={subcategories.map((s) => ({
                  id: s.id,
                  name: s.name,
                  slug: s.slug,
                  productCount: s._count.products,
                }))}
                unfiledCount={unfiledCount}
                error={sp.suberror === "name" ? "Give the subcategory a name (2+ characters)." : undefined}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
