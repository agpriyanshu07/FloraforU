import Link from "next/link";
import { PageHeader, StatTile, TableShell, EmptyRow } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { daysAgo, formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const now = new Date();
  const weekAgo = daysAgo(7);

  const [
    products,
    drafts,
    categories,
    activeOffers,
    enquiriesWeek,
    enquiriesTotal,
    unhandled,
    reviews,
    recent,
    missingImages,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { published: false } }),
    db.category.count(),
    db.offer.count({
      where: { published: true, startsAt: { lte: now }, endsAt: { gte: now } },
    }),
    db.enquiry.count({ where: { createdAt: { gte: weekAgo } } }),
    db.enquiry.count(),
    db.enquiry.count({ where: { handled: false } }),
    db.review.count({ where: { visible: true } }),
    db.product.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true, name: true, slug: true, price: true, priceOnEnquiry: true,
        published: true, updatedAt: true, category: { select: { name: true } },
      },
    }),
    db.product.count({ where: { images: { none: {} } } }),
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A quick read on the catalogue and this week's enquiries."
        action={
          <Link href="/admin/products/new" className="btn-primary">
            Add a product
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Products"
          value={products}
          hint={drafts > 0 ? `${drafts} unpublished` : "All published"}
          href="/admin/products"
        />
        <StatTile label="Categories" value={categories} href="/admin/categories" />
        <StatTile
          label="Active offers"
          value={activeOffers}
          hint={activeOffers === 0 ? "No campaign running" : "Live on the site now"}
          href="/admin/offers"
        />
        <StatTile
          label="Enquiries this week"
          value={enquiriesWeek}
          hint={`${enquiriesTotal} all time · ${unhandled} to follow up`}
          href="/admin/enquiries"
        />
      </div>

      {(missingImages > 0 || reviews === 0) && (
        <section aria-labelledby="todo-heading" className="mt-8">
          <h2 id="todo-heading" className="font-display text-xl">
            Worth doing
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {missingImages > 0 && (
              <li className="card p-4">
                <strong>{missingImages}</strong> product
                {missingImages === 1 ? " has" : "s have"} no photo. Product cards
                fall back to a placeholder until you add one.{" "}
                <Link href="/admin/products" className="text-rose-600 hover:text-rose-700">
                  Review products
                </Link>
              </li>
            )}
            {reviews === 0 && (
              <li className="card p-4">
                No reviews are published yet — the Reviews page is live but empty.{" "}
                <Link href="/admin/reviews" className="text-rose-600 hover:text-rose-700">
                  Add your Instagram reviews
                </Link>
              </li>
            )}
          </ul>
        </section>
      )}

      <section aria-labelledby="recent-heading" className="mt-8">
        <h2 id="recent-heading" className="mb-3 font-display text-xl">
          Recently edited
        </h2>
        <TableShell
          head={
            <tr>
              <th scope="col" className="px-4 py-3">Product</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3">Price</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Updated</th>
            </tr>
          }
        >
          {recent.length === 0 ? (
            <EmptyRow colSpan={5}>
              Nothing yet — <Link href="/admin/products/new" className="text-rose-600">add your first product</Link>.
            </EmptyRow>
          ) : (
            recent.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/products/${p.id}`} className="hover:text-rose-700">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-600">{p.category.name}</td>
                <td className="px-4 py-3">{formatPrice(p.price, p.priceOnEnquiry)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      p.published ? "bg-sage-100 text-sage-700" : "bg-marigold-100 text-marigold-700"
                    }`}
                  >
                    {p.published ? "Live" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-600">
                  {p.updatedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </section>
    </>
  );
}
