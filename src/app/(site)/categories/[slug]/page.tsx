import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import CatalogueControls from "@/components/CatalogueControls";
import ProductGrid from "@/components/ProductGrid";
import SubcategoryFilter from "@/components/SubcategoryFilter";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { SearchIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { queryCatalogue, type CatalogueParams } from "@/lib/catalogue";
import { getSubcategoryChips } from "@/lib/subcategory-chips";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import { DownloadIcon } from "@/components/icons";

// Stays dynamic: the filter, sort and pagination searchParams make every
// request a different page, so there is nothing stable to cache.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: category.description,
    openGraph: { title: category.name, description: category.description },
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CatalogueParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await db.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const [settings, categories, { chips, total: publishedInCategory }, result] =
    await Promise.all([
      getSettings(),
      db.category.findMany({
        orderBy: { displayOrder: "asc" },
        select: { slug: true, name: true },
      }),
      getSubcategoryChips(slug),
      queryCatalogue(sp, slug),
    ]);

  // Only a chip that is really on screen counts as the active filter: an
  // unknown ?sub= already shows the whole category, and the download has to
  // agree with what the page is showing rather than 404 on its own link.
  const activeChip = sp.sub ? chips.find((c) => c.slug === sp.sub) : undefined;

  return (
    <div className="shell py-10">
      <BreadcrumbJsonLd
        siteUrl={settings.siteUrl}
        trail={[
          { name: "Home", path: "/" },
          { name: "Categories", path: "/categories" },
          { name: category.name, path: `/categories/${category.slug}` },
        ]}
      />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ink-600">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-rose-700">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/categories" className="hover:text-rose-700">
              Categories
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-medium text-ink-900">{category.name}</li>
        </ol>
      </nav>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)]">
            {category.name}
          </h1>
          <p className="mt-2 text-ink-600">{category.description}</p>
        </div>
        {/* Most enquiries are about one kind of thing — a backdrop, a set of
            lamps. Sending the whole 97-product catalogue to answer that is a
            lot for the customer to scroll on a phone, so each category can be
            sent on its own.

            The button follows the filter chips too. Someone who has narrowed
            to Dry Fruit Box (4 Jar) and then downloads expects those, not all
            183 gift boxes — a download that silently ignores the filter on
            screen is the kind of thing nobody reports, they just stop using
            it. The label says which, so it is obvious before the tap. */}
        <a
          href={
            activeChip
              ? `/api/catalogue-pdf?category=${category.slug}&sub=${activeChip.slug}`
              : `/api/catalogue-pdf?category=${category.slug}`
          }
          className="btn-ghost shrink-0"
        >
          <DownloadIcon className="h-4 w-4 shrink-0" />
          {activeChip ? `Download ${activeChip.name}` : "Download this category"}
        </a>
      </header>

      <Suspense fallback={<div className="card mb-6 h-40 animate-pulse" />}>
        <CatalogueControls
          categories={categories}
          basePath={`/categories/${slug}`}
          lockedCategory={slug}
        />
      </Suspense>

      <SubcategoryFilter
        basePath={`/categories/${slug}`}
        subcategories={chips}
        active={sp.sub}
        totalCount={publishedInCategory}
        carry={sp as Record<string, string | undefined>}
      />

      {/* A `sub` that matches no chip is not a dead end to paper over: it is
          what a link already sent on WhatsApp becomes the moment the shop
          renames or deletes that subcategory. Saying "0 products in this
          category" there is simply false — the category has 183 — so the
          filtered case says it is the filter, and the empty state below
          offers the way out. */}
      <p className="mb-4 text-sm text-ink-600" aria-live="polite">
        {result.total} {result.total === 1 ? "product" : "products"}
        {!sp.sub
          ? " in this category"
          : chips.some((c) => c.slug === sp.sub)
            ? ` in ${chips.find((c) => c.slug === sp.sub)!.name}`
            : " match that filter"}
      </p>

      {result.products.length > 0 ? (
        <>
          <ProductGrid
            products={result.products}
            settings={settings}
            offerTerms={result.offerTerms}
            priorityCount={4}
            heading="Products in this category"
          />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            basePath={`/categories/${slug}`}
            params={sp as Record<string, string | undefined>}
          />
        </>
      ) : (
        <EmptyState
          title="Nothing here yet"
          body={`We haven't listed anything under ${category.name} that matches your filters. Clear them to see the whole category, or message us — we may have it in the shop even if it isn't online yet.`}
          actionLabel="Clear filters"
          actionHref={`/categories/${slug}`}
          icon={<SearchIcon className="h-8 w-8" />}
        />
      )}
    </div>
  );
}
