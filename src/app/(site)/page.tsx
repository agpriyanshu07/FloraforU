import Image from "next/image";
import Link from "next/link";
import ProductGrid from "@/components/ProductGrid";
import CategoryCard from "@/components/CategoryCard";
import ReviewCard from "@/components/ReviewCard";
import OfferStrip from "@/components/OfferStrip";
import InstagramFeed from "@/components/InstagramFeed";
import EmptyState from "@/components/EmptyState";
import { ArrowRightIcon, BoxIcon, HeartIcon, WhatsappIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { buildWhatsappUrl, withUtm } from "@/lib/whatsapp";
import {
  getActiveOfferProductIds,
  getActiveOffers,
  getCategoriesWithCounts,
  getNewArrivals,
  getOfferEnquiryCount,
  PUBLIC_REVIEW_WHERE,
} from "@/lib/queries";

// Cached, with admin edits pushing through immediately via revalidatePath.
// The short window is a backstop for offers starting or ending on their own.
export const revalidate = 300;

export default async function HomePage() {
  const [settings, categories, arrivals, offers, offerIds, reviews, gallery] =
    await Promise.all([
      getSettings(),
      getCategoriesWithCounts(),
      getNewArrivals(8),
      getActiveOffers(),
      getActiveOfferProductIds(),
      db.review.findMany({
        where: PUBLIC_REVIEW_WHERE,
        orderBy: { displayOrder: "asc" },
        take: 3,
      }),
      db.galleryItem.findMany({
        where: { visible: true, kind: "photo" },
        orderBy: { displayOrder: "asc" },
        take: 8,
      }),
    ]);

  const offerEnquiryCounts = await Promise.all(
    offers.map((offer) => getOfferEnquiryCount(offer.id)),
  );

  // Previously `offers[0]` — a second simultaneous campaign was silently
  // invisible here. Every active offer is passed through now, each with its
  // own real enquiry count.
  const stripOffers = offers.map((offer, i) => ({
    id: offer.id,
    slug: offer.slug,
    title: offer.title,
    description: offer.description,
    bannerUrl: offer.bannerUrl,
    discountLabel: offer.discountLabel,
    endsAt: offer.endsAt.toISOString(),
    endsAtLabel: offer.endsAt.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }),
    theme: offer.theme,
    urgentWithinHours: offer.urgentWithinHours,
    enquiriesThisWeek: offerEnquiryCounts[i],
    // Only used as fallback artwork when a campaign has no banner of its own.
    products: offer.products.slice(0, 1).map(({ product }) => ({
      slug: product.slug,
      name: product.name,
      imageUrl: product.images[0]?.url ?? null,
    })),
  }));
  const heroWa = withUtm(
    buildWhatsappUrl({ number: settings.whatsapp, template: settings.whatsappTemplate }),
    "website",
    "hero",
  );

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="border-b border-line bg-gradient-to-b from-rose-50 to-cream">
        <div className="shell grid items-center gap-8 py-12 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-rose-600">
              {settings.city} · Wholesale &amp; retail
            </p>
            <h1 className="mt-3 font-display text-[clamp(2.1rem,6vw,3.6rem)]">
              {settings.tagline}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-ink-600">
              Artificial flowers, backdrops, lights, lamps, pots and SFX machines —
              browse the full catalogue, then message us on WhatsApp to confirm
              stock, rates and delivery. No online payment, just a quick chat.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/catalogue" className="btn-primary">
                Explore catalogue
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <a
                href={heroWa}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp"
              >
                <WhatsappIcon className="h-4 w-4" />
                Chat on WhatsApp
              </a>
            </div>
            <dl className="mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
              {[
                ["Products", `${categories.reduce((n, c) => n + c._count.products, 0)}+`],
                ["Events served", settings.eventsCount],
                ["Instagram", settings.followerCount],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[13px] text-ink-600">{label}</dt>
                  <dd className="font-display text-2xl text-rose-600">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line lg:aspect-[5/4]">
            <Image
              src="/img/hero.svg"
              alt="FloralforU event décor — artificial flower arrangements, lamps and backdrops (placeholder artwork, awaiting real shop photography)"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 560px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Current offers */}
      {/* Every active campaign, not just the soonest-ending one. */}
      <OfferStrip offers={stripOffers} />

      {/* --------------------------------------------------- Shop by category */}
      <section aria-labelledby="categories-heading" className="shell py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="categories-heading" className="font-display text-3xl">
              Shop by category
            </h2>
            <p className="mt-1 text-ink-600">
              Everything we stock, sorted the way our customers actually ask for it.
            </p>
          </div>
          <Link href="/categories" className="btn-ghost btn-sm">
            View all {categories.length} categories
          </Link>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.slice(0, 8).map((c, i) => (
            <li key={c.id} className="flex">
              <CategoryCard
                slug={c.slug}
                name={c.name}
                description={c.description}
                imageUrl={c.imageUrl}
                count={c._count.products}
                priority={i < 4}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* -------------------------------------------------------- New arrivals */}
      <section aria-labelledby="arrivals-heading" className="shell pb-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="arrivals-heading" className="font-display text-3xl">
              New arrivals
            </h2>
            <p className="mt-1 text-ink-600">The latest additions to our shelves.</p>
          </div>
          <Link href="/catalogue?sort=newest" className="btn-ghost btn-sm">
            See the full catalogue
          </Link>
        </div>

        {arrivals.length > 0 ? (
          <ProductGrid products={arrivals} settings={settings} offerIds={offerIds} />
        ) : (
          <EmptyState
            title="No products yet"
            body="Products added in the admin portal will appear here automatically, newest first."
            actionLabel="Browse categories"
            actionHref="/categories"
            icon={<BoxIcon className="h-8 w-8" />}
          />
        )}
      </section>

      {/* ------------------------------------------------------------- Reviews */}
      <section aria-labelledby="reviews-heading" className="border-y border-line bg-rose-50 py-14">
        <div className="shell">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 id="reviews-heading" className="font-display text-3xl">
              What our customers say
            </h2>
            <Link href="/reviews" className="btn-ghost btn-sm">
              Read all reviews
            </Link>
          </div>

          {reviews.length > 0 ? (
            <ul className="grid gap-4 md:grid-cols-3">
              {reviews.map((r) => (
                <li key={r.id} className="flex">
                  <ReviewCard {...r} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Reviews coming soon"
              body="We're collecting written reviews from our Instagram DMs. Add yours by messaging us after your event."
              icon={<HeartIcon className="h-8 w-8" />}
            />
          )}
        </div>
      </section>

      {/* --------------------------------------------------------- See us work */}
      {/* Rendered only when there are photos: a heading and a "view all" button
          over an empty grid reads as a broken section, not an empty one. */}
      {gallery.length > 0 && (
        <section aria-labelledby="gallery-heading" className="shell py-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="gallery-heading" className="font-display text-3xl">
                See us in action
              </h2>
              <p className="mt-1 text-ink-600">
                Real setups and real dispatch — so you know exactly what turns up.
              </p>
            </div>
            <Link href="/gallery" className="btn-ghost btn-sm">
              Open the gallery
            </Link>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.map((g) => (
              <li key={g.id} className="card relative aspect-square overflow-hidden">
                <Image
                  src={g.imageUrl ?? "/img/hero.svg"}
                  alt={g.alt || g.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 280px"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ----------------------------------------------------------- Instagram */}
      <div className="border-t border-line">
        <InstagramFeed instagramUrl={settings.instagram} handle="@floralforu_" />
      </div>
    </>
  );
}
