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
    take: 1,
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
    orderBy: { endsAt: "asc" },
    include: OFFER_WITH_PRODUCTS,
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
