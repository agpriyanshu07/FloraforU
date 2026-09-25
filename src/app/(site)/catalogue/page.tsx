import type { Metadata } from "next";
import { Suspense } from "react";
import CatalogueControls from "@/components/CatalogueControls";
import ProductGrid from "@/components/ProductGrid";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { DownloadIcon, SearchIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { queryCatalogue, type CatalogueParams } from "@/lib/catalogue";

// Stays dynamic: the filter, sort and pagination searchParams make every
// request a different page, so there is nothing stable to cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalogue",
  description:
    "Search and filter the full FloralforU catalogue — artificial flowers, backdrops, lights, lamps, pots, SFX machines, packing material and more. Enquire on WhatsApp.",
  // Every search, sort, category filter and page of this grid is the same
  // inventory rearranged, and the grid links to a lot of those combinations.
  // They all point here so the permutations do not compete with each other in
  // search results. Nothing is lost by collapsing them: the sitemap lists every
  // product individually, so each one is still discovered on its own URL.
  alternates: { canonical: "/catalogue" },
};

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<CatalogueParams>;
}) {
  const params = await searchParams;
  const [settings, categories, result] = await Promise.all([
    getSettings(),
    db.category.findMany({
      orderBy: { displayOrder: "asc" },
      select: { slug: true, name: true },
    }),
    queryCatalogue(params),
  ]);

  const activeCategory = params.category
    ? (categories.find((c) => c.slug === params.category) ?? null)
    : null;

  return (
    <div className="shell py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)]">Catalogue</h1>
          <p className="mt-1 max-w-2xl text-ink-600">
            Everything we stock, in one searchable list. Prices are indicative —
            message us on WhatsApp for bulk rates and current availability.
          </p>
        </div>
        {/* Filtered to one category? Then the PDF follows the filter, because
            that is almost always what the shopper wants to be sent — the whole
            97-product list is a lot to scroll on a phone. */}
        <a
          href={
            activeCategory
              ? `/api/catalogue-pdf?category=${activeCategory.slug}`
              : "/api/catalogue-pdf"
          }
          className="btn-ghost shrink-0"
        >
          <DownloadIcon className="h-4 w-4 shrink-0" />
          {activeCategory ? `Download ${activeCategory.name} PDF` : "Download catalogue PDF"}
        </a>
      </header>

      <Suspense fallback={<div className="card mb-6 h-40 animate-pulse" />}>
        <CatalogueControls categories={categories} />
      </Suspense>

      <p className="mb-4 text-sm text-ink-600" aria-live="polite">
        {result.total} {result.total === 1 ? "product" : "products"}
        {result.total > 0 && ` · page ${result.page} of ${result.pageCount}`}
      </p>

      {result.products.length > 0 ? (
        <>
          <ProductGrid
            products={result.products}
            settings={settings}
            offerTerms={result.offerTerms}
            priorityCount={4}
            heading="All products"
          />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            basePath="/catalogue"
            params={params as Record<string, string | undefined>}
          />
        </>
      ) : (
        <EmptyState
          title="No products match those filters"
          body="Try a shorter search term, pick a different category, or clear the quick filters. If you're after something specific, just ask us on WhatsApp — we stock more than we can list."
          actionLabel="Clear filters and start again"
          actionHref="/catalogue"
          icon={<SearchIcon className="h-8 w-8" />}
        />
      )}
    </div>
  );
}
