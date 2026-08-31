import Image from "next/image";
import { PageHeader, Banner } from "@/components/admin/ui";
import { saveHomepageAction } from "@/lib/admin-actions";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminHomepagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { published: true },
      orderBy: [{ featured: "desc" }, { featureOrder: "asc" }, { createdAt: "desc" }],
      take: 60,
      include: {
        category: { select: { name: true } },
        images: { take: 1, orderBy: { position: "asc" } },
      },
    }),
    db.category.findMany({ orderBy: { displayOrder: "asc" } }),
  ]);

  const featuredCount = products.filter((p) => p.featured).length;

  return (
    <>
      <PageHeader
        title="Homepage"
        description="Control what the homepage shows without touching any code."
      />

      {sp.saved && <Banner tone="success">Homepage updated.</Banner>}

      <Banner tone="info">
        <strong>New Arrivals</strong> is automatic by default — it shows the most
        recently added products. Tick products below to pin specific ones instead.
        {featuredCount > 0 && ` Currently pinning ${featuredCount}.`}
      </Banner>

      <form action={saveHomepageAction} className="space-y-8">
        <section aria-labelledby="pin-heading">
          <h2 id="pin-heading" className="mb-3 font-display text-2xl">
            Pin products to “New Arrivals”
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <li key={p.id}>
                <label className="card flex cursor-pointer items-start gap-3 p-3 hover:bg-rose-50">
                  <input
                    type="checkbox"
                    name="featured"
                    value={p.id}
                    defaultChecked={p.featured}
                    className="mt-1 h-5 w-5 shrink-0 accent-[#9b2c5a]"
                  />
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-rose-50">
                    {p.images[0] && (
                      <Image src={p.images[0].url} alt="" fill sizes="48px" className="object-cover" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block text-[12px] text-ink-600">
                      {p.category.name} · {formatPrice(p.price, p.priceOnEnquiry)}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-ink-600">
            Showing the 60 most recent products. Untick everything to go back to fully automatic.
          </p>
        </section>

        <section aria-labelledby="order-heading">
          <h2 id="order-heading" className="mb-3 font-display text-2xl">
            Category order
          </h2>
          <p className="mb-4 text-sm text-ink-600">
            Lower numbers appear first, on the homepage grid and in the catalogue filter.
            The homepage shows the first eight.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <li key={c.id} className="card flex items-center gap-3 p-3">
                <label htmlFor={`order-${c.id}`} className="flex-1 text-sm font-medium">
                  {c.name}
                </label>
                <input
                  id={`order-${c.id}`}
                  type="number"
                  min="0"
                  defaultValue={c.displayOrder}
                  className="field w-20"
                  name={`categoryOrder_${c.id}`}
                />
              </li>
            ))}
          </ul>
        </section>

        <button type="submit" className="btn-primary">Save homepage</button>
      </form>
    </>
  );
}
