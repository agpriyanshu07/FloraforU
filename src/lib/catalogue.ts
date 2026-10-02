import "server-only";
import { db } from "./db";
import { PRODUCT_CARD_SELECT, getActiveOfferTerms } from "./queries";
import { withPhotoFallbacks } from "./photo-fallback";
import type { Prisma } from "@/generated/prisma";

export const PAGE_SIZE = 24;

export type CatalogueParams = {
  q?: string;
  category?: string;
  /** Subcategory slug, unique only within its category. */
  sub?: string;
  sort?: string;
  new?: string;
  offer?: string;
  limited?: string;
  page?: string;
};

// A-Z and Z-A were dropped: nobody shops décor alphabetically, and any link
// still carrying `sort=name-asc` falls through to the default below rather than
// erroring, so old bookmarks and shared URLs keep working.
// Every sort ends on id, which makes it a TOTAL order. Without that last key
// the order of tied rows is whatever Postgres finds convenient, and it is not
// obliged to pick the same one twice: two seeded products share a createdAt to
// the millisecond, and real stock imported in one batch shares a price. That
// is not just untidy — this query is paginated, so an unstable order means a
// product can appear on page 1 and again on page 2 while another is never
// shown at all.
const ORDER_BY: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }, { id: "asc" }],
  "price-asc": [{ price: "asc" }, { name: "asc" }, { id: "asc" }],
  "price-desc": [{ price: "desc" }, { name: "asc" }, { id: "asc" }],
};

/** Shared query used by /catalogue and /categories/[slug]. */
export async function queryCatalogue(
  params: CatalogueParams,
  forcedCategorySlug?: string,
) {
  const offerTerms = await getActiveOfferTerms();
  const q = params.q?.trim();
  const categorySlug = forcedCategorySlug ?? params.category;
  const sort = params.sort && sort_valid(params.sort) ? params.sort : "newest";
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where: Prisma.ProductWhereInput = { published: true };

  if (categorySlug) where.category = { slug: categorySlug };

  // Scoped to the category, because a subcategory slug is only unique inside
  // one: "hanging" exists under both Lights and Artificial Flowers, and
  // matching on the slug alone would mix the two lists together. On /catalogue
  // with no category chosen there is nothing to scope to, so the parameter is
  // ignored rather than guessed at.
  if (categorySlug && params.sub) {
    where.subcategory = { slug: params.sub, category: { slug: categorySlug } };
  }

  if (q) {
    // `mode: "insensitive"` is required, not cosmetic: PostgreSQL's `contains`
    // is case-SENSITIVE, so without it a shopper typing "fog" would get no
    // results while "Fog" worked. (SQLite's is insensitive, which is why this
    // only shows up once the site runs on a hosted database.)
    const like = (value: string) => ({ contains: value, mode: "insensitive" as const });
    where.OR = [
      { name: like(q) },
      { spec: like(q) },
      { code: like(q) },
      { description: like(q) },
      { category: { name: like(q) } },
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
    where.id = { in: [...offerTerms.keys()] };
  }

  if (params.limited === "1") {
    where.availability = "limited";
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

  return { products: withPhotoFallbacks(products), total, page, pageCount, offerTerms, sort };
}

function sort_valid(s: string) {
  return s in ORDER_BY;
}
