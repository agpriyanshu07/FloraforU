import "dotenv/config";
import { execFileSync } from "node:child_process";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma";
import { CATEGORIES, PRODUCTS } from "./catalogue-data";

const db = new PrismaClient();

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "item"
  );
}

async function main() {
  console.log("Regenerating placeholder artwork…");
  execFileSync(
    process.execPath,
    ["scripts/generate-placeholder-art.mjs", JSON.stringify(CATEGORIES)],
    { stdio: "inherit" },
  );

  console.log("Clearing existing data…");
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
  const email = process.env.SEED_ADMIN_EMAIL ?? "owner@floralforu.in";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "floralforu123";
  await db.adminUser.create({
    data: {
      email,
      name: "FloralforU Owner",
      role: "owner",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  console.log(`Admin user: ${email} / ${password}`);

  // --- Categories -----------------------------------------------------------
  const categoryIds = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await db.category.create({
      data: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        imageUrl: `/img/categories/${c.slug}.svg`,
        displayOrder: i,
      },
    });
    categoryIds.set(c.slug, row.id);
  }

  // --- Products -------------------------------------------------------------
  // Spread createdAt over the last 120 days so "Newest first" sorting and the
  // "New Arrivals" homepage block have something real to work with.
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const usedSlugs = new Set<string>();

  for (const [i, p] of PRODUCTS.entries()) {
    let slug = slugify(p.name);
    if (usedSlugs.has(slug)) slug = `${slug}-${p.code}`;
    usedSlugs.add(slug);

    // Deterministically shuffle "added" dates across the last ~4 months so
    // New Arrivals and the Newest-first sort show a realistic category mix
    // rather than whatever order this file happens to list items in.
    const jitter = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    const createdAt = new Date(now - Math.round(jitter * 118 + 1) * day);
    const categoryId = categoryIds.get(p.category)!;
    const categoryMeta = CATEGORIES.find((c) => c.slug === p.category)!;

    await db.product.create({
      data: {
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
        categoryId,
        createdAt,
        images: {
          create: [
            {
              url: `/img/categories/${p.category}.svg`,
              alt: `${p.name} — ${categoryMeta.name} from FloralforU (placeholder image, awaiting real product photo)`,
              position: 0,
              isPrimary: true,
            },
          ],
        },
      },
    });
  }
  console.log(`Seeded ${PRODUCTS.length} products across ${CATEGORIES.length} categories.`);

  // --- Offers: one active, one expired (per the Definition of Done) ---------
  const activeProducts = await db.product.findMany({
    where: { category: { slug: { in: ["festive-puja-items", "lamps-diyas", "artificial-flowers-greenery"] } } },
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
  // NOTE: these are PLACEHOLDER testimonials written from the brief, not real
  // customer quotes. They must be replaced with the client's real Instagram
  // DM / in-person reviews before launch. See README "Open items".
  const reviews = [
    { customerName: "Ritu S.", eventType: "Wedding — Dhanbad", quote: "Took the full haldi set-up from FloralforU. The marigold lardi and mirror umbrellas arrived a day early and everything matched the photos they sent on WhatsApp.", rating: 5, source: "Instagram DM" },
    { customerName: "Amit K.", eventType: "Event planner", quote: "I order packing material in bulk every month. Rates are fair and they actually pick up the phone, which is more than I can say for most suppliers.", rating: 5, source: "In person" },
    { customerName: "Sneha P.", eventType: "Engagement", quote: "The ring platter and varmala trays were beautiful. They understood exactly what I wanted from one voice note.", rating: 5, source: "Instagram DM" },
    { customerName: "Mohd. Faizan", eventType: "Mehndi function", quote: "Hired the fog machine and cold pyro. Delivered, demoed and collected the next morning without any fuss.", rating: 4, source: "WhatsApp" },
    { customerName: "Priya R.", eventType: "Diwali shop display", quote: "Bought lamps and LED diyas for our showroom. Packing was solid — nothing broken in transit.", rating: 5, source: "Instagram comment" },
    { customerName: "Vikash Gupta", eventType: "Corporate event", quote: "Needed 40 metres of carpet at short notice. They arranged it the same day.", rating: 5, source: "In person" },
  ];
  for (const [i, r] of reviews.entries()) {
    await db.review.create({ data: { ...r, displayOrder: i, visible: true } });
  }

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
  for (const [i, g] of gallery.entries()) {
    await db.galleryItem.create({
      data: {
        kind: "photo",
        title: g.title,
        tag: g.tag,
        imageUrl: `/img/gallery/g${i + 1}.svg`,
        alt: `${g.title} — FloralforU (placeholder image, awaiting real photo)`,
        displayOrder: i,
        visible: true,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
