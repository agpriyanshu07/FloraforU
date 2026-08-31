import "server-only";
import { db } from "./db";
import { PRODUCT_CARD_SELECT, getActiveOfferProductIds } from "./queries";
import type { Prisma } from "@/generated/prisma";

export const PAGE_SIZE = 24;

export type CatalogueParams = {
  q?: string;
  category?: string;
  sort?: string;
  new?: string;
  offer?: string;
  page?: string;
};

const ORDER_BY: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }],
  "price-asc": [{ price: "asc" }, { name: "asc" }],
  "price-desc": [{ price: "desc" }, { name: "asc" }],
  "name-asc": [{ name: "asc" }],
  "name-desc": [{ name: "desc" }],
};

/** Shared query used by /catalogue and /categories/[slug]. */
export async function queryCatalogue(
  params: CatalogueParams,
  forcedCategorySlug?: string,
) {
  const offerIds = await getActiveOfferProductIds();
  const q = params.q?.trim();
  const categorySlug = forcedCategorySlug ?? params.category;
  const sort = params.sort && sort_valid(params.sort) ? params.sort : "newest";
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where: Prisma.ProductWhereInput = { published: true };

  if (categorySlug) where.category = { slug: categorySlug };

  if (q) {
    // SQLite `contains` is case-insensitive for ASCII, which is what the
    // catalogue's product names and codes are.
    where.OR = [
      { name: { contains: q } },
      { spec: { contains: q } },
      { code: { contains: q } },
      { description: { contains: q } },
      { category: { name: { contains: q } } },
    ];
  }

  if (params.new === "1") {
    where.OR = where.OR; // keep search OR intact; the New condition is an AND
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { OR: [{ newUntil: { gt: new Date() } }, { isNew: true, newUntil: null }] },
    ];
  }

  if (params.offer === "1") {
    where.id = { in: [...offerIds] };
  }

  // Price sorts must not scatter "Price on Enquiry" items through the middle of
  // the list — they have no price, so they always sort to the end.
  const orderBy =
    sort === "price-asc" || sort === "price-desc"
      ? [{ priceOnEnquiry: "asc" as const }, ...ORDER_BY[sort]]
      : ORDER_BY[sort];

  // Count first so an out-of-range ?page can be clamped. Without this, a stale
  // or hand-typed page number renders an empty grid under a "no products match
  // those filters" message — which blames the filters for a paging mistake and
  // leaves the visitor with no way back into the results.
  const total = await db.product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  const products = await db.product.findMany({
    where,
    orderBy,
    select: PRODUCT_CARD_SELECT,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return { products, total, page, pageCount, offerIds, sort };
}

function sort_valid(s: string) {
  return s in ORDER_BY;
}
