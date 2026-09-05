import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGallery from "@/components/ProductGallery";
import ProductGrid from "@/components/ProductGrid";
import EnquireButton from "@/components/EnquireButton";
import ShareToStory from "@/components/ShareToStory";
import ReviewCard from "@/components/ReviewCard";
import ReviewForm from "@/components/ReviewForm";
import { AvailabilityTag, CategoryTag, NewBadge, OfferBadge } from "@/components/Badges";
import { InstagramIcon, PhoneIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { buildWhatsappUrl, withUtm } from "@/lib/whatsapp";
import { formatPrice, isProductNew, AVAILABILITY_LABELS } from "@/lib/format";
import { PRODUCT_CARD_SELECT, PUBLIC_REVIEW_WHERE, getActiveOfferProductIds } from "@/lib/queries";
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

  const [settings, offerIds, related, reviews] = await Promise.all([
    getSettings(),
    getActiveOfferProductIds(),
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

  const onOffer = offerIds.has(product.id);
  const priceLabel = formatPrice(product.price, product.priceOnEnquiry);
  const productUrl = `${settings.siteUrl}/product/${product.slug}`;
  const waHref = withUtm(
    buildWhatsappUrl({
      number: settings.whatsapp,
      template: settings.whatsappTemplate,
      productName: product.name,
      productCode: product.code,
      productUrl,
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
  };

  return (
    <div className="shell py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serialiseJsonLd(jsonLd) }}
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

          {product.code && (
            <p className="mt-1 text-sm text-ink-600">Product code: {product.code}</p>
          )}

          <p className="mt-5 font-display text-3xl text-rose-600">{priceLabel}</p>
          {!product.priceOnEnquiry && (
            <p className="mt-1 text-[13px] text-ink-600">
              Indicative rate. Bulk and event pricing confirmed on WhatsApp.
            </p>
          )}

          <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
            <div className="flex gap-4 py-3">
              <dt className="w-32 shrink-0 font-semibold">Pack / size</dt>
              <dd className="text-ink-600">{product.spec || "Ask us"}</dd>
            </div>
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
          </dl>

          {product.description && (
            <div className="mt-6">
              <h2 className="font-display text-xl">About this item</h2>
              <p className="mt-2 leading-relaxed text-ink-600">{product.description}</p>
            </div>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
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
              href={withUtm(settings.instagram, "website", "product-dm")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              <InstagramIcon className="h-4 w-4" />
              DM on Instagram
            </a>
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
          <ProductGrid products={related} settings={settings} offerIds={offerIds} />
        </section>
      )}
    </div>
  );
}
