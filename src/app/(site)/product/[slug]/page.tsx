import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGallery from "@/components/ProductGallery";
import ProductGrid from "@/components/ProductGrid";
import EnquireButton from "@/components/EnquireButton";
import ShareToStory from "@/components/ShareToStory";
import WishlistButton from "@/components/WishlistButton";
import StickyEnquireBar from "@/components/StickyEnquireBar";
import ReviewCard from "@/components/ReviewCard";
import ReviewForm from "@/components/ReviewForm";
import Price from "@/components/Price";
import Countdown from "@/components/Countdown";
import { AvailabilityTag, CategoryTag, NewBadge, OfferBadge } from "@/components/Badges";
import { InstagramIcon, PhoneIcon, StarIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { buildWhatsappUrl, instagramDmUrl, withUtm } from "@/lib/whatsapp";
import { formatPrice, isProductNew, AVAILABILITY_LABELS } from "@/lib/format";
import { enquiryPriceNote, offerPriceOf, pricingFor } from "@/lib/pricing";
import { PRODUCT_CARD_SELECT, PUBLIC_REVIEW_WHERE, getActiveOfferTerms } from "@/lib/queries";
import { serialiseJsonLd } from "@/lib/json-ld";

// Cached; admin writes revalidate this path explicitly, so the window is a backstop.
export const revalidate = 3600;

// Prerenders every published product at build time. Without this the route
// falls back to rendering on demand and the cache never applies — and these are
// the pages customers are sent directly from WhatsApp, so they matter most.
// A product added later still works: dynamicParams renders it on first request.
export async function generateStaticParams() {
  const products = await db.product.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return products.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: { category: true, images: { take: 1, orderBy: { position: "asc" } } },
  });
  if (!product) return { title: "Product not found" };

  const description = `${product.name} — ${product.spec}. ${formatPrice(
    product.price,
    product.priceOnEnquiry,
  )}. Enquire on WhatsApp with FloralforU, ${product.category.name} in Dhanbad.`;

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      type: "article",
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
    alternates: { canonical: `/product/${product.slug}` },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: true,
      images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
    },
  });
  if (!product || !product.published) notFound();

  const [settings, offerTerms, related, reviews] = await Promise.all([
    getSettings(),
    getActiveOfferTerms(),
    db.product.findMany({
      where: {
        published: true,
        categoryId: product.categoryId,
        NOT: { id: product.id },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: PRODUCT_CARD_SELECT,
    }),
    // Product pages showed no reviews at all before this — a review could not
    // even be attached to a product.
    db.review.findMany({
      where: { ...PUBLIC_REVIEW_WHERE, productId: product.id },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  const offer = offerTerms.get(product.id);
  const onOffer = Boolean(offer);
  const pricing = pricingFor(product.price, product.priceOnEnquiry, offer);
  // What the customer actually pays today. The sticky bar, the share image and
  // the WhatsApp message all quote this, so none of them can advertise the
  // pre-sale price after the card has already shown the discount.
  const priceLabel = pricing.currentLabel;

  const ratingCount = reviews.length;
  const averageRating =
    ratingCount > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount) * 10) / 10
      : null;
  const productUrl = `${settings.siteUrl}/product/${product.slug}`;
  const waHref = withUtm(
    buildWhatsappUrl({
      number: settings.whatsapp,
      template: settings.whatsappTemplate,
      productName: product.name,
      productCode: product.code,
      productUrl,
      note: enquiryPriceNote(pricing) ?? undefined,
    }),
    "website",
    "product-page",
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.code ?? undefined,
    description: product.description,
    category: product.category.name,
    image: product.images.map((i) => `${settings.siteUrl}${i.url}`),
    brand: { "@type": "Brand", name: settings.businessName },
    // Priced products carry an offer so search results can show the rate the
    // page shows — including the sale price while a campaign is running. Items
    // on enquiry are left without one rather than published at a made-up price.
    ...(product.priceOnEnquiry || product.price === null
      ? {}
      : {
          offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: offerPriceOf(product.price, product.priceOnEnquiry, offer) ?? product.price,
            availability:
              product.availability === "in_stock"
                ? "https://schema.org/InStock"
                : product.availability === "limited"
                  ? "https://schema.org/LimitedAvailability"
                  : "https://schema.org/PreOrder",
            url: productUrl,
            seller: { "@type": "Organization", name: settings.businessName },
          },
        }),
    ...(averageRating !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating,
            reviewCount: ratingCount,
          },
        }
      : {}),
  };

  return (
    <div className="shell py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serialiseJsonLd(jsonLd) }}
      />

      <StickyEnquireBar
        watchId="product-actions"
        productId={product.id}
        productName={product.name}
        productSlug={product.slug}
        priceLabel={priceLabel}
        waHref={waHref}
      />

      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-ink-600">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/catalogue" className="hover:text-rose-700">
              Catalogue
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/categories/${product.category.slug}`} className="hover:text-rose-700">
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-medium text-ink-900">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <CategoryTag>{product.category.name}</CategoryTag>
            {isProductNew(product) && <NewBadge />}
            {onOffer && <OfferBadge />}
            <AvailabilityTag availability={product.availability} />
          </div>

          <h1 className="font-display text-[clamp(1.9rem,4.5vw,2.6rem)]">
            {product.name}
          </h1>

          {/* Real ratings from this product's own approved reviews, linked to
              them. No stars at all when nobody has reviewed it — an empty
              five-star rail reads as a rating of zero. */}
          {averageRating !== null && (
            <a
              href="#reviews-heading"
              className="mt-2 inline-flex items-center gap-2 text-sm text-ink-600 hover:text-rose-700"
            >
              <span aria-hidden className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <StarIcon key={n} filled={n <= Math.round(averageRating)} />
                ))}
              </span>
              <span>
                {averageRating.toFixed(1)} from {ratingCount}{" "}
                {ratingCount === 1 ? "review" : "reviews"}
              </span>
            </a>
          )}

          <div className="mt-5">
            <Price
              price={product.price}
              priceOnEnquiry={product.priceOnEnquiry}
              terms={offer}
              size="page"
            />
            {!product.priceOnEnquiry && (
              <p className="mt-1 text-[13px] text-ink-600">
                Indicative rate. Bulk and event pricing confirmed on WhatsApp.
              </p>
            )}
          </div>

          {/* Which sale this price comes from, and how long it lasts. A struck
              price with no campaign behind it is the pattern shoppers have
              learnt to distrust. */}
          {offer && pricing.percentOff !== null && (
            <p className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-marigold-100 bg-marigold-50 px-3 py-2 text-sm">
              <Link
                href={`/offers#${offer.slug}`}
                className="font-semibold text-marigold-700 hover:underline"
              >
                {offer.title}
              </Link>
              <Countdown
                endsAt={offer.endsAt.toISOString()}
                fallback={`Ends ${offer.endsAt.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}`}
                chipClass="bg-marigold-100 text-marigold-700"
              />
            </p>
          )}

          <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
            <div className="flex gap-4 py-3">
              <dt className="w-32 shrink-0 font-semibold">Pack / size</dt>
              <dd className="text-ink-600">{product.spec || "Ask us"}</dd>
            </div>
            {product.code && (
              // Moved out from under the heading: it is a spec, and this is
              // the number customers read out on WhatsApp to order.
              <div className="flex gap-4 py-3">
                <dt className="w-32 shrink-0 font-semibold">Product code</dt>
                <dd className="font-mono text-ink-600">{product.code}</dd>
              </div>
            )}
            <div className="flex gap-4 py-3">
              <dt className="w-32 shrink-0 font-semibold">Availability</dt>
              <dd className="text-ink-600">
                {AVAILABILITY_LABELS[product.availability] ?? product.availability}
              </dd>
            </div>
            <div className="flex gap-4 py-3">
              <dt className="w-32 shrink-0 font-semibold">Category</dt>
              <dd>
                <Link
                  href={`/categories/${product.category.slug}`}
                  className="text-rose-600 hover:text-rose-700"
                >
                  {product.category.name}
                </Link>
              </dd>
            </div>
            <div className="flex gap-4 py-3">
              <dt className="w-32 shrink-0 font-semibold">Delivery</dt>
              <dd className="text-ink-600">
                Collect from the shop in {settings.city}, or ask us about delivery to
                your venue when you enquire.
              </dd>
            </div>
          </dl>

          {product.description && (
            <div className="mt-6">
              <h2 className="font-display text-xl">About this item</h2>
              <p className="mt-2 leading-relaxed text-ink-600">{product.description}</p>
            </div>
          )}

          {/* id is watched by the sticky bar, which shows itself only once
              this row has scrolled out of view. */}
          <div id="product-actions" className="mt-7 flex flex-wrap gap-3">
            <EnquireButton
              href={waHref}
              productId={product.id}
              label="Enquire on WhatsApp"
              ariaLabel={`Enquire about ${product.name} on WhatsApp`}
              className="btn-primary"
            />
            <EnquireButton
              href={`tel:${settings.phone.replace(/\s/g, "")}`}
              productId={product.id}
              channel="call"
              label="Call the shop"
              className="btn-ghost"
            />
            <a
              href={withUtm(instagramDmUrl(settings.instagram), "website", "product-dm")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-instagram"
            >
              <InstagramIcon className="h-4 w-4" />
              DM on Instagram
            </a>
            <WishlistButton
              slug={product.slug}
              productName={product.name}
              variant="button"
            />
          </div>

          <div className="mt-4">
            <ShareToStory
              productName={product.name}
              spec={product.spec}
              price={priceLabel}
              imageUrl={product.images[0]?.url}
              handle="@floralforu_"
            />
          </div>

          <p className="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-[13px] text-ink-600">
            <PhoneIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>
              We don&apos;t take online payments. Send us a message, we&apos;ll confirm
              stock and rate, and you pay at the shop or on delivery.
            </span>
          </p>
        </div>
      </div>

      <section aria-labelledby="reviews-heading" className="mt-16">
        <h2 id="reviews-heading" className="mb-5 font-display text-2xl">
          {reviews.length > 0
            ? `What customers say about ${product.name}`
            : `Ordered ${product.name} before?`}
        </h2>

        {reviews.length > 0 && (
          <ul className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.id} className="flex">
                <ReviewCard {...r} />
              </li>
            ))}
          </ul>
        )}

        <div className="max-w-2xl">
          <ReviewForm productSlug={product.slug} productName={product.name} />
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16">
          <h2 id="related-heading" className="mb-5 font-display text-2xl">
            More from {product.category.name}
          </h2>
          <ProductGrid products={related} settings={settings} offerTerms={offerTerms} />
        </section>
      )}
    </div>
  );
}
