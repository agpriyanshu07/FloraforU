import { PageHeader, Banner, StickyActions } from "@/components/admin/ui";
import PinPicker, { type PinnableProduct } from "@/components/admin/PinPicker";
import CategoryOrder from "@/components/admin/CategoryOrder";
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
    // Every published product, not the 60 most recent. The old list was capped
    // because it rendered all of them; the picker renders a window and filters
    // the rest, so the cap only limited what you could search for. Pinning a
    // product from March meant it could not be found at all.
    db.product.findMany({
      where: { published: true },
      orderBy: [{ featured: "desc" }, { featureOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        price: true,
        priceOnEnquiry: true,
        featured: true,
        category: { select: { name: true } },
        images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
      },
    }),
    db.category.findMany({
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const pinnable: PinnableProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    categoryName: p.category.name,
    price: formatPrice(p.price, p.priceOnEnquiry),
    imageUrl: p.images[0]?.url ?? null,
    pinned: p.featured,
  }));

  const featuredCount = pinnable.filter((p) => p.pinned).length;

  return (
    <>
      <PageHeader
        title="Homepage"
        description="Control what the homepage shows without touching any code."
      />

      {sp.saved && <Banner tone="success">Homepage updated.</Banner>}

      <Banner tone="info">
        <strong>New Arrivals</strong> is automatic by default — it shows the most
        recently added products. Pin specific ones below to override that.
        {featuredCount > 0 && ` Currently pinning ${featuredCount}.`}
      </Banner>

      <form action={saveHomepageAction} className="space-y-8">
        <section aria-labelledby="pin-heading">
          <h2 id="pin-heading" className="mb-3 font-display text-2xl">
            Pin products to “New Arrivals”
          </h2>
          <PinPicker products={pinnable} />
        </section>

        <section aria-labelledby="order-heading">
          <h2 id="order-heading" className="mb-1 font-display text-2xl">
            Category order
          </h2>
          <p className="mb-4 text-sm text-ink-600">
            The order here is the order they appear in, on the homepage grid and in
            the catalogue filter. The homepage shows the first eight.
          </p>
          <CategoryOrder categories={categories} />
        </section>

        <StickyActions>
          <button type="submit" className="btn-primary">Save homepage</button>
        </StickyActions>
      </form>
    </>
  );
}
