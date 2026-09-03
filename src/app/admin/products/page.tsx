import Link from "next/link";
import Image from "next/image";
import { PageHeader, TableShell, EmptyRow, Banner } from "@/components/admin/ui";
import BulkBar from "@/components/admin/BulkBar";
import SelectAll from "@/components/admin/SelectAll";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import type { Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const PER_PAGE = 25;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const categoryId = sp.categoryId ?? "";
  const status = sp.status ?? "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const where: Prisma.ProductWhereInput = {};
  if (q) {
    // Case-insensitive explicitly — see the note in src/lib/catalogue.ts.
    const like = { contains: q, mode: "insensitive" as const };
    where.OR = [{ name: like }, { code: like }, { spec: like }];
  }
  if (categoryId) where.categoryId = categoryId;
  if (status === "draft") where.published = false;
  if (status === "live") where.published = true;

  const [categories, products, total] = await Promise.all([
    db.category.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        category: { select: { name: true } },
        images: { take: 1, orderBy: { position: "asc" } },
      },
    }),
    db.product.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (categoryId) s.set("categoryId", categoryId);
    if (status) s.set("status", status);
    if (p > 1) s.set("page", String(p));
    const v = s.toString();
    return v ? `/admin/products?${v}` : "/admin/products";
  };

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"} matching the current filters.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/products/import" className="btn-ghost">
              Bulk import (CSV / Excel)
            </Link>
            <Link href="/admin/products/new" className="btn-primary">
              Add a product
            </Link>
          </div>
        }
      />

      {sp.saved && <Banner tone="success">Saved “{sp.saved}”. It&apos;s live on the site.</Banner>}
      {sp.deleted && <Banner tone="success">Product deleted.</Banner>}
      {sp.imported && (
        <Banner tone="success">
          Imported {sp.imported} product{sp.imported === "1" ? "" : "s"} successfully.
        </Banner>
      )}
      {sp.bulk && (
        <Banner tone="success">
          Applied “{sp.bulk}” to {sp.count} product{sp.count === "1" ? "" : "s"}.
        </Banner>
      )}
      {sp.error === "nothing-selected" && (
        <Banner tone="error">Tick at least one product before applying a bulk action.</Banner>
      )}
      {sp.error === "no-target-category" && (
        <Banner tone="error">Choose the category to move the selected products into.</Banner>
      )}

      <form method="get" className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto]">
        <div>
          <label htmlFor="q" className="field-label">Search</label>
          <input id="q" name="q" defaultValue={q} className="field" placeholder="Name, code or spec" />
        </div>
        <div>
          <label htmlFor="categoryId" className="field-label">Category</label>
          <select id="categoryId" name="categoryId" defaultValue={categoryId} className="field sm:w-48">
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="field-label">Status</label>
          <select id="status" name="status" defaultValue={status} className="field sm:w-36">
            <option value="">All</option>
            <option value="live">Live</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary">Filter</button>
          <Link href="/admin/products" className="btn-ghost">Reset</Link>
        </div>
      </form>

      <BulkBar categories={categories} />

      <form id="products-form">
        <TableShell
          head={
            <tr>
              <th scope="col" className="w-10 px-4 py-3"><SelectAll /></th>
              <th scope="col" className="px-4 py-3">Product</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3">Price</th>
              <th scope="col" className="px-4 py-3">Flags</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Updated</th>
            </tr>
          }
        >
          {products.length === 0 ? (
            <EmptyRow colSpan={7}>
              {q || categoryId || status ? (
                <>No products match those filters. <Link href="/admin/products" className="text-rose-600">Clear them</Link>.</>
              ) : (
                <>No products yet. <Link href="/admin/products/new" className="text-rose-600">Add one</Link> or <Link href="/admin/products/import" className="text-rose-600">bulk import a spreadsheet</Link>.</>
              )}
            </EmptyRow>
          ) : (
            products.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <input type="checkbox" name="ids" value={p.id} aria-label={`Select ${p.name}`} className="h-4 w-4 accent-[#9b2c5a]" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-rose-50">
                      {p.images[0] && (
                        <Image src={p.images[0].url} alt="" fill sizes="44px" className="object-cover" />
                      )}
                    </span>
                    <span>
                      <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-rose-700">
                        {p.name}
                      </Link>
                      <span className="block text-[12px] text-ink-600">
                        {p.code ? `Code ${p.code} · ` : ""}{p.spec || "No spec line"}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-600">{p.category.name}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatPrice(p.price, p.priceOnEnquiry)}</td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap gap-1 text-[11px] font-bold uppercase tracking-wider">
                    {(p.newUntil ? p.newUntil > new Date() : p.isNew) && (
                      <span className="rounded-full bg-sage-100 px-2 py-0.5 text-sage-700">New</span>
                    )}
                    {p.availability !== "in_stock" && (
                      <span className="rounded-full bg-marigold-100 px-2 py-0.5 text-marigold-700">
                        {p.availability === "limited" ? "Limited" : "MTO"}
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      p.published ? "bg-sage-100 text-sage-700" : "bg-marigold-100 text-marigold-700"
                    }`}
                  >
                    {p.published ? "Live" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-600">
                  {p.updatedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </form>

      {pageCount > 1 && (
        <nav aria-label="Product pages" className="mt-5 flex items-center justify-center gap-3 text-sm">
          {page > 1 ? <Link href={qs(page - 1)} className="btn-ghost btn-sm">Previous</Link> : <span aria-disabled="true" className="btn-ghost btn-sm cursor-not-allowed text-ink-600">Previous</span>}
          <span>Page {page} of {pageCount}</span>
          {page < pageCount ? <Link href={qs(page + 1)} className="btn-ghost btn-sm">Next</Link> : <span aria-disabled="true" className="btn-ghost btn-sm cursor-not-allowed text-ink-600">Next</span>}
        </nav>
      )}
    </>
  );
}
