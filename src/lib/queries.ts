import "server-only";
import { db } from "./db";
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

/** IDs of every product attached to an offer that is live right now. */
export async function getActiveOfferProductIds(): Promise<Set<string>> {
  const now = new Date();
  const rows = await db.offerProduct.findMany({
    where: {
      offer: { published: true, startsAt: { lte: now }, endsAt: { gte: now } },
    },
    select: { productId: true },
  });
  return new Set(rows.map((r) => r.productId));
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
