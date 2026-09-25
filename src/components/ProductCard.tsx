import Link from "next/link";
import EnquireButton from "./EnquireButton";
import WishlistButton from "./WishlistButton";
import CardGallery from "./CardGallery";
import Price from "./Price";
import { AvailabilityTag, CategoryTag, NewBadge, OfferBadge } from "./Badges";
import { isProductNew } from "@/lib/format";
import { enquiryPriceNote, pricingFor, type OfferTerms } from "@/lib/pricing";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import type { ProductCardData } from "@/lib/queries";
import type { SiteSettings } from "@/lib/settings";

type Props = {
  product: ProductCardData;
  settings: SiteSettings;
  /** Present when a live campaign covers this product. */
  offer?: OfferTerms | null;
  priority?: boolean;
};

export default function ProductCard({ product, settings, offer, priority }: Props) {
  const onOffer = Boolean(offer);
  const pricing = pricingFor(product.price, product.priceOnEnquiry, offer);
  const isNew = isProductNew(product);
  const productUrl = `${settings.siteUrl}/product/${product.slug}`;
  const waHref = buildWhatsappUrl({
    number: settings.whatsapp,
    template: settings.whatsappTemplate,
    productName: product.name,
    productCode: product.code,
    productUrl,
    note: enquiryPriceNote(pricing) ?? undefined,
  });

  return (
    <article className="card group flex h-full w-full flex-col overflow-hidden transition-shadow duration-200 hover:shadow-[0_8px_28px_-12px_rgba(155,44,90,0.28)]">
      {/* Wrapped so the heart and badges can sit over the photo. They are
          siblings of the gallery's own link rather than inside it — a button
          nested in an anchor is invalid markup. */}
      <div className="relative">
        <CardGallery
          images={product.images}
          productName={product.name}
          href={`/product/${product.slug}`}
          priority={priority}
        />

        {/* One wrapping row, not two positioned corners and not two groups.
            A card is about 150px wide on a 320px phone, so "New", "Offer" and
            the stock badge together cannot fit on one line — and as two groups
            pinned left and right they simply overlapped. As siblings in a
            single wrapping flow the last one drops to its own line instead,
            which cannot collide with anything. `ml-auto` keeps the stock badge
            to the right while there is room for it. */}
        <span className="pointer-events-none absolute inset-x-2 top-2 z-10 flex flex-wrap items-start gap-1.5">
          {isNew && <NewBadge />}
          {onOffer && <OfferBadge />}
          <span className="ml-auto">
            <AvailabilityTag availability={product.availability} short />
          </span>
        </span>

        <WishlistButton
          slug={product.slug}
          productName={product.name}
          className="absolute bottom-2 right-2 z-10"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <CategoryTag>{product.category.name}</CategoryTag>

        <h3 className="line-clamp-3 font-display text-[17px] leading-snug">
          <Link
            href={`/product/${product.slug}`}
            className="after:absolute hover:text-rose-600"
          >
            {product.name}
          </Link>
        </h3>

        {product.spec && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-600">
            {product.spec}
          </p>
        )}

        {/* Quoted on WhatsApp more often than the name is, so it belongs on the
            card rather than one click away. */}
        {product.code && (
          <p className="text-[11px] uppercase tracking-wide text-ink-600">
            Code {product.code}
          </p>
        )}

        <Price
          price={product.price}
          priceOnEnquiry={product.priceOnEnquiry}
          terms={offer}
          className="mt-auto pt-2"
        />

        <EnquireButton
          href={waHref}
          productId={product.id}
          ariaLabel={`Enquire about ${product.name} on WhatsApp`}
          className="btn-primary btn-sm mt-1.5 w-full"
        />
      </div>
    </article>
  );
}
