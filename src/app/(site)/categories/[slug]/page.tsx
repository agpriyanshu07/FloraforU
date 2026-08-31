import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import CatalogueControls from "@/components/CatalogueControls";
import ProductGrid from "@/components/ProductGrid";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { SearchIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { queryCatalogue, type CatalogueParams } from "@/lib/catalogue";

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

  const [settings, categories, result] = await Promise.all([
    getSettings(),
    db.category.findMany({
      orderBy: { displayOrder: "asc" },
      select: { slug: true, name: true },
    }),
    queryCatalogue(sp, slug),
  ]);

  return (
    <div className="shell py-10">
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

      <header className="mb-6 max-w-3xl">
        <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)]">
          {category.name}
        </h1>
        <p className="mt-2 text-ink-600">{category.description}</p>
      </header>

      <Suspense fallback={<div className="card mb-6 h-40 animate-pulse" />}>
        <CatalogueControls
          categories={categories}
          basePath={`/categories/${slug}`}
          lockedCategory={slug}
        />
      </Suspense>

      <p className="mb-4 text-sm text-ink-600" aria-live="polite">
        {result.total} {result.total === 1 ? "product" : "products"} in this category
      </p>

      {result.products.length > 0 ? (
        <>
          <ProductGrid
            products={result.products}
            settings={settings}
            offerIds={result.offerIds}
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
