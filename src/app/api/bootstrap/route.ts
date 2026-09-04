/**
 * ONE-TIME production bootstrap. Seeds an empty database over HTTP because the
 * seed script can't be run against Neon from every environment.
 *
 * TEMPORARY — delete this route (and the BOOTSTRAP_SECRET env var) once the
 * production database has been seeded. It is gated three ways: the secret must
 * be set, it must match, and it refuses to touch a database that already has
 * data unless explicitly forced.
 *
 *   /api/bootstrap?key=<BOOTSTRAP_SECRET>
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { CATEGORIES, PRODUCTS } from "../../../../prisma/catalogue-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Row-by-row inserts would time out against a remote database, so the bulk of
// the seed goes through createMany — but give it headroom regardless.
export const maxDuration = 60;

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "item"
  );
}

export async function GET(request: Request) {
  const secret = process.env.BOOTSTRAP_SECRET;
  // Not configured: behave as if the route doesn't exist.
  if (!secret) return new NextResponse("Not found", { status: 404 });

  const url = new URL(request.url);
  if (url.searchParams.get("key") !== secret) {
    return new NextResponse("Not found", { status: 404 });
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 10) {
    return NextResponse.json(
      { error: "Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 10 characters." },
      { status: 400 },
    );
  }

  const force = url.searchParams.get("force") === "1";
  const existing = await db.product.count();
  if (existing > 0 && !force) {
    return NextResponse.json(
      { error: `Database already has ${existing} products. Add &force=1 to wipe and re-seed.` },
      { status: 409 },
    );
  }

  // --- Wipe -----------------------------------------------------------------
  await db.enquiry.deleteMany();
  await db.offerProduct.deleteMany();
  await db.offer.deleteMany();
  await db.productImage.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.review.deleteMany();
  await db.galleryItem.deleteMany();
  await db.adminUser.deleteMany();

  // --- Admin user -----------------------------------------------------------
  await db.adminUser.create({
    data: {
      email,
      name: "FloralforU Owner",
      role: "owner",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  // --- Categories -----------------------------------------------------------
  // Ids are assigned here rather than by @default(cuid()) so products and
  // images can be inserted in bulk without reading the rows back first.
  const categoryIds = new Map(CATEGORIES.map((c) => [c.slug, randomUUID()]));
  await db.category.createMany({
    data: CATEGORIES.map((c, i) => ({
      id: categoryIds.get(c.slug)!,
      slug: c.slug,
      name: c.name,
      description: c.description,
      imageUrl: `/img/categories/${c.slug}.svg`,
      displayOrder: i,
    })),
  });

  // --- Products -------------------------------------------------------------
  // Same deterministic date spread as prisma/seed.ts so "New Arrivals" and the
  // newest-first sort have a realistic category mix to work with.
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const usedSlugs = new Set<string>();
  const productRows = [];
  const imageRows = [];

  for (const [i, p] of PRODUCTS.entries()) {
    let slug = slugify(p.name);
    if (usedSlugs.has(slug)) slug = `${slug}-${p.code}`;
    usedSlugs.add(slug);

    const jitter = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    const createdAt = new Date(now - Math.round(jitter * 118 + 1) * day);
    const categoryMeta = CATEGORIES.find((c) => c.slug === p.category)!;
    const id = randomUUID();

    productRows.push({
      id,
      slug,
      name: p.name,
      code: p.code,
      spec: p.spec,
      description:
        p.description ??
        `${p.name} from our ${categoryMeta.name.toLowerCase()} range. ${p.spec}. Message us on WhatsApp for current stock, bulk rates and delivery to your venue.`,
      price: p.poa ? null : p.price,
      priceOnEnquiry: Boolean(p.poa),
      availability: p.availability ?? "in_stock",
      published: true,
      isNew: Boolean(p.isNew),
      newUntil: p.isNew ? new Date(now + 21 * day) : null,
      categoryId: categoryIds.get(p.category)!,
      createdAt,
      updatedAt: createdAt,
    });

    imageRows.push({
      productId: id,
      url: `/img/categories/${p.category}.svg`,
      alt: `${p.name} — ${categoryMeta.name} from FloralforU (placeholder image, awaiting real product photo)`,
      position: 0,
      isPrimary: true,
    });
  }

  await db.product.createMany({ data: productRows });
  await db.productImage.createMany({ data: imageRows });

  // --- Offers: one active, one expired --------------------------------------
  const activeProducts = await db.product.findMany({
    where: {
      category: { slug: { in: ["festive-puja-items", "lamps-diyas", "artificial-flowers-greenery"] } },
    },
    take: 10,
  });
  const expiredProducts = await db.product.findMany({
    where: { category: { slug: { in: ["carpets-flooring", "cooler-fan"] } } },
    take: 6,
  });

  await db.offer.create({
    data: {
      slug: "ganesh-puja-sale",
      title: "Ganesh Puja Sale",
      description:
        "Festive lamps, torans, marigold lardi and puja essentials at our best rates of the season. Enquire on WhatsApp and mention this offer.",
      bannerUrl: "/img/offers/ganesh-puja-sale.svg",
      startsAt: new Date(now - 3 * day),
      endsAt: new Date(now + 15 * day),
      published: true,
      products: { create: activeProducts.map((p) => ({ productId: p.id })) },
    },
  });

  await db.offer.create({
    data: {
      slug: "monsoon-clearance",
      title: "Monsoon Clearance",
      description:
        "Tirpal, shade net and cooling equipment cleared at monsoon rates. This campaign has ended — message us for current pricing.",
      bannerUrl: "/img/offers/monsoon-clearance.svg",
      startsAt: new Date(now - 60 * day),
      endsAt: new Date(now - 20 * day),
      published: true,
      products: { create: expiredProducts.map((p) => ({ productId: p.id })) },
    },
  });

  // --- Reviews --------------------------------------------------------------
  // PLACEHOLDER testimonials written from the brief, not real customer quotes.
  // Replace with the client's real reviews before launch.
  const reviews = [
    { customerName: "Ritu S.", eventType: "Wedding — Dhanbad", quote: "Took the full haldi set-up from FloralforU. The marigold lardi and mirror umbrellas arrived a day early and everything matched the photos they sent on WhatsApp.", rating: 5, source: "Instagram DM" },
    { customerName: "Amit K.", eventType: "Event planner", quote: "I order packing material in bulk every month. Rates are fair and they actually pick up the phone, which is more than I can say for most suppliers.", rating: 5, source: "In person" },
    { customerName: "Sneha P.", eventType: "Engagement", quote: "The ring platter and varmala trays were beautiful. They understood exactly what I wanted from one voice note.", rating: 5, source: "Instagram DM" },
    { customerName: "Mohd. Faizan", eventType: "Mehndi function", quote: "Hired the fog machine and cold pyro. Delivered, demoed and collected the next morning without any fuss.", rating: 4, source: "WhatsApp" },
    { customerName: "Priya R.", eventType: "Diwali shop display", quote: "Bought lamps and LED diyas for our showroom. Packing was solid — nothing broken in transit.", rating: 5, source: "Instagram comment" },
    { customerName: "Vikash Gupta", eventType: "Corporate event", quote: "Needed 40 metres of carpet at short notice. They arranged it the same day.", rating: 5, source: "In person" },
  ];
  await db.review.createMany({
    data: reviews.map((r, i) => ({ ...r, displayOrder: i, visible: true })),
  });

  // --- Gallery --------------------------------------------------------------
  const gallery = [
    { title: "Wedding stage — floral backdrop", tag: "event" },
    { title: "Haldi setup with mirror umbrellas", tag: "event" },
    { title: "Mandap entrance with marigold lardi", tag: "event" },
    { title: "Reception photo corner", tag: "event" },
    { title: "Diwali showroom display", tag: "event" },
    { title: "Bulk order packed for dispatch", tag: "dispatch" },
    { title: "SFX machines checked before dispatch", tag: "dispatch" },
    { title: "Cartons labelled and ready to ship", tag: "dispatch" },
    { title: "Our shop counter at Bank More", tag: "shop" },
  ];
  await db.galleryItem.createMany({
    data: gallery.map((g, i) => ({
      kind: "photo",
      title: g.title,
      tag: g.tag,
      imageUrl: `/img/gallery/g${i + 1}.svg`,
      alt: `${g.title} — FloralforU (placeholder image, awaiting real photo)`,
      displayOrder: i,
      visible: true,
    })),
  });

  return NextResponse.json({
    ok: true,
    categories: CATEGORIES.length,
    products: PRODUCTS.length,
    reviews: reviews.length,
    gallery: gallery.length,
    admin: email,
    next: "Delete this route and the BOOTSTRAP_SECRET env var now that seeding is done.",
  });
}
