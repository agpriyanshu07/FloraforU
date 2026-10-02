import Link from "next/link";
import Image from "next/image";
import { PageHeader, Banner, StickyActions } from "@/components/admin/ui";
import { fileProductsAction } from "@/lib/admin-actions";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * File products under subcategories by looking at them.
 *
 * Most of the catalogue filed itself: "Rose Garland" is a garland, "Fog
 * Machine" is a machine, and a rule over the product name gets it right every
 * time. Pots & Vases is the category where that approach runs out. The shop
 * sorts pots by material -- plastic, ceramic, metal, china -- and the material
 * appears nowhere in the data: not in the name ("Aura Pot 10 Inch"), not in
 * the spec, not in the description, which is itself generated from the name.
 * Of 41 pots, two mention a material anywhere in their text.
 *
 * It is in the photograph, and that is the whole reason this page exists. The
 * bulk action on the products list is the right tool when the rows share
 * something a filter can find; it is the wrong one when the only way to tell a
 * ceramic pot from a plastic one is to look at it. So: every unfiled product
 * as a photo with its own dropdown, and one Save for the screen.
 */
export default async function AdminFilingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const showAll = sp.show === "all";

  // Only categories that have subcategories can be filed at all. The five
  // deliberately flat ones (Carpets & Flooring, Lamps & Diyas, Accessories,
  // Cooler & Fan, Festive & Puja Items) would otherwise show up here as
  // permanently unfinished work, which is the opposite of true.
  const categories = await db.category.findMany({
    where: { subcategories: { some: {} } },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: { where: { subcategoryId: null } } } },
    },
  });

  // Whichever category has work waiting, so the page opens on something to do
  // rather than on an empty first category.
  const selected =
    categories.find((c) => c.id === sp.categoryId) ??
    categories.find((c) => c._count.products > 0) ??
    categories[0];

  const [subcategories, products] = selected
    ? await Promise.all([
        db.subcategory.findMany({
          where: { categoryId: selected.id },
          orderBy: { displayOrder: "asc" },
          select: { id: true, name: true },
        }),
        db.product.findMany({
          where: {
            categoryId: selected.id,
            ...(showAll ? {} : { subcategoryId: null }),
          },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            spec: true,
            price: true,
            priceOnEnquiry: true,
            subcategoryId: true,
            images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
          },
        }),
      ])
    : [[], []];

  const remaining = categories.reduce((n, c) => n + c._count.products, 0);

  return (
    <>
      <PageHeader
        title="File by photo"
        description="Some products cannot be filed from their name — the shop sorts pots by material, and nothing in “Aura Pot 10 Inch” says whether it is plastic or ceramic. Here they are as photos: pick a subcategory under each one and save the screen in a single pass."
        action={
          <Link href="/admin/products" className="btn-ghost">
            Back to products
          </Link>
        }
      />

      {sp.filed === "0" && (
        <Banner tone="info">Nothing changed — every dropdown was already where it is now.</Banner>
      )}
      {sp.filed && sp.filed !== "0" && (
        <Banner tone="success">
          Filed <strong>{sp.filed}</strong> product{sp.filed === "1" ? "" : "s"}. They now show
          under their subcategory&rsquo;s chip on the website.
        </Banner>
      )}

      {categories.length === 0 ? (
        <Banner tone="info">
          No category has subcategories yet. Add some under{" "}
          <Link href="/admin/categories" className="underline">
            Categories
          </Link>{" "}
          and anything that cannot be filed automatically will appear here.
        </Banner>
      ) : (
        <>
          {/* The category picker doubles as the progress report: a category
              reading 0 is finished, and there is no separate place to go and
              check. */}
          <nav aria-label="Category" className="mb-6 flex flex-wrap gap-2">
            {categories.map((c) => {
              const active = c.id === selected?.id;
              const done = c._count.products === 0;
              return (
                <Link
                  key={c.id}
                  href={`/admin/products/filing?categoryId=${c.id}${showAll ? "&show=all" : ""}`}
                  aria-current={active ? "true" : undefined}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                    active
                      ? "border-rose-600 bg-rose-600 text-white"
                      : "border-line bg-surface hover:border-rose-300 hover:bg-rose-50"
                  }`}
                >
                  {c.name}
                  <span
                    className={`text-[12px] tabular-nums ${
                      active ? "text-rose-100" : done ? "text-ink-600" : "text-rose-600"
                    }`}
                  >
                    {done ? "done" : c._count.products}
                  </span>
                </Link>
              );
            })}
          </nav>

          {selected && (
            <section className="card p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl">
                  {selected.name}
                  <span className="ml-2 text-sm font-normal text-ink-600">
                    {showAll
                      ? `${products.length} product${products.length === 1 ? "" : "s"}, filed and unfiled`
                      : `${products.length} still unfiled`}
                  </span>
                </h2>
                {/* Showing everything is how a mistake gets corrected: a
                    product filed under the wrong subcategory is no longer
                    unfiled, so it would never appear on this page again. */}
                <Link
                  href={`/admin/products/filing?categoryId=${selected.id}${showAll ? "" : "&show=all"}`}
                  className="btn-ghost btn-sm"
                >
                  {showAll ? "Show only unfiled" : "Show all, including filed"}
                </Link>
              </div>

              {subcategories.length === 0 ? (
                <Banner tone="info">
                  {selected.name} has no subcategories, so there is nothing to file into. Add some
                  on{" "}
                  <Link href={`/admin/categories?edit=${selected.id}`} className="underline">
                    its category page
                  </Link>
                  .
                </Banner>
              ) : products.length === 0 ? (
                <Banner tone="success">
                  Every product in {selected.name} is filed.{" "}
                  {remaining > 0 ? (
                    <>Pick another category above — {remaining} left across the catalogue.</>
                  ) : (
                    <>Nothing is left unfiled anywhere in the catalogue.</>
                  )}
                </Banner>
              ) : (
                <form action={fileProductsAction}>
                  <input type="hidden" name="categoryId" value={selected.id} />
                  {showAll && <input type="hidden" name="show" value="all" />}

                  {/* auto-fill rather than fixed columns: the tiles stay wide
                      enough to judge a photo by at every width, including the
                      ~1000px the admin main column has left once the sidebar
                      takes its 272px. */}
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-4">
                    {products.map((p) => (
                      <li key={p.id} className="rounded-xl border border-line p-3">
                        <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-lg bg-rose-50/60">
                          {p.images[0] ? (
                            <Image
                              src={p.images[0].url}
                              alt=""
                              fill
                              sizes="240px"
                              /* contain, not cover: a cropped pot is exactly
                                 the thing this page cannot afford to hide. */
                              className="object-contain"
                            />
                          ) : (
                            <span className="absolute inset-0 grid place-items-center text-xs text-ink-600">
                              No photo
                            </span>
                          )}
                        </div>

                        <label htmlFor={`sub_${p.id}`} className="block text-sm font-medium">
                          {p.name}
                        </label>
                        <p className="mb-2 line-clamp-1 text-[12px] text-ink-600">
                          {p.spec || formatPrice(p.price, p.priceOnEnquiry)}
                        </p>

                        <select
                          id={`sub_${p.id}`}
                          name={`sub_${p.id}`}
                          defaultValue={p.subcategoryId ?? ""}
                          className="field h-10 py-1 text-sm"
                        >
                          <option value="">Not filed</option>
                          {subcategories.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>

                  <StickyActions>
                    <button type="submit" className="btn-primary">
                      Save this screen
                    </button>
                    <span className="text-sm text-ink-600">
                      Anything left on &ldquo;Not filed&rdquo; stays where it is — it is still
                      listed under {selected.name}, it just has no chip.
                    </span>
                  </StickyActions>
                </form>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
