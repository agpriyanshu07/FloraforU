import "server-only";
import { db } from "./db";
import { offerPriceOf, type OfferTerms } from "./pricing";
import { Prisma } from "@/generated/prisma";

/**
 * The exact product shape every product card needs. Defined once with
 * Prisma.validator so the query and the component prop type can never drift.
 */
export const PRODUCT_CARD_SELECT = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  slug: true,
  name: true,
  code: true,
  spec: true,
  price: true,
  priceOnEnquiry: true,
  availability: true,
  isNew: true,
  newUntil: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  images: {
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
    // More than one so a card can page through a product's photos. Capped:
    // a listing of 24 cards should not carry every photo of every product.
    take: 5,
    select: { url: true, alt: true },
  },
});

export type ProductCardData = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_CARD_SELECT;
}>;

const OFFER_WITH_PRODUCTS = Prisma.validator<Prisma.OfferInclude>()({
  products: { include: { product: { select: PRODUCT_CARD_SELECT } } },
});

export type OfferWithProducts = Prisma.OfferGetPayload<{
  include: typeof OFFER_WITH_PRODUCTS;
}>;

/**
 * Every product in a campaign that is live right now, with the terms it is on
 * sale under. A Map rather than a Set because a card has to show the discount,
 * not just the fact that one exists — and `has()` still answers the old
 * question for callers that only need the badge.
 *
 * A product in two overlapping campaigns keeps the cheaper one: the shop has
 * advertised both prices, and quoting the higher of the two is the version a
 * customer would rightly argue with.
 */
export type ActiveOfferTerms = OfferTerms & {
  /** The campaign this price comes from, so a product page can name it. */
  title: string;
  slug: string;
  endsAt: Date;
};

export async function getActiveOfferTerms(): Promise<Map<string, ActiveOfferTerms>> {
  const now = new Date();
  const rows = await db.offerProduct.findMany({
    where: {
      offer: { published: true, startsAt: { lte: now }, endsAt: { gte: now } },
    },
    select: {
      productId: true,
      offerPrice: true,
      product: { select: { price: true, priceOnEnquiry: true } },
      offer: {
        select: { title: true, slug: true, endsAt: true, discountPercent: true },
      },
    },
  });

  const best = new Map<string, ActiveOfferTerms>();
  for (const row of rows) {
    const terms: ActiveOfferTerms = {
      offerPrice: row.offerPrice,
      discountPercent: row.offer.discountPercent,
      title: row.offer.title,
      slug: row.offer.slug,
      endsAt: row.offer.endsAt,
    };
    const existing = best.get(row.productId);
    if (!existing) {
      best.set(row.productId, terms);
      continue;
    }
    const contender = offerPriceOf(row.product.price, row.product.priceOnEnquiry, terms);
    const incumbent = offerPriceOf(row.product.price, row.product.priceOnEnquiry, existing);
    if (contender !== null && (incumbent === null || contender < incumbent)) {
      best.set(row.productId, terms);
    }
  }
  return best;
}

export async function getActiveOffers(): Promise<OfferWithProducts[]> {
  const now = new Date();
  return db.offer.findMany({
    where: { published: true, startsAt: { lte: now }, endsAt: { gte: now } },
    // Manual priority wins; ties fall back to soonest-ending, which is the
    // order this returned before priority existed.
    orderBy: [{ priority: "desc" }, { endsAt: "asc" }],
    include: OFFER_WITH_PRODUCTS,
  });
}

/**
 * How many real enquiries landed this week against the products in a given
 * offer. Deliberately a live count off the Enquiry table rather than a
 * decorative number — the site states real figures everywhere else, and an
 * invented one here would undercut the rest.
 *
 * Returns 0 when the offer has no products or no enquiries; callers hide the
 * line entirely rather than printing "0 people", which reads as a negative
 * signal rather than a neutral one.
 */
export async function getOfferEnquiryCount(offerId: string): Promise<number> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  return db.enquiry.count({
    where: {
      createdAt: { gte: weekAgo },
      product: { offers: { some: { offerId } } },
    },
  });
}

export async function getPastOffers() {
  const now = new Date();
  return db.offer.findMany({
    where: { published: true, endsAt: { lt: now } },
    orderBy: { endsAt: "desc" },
    select: { id: true, slug: true, title: true, description: true, endsAt: true },
  });
}

export async function getCategoriesWithCounts() {
  return db.category.findMany({
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { products: { where: { published: true } } } } },
  });
}

export async function getNewArrivals(limit = 8): Promise<ProductCardData[]> {
  const pinned = await db.product.findMany({
    where: { published: true, featured: true },
    orderBy: { featureOrder: "asc" },
    select: PRODUCT_CARD_SELECT,
    take: limit,
  });
  if (pinned.length >= limit) return pinned;

  const rest = await db.product.findMany({
    where: { published: true, id: { notIn: pinned.map((p) => p.id) } },
    orderBy: { createdAt: "desc" },
    select: PRODUCT_CARD_SELECT,
    take: limit - pinned.length,
  });
  return [...pinned, ...rest];
}

/**
 * The only condition under which a review is shown publicly. Both flags are
 * required: `status` drives moderation, and `visible` remains the admin's
 * manual hide switch for an already-approved review.
 */
export const PUBLIC_REVIEW_WHERE = {
  visible: true,
  status: "approved",
} as const;
