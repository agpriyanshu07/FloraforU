import Link from "next/link";
import EnquireButton from "./EnquireButton";
import WishlistButton from "./WishlistButton";
import CardGallery from "./CardGallery";
import { AvailabilityTag, CategoryTag, NewBadge, OfferBadge } from "./Badges";
import { formatPrice, isProductNew } from "@/lib/format";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import type { ProductCardData } from "@/lib/queries";
import type { SiteSettings } from "@/lib/settings";

type Props = {
  product: ProductCardData;
  settings: SiteSettings;
  onOffer?: boolean;
  priority?: boolean;
};

export default function ProductCard({ product, settings, onOffer, priority }: Props) {
  const isNew = isProductNew(product);
  const productUrl = `${settings.siteUrl}/product/${product.slug}`;
  const waHref = buildWhatsappUrl({
    number: settings.whatsapp,
    template: settings.whatsappTemplate,
    productName: product.name,
    productCode: product.code,
    productUrl,
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

        {(isNew || onOffer) && (
          <span className="absolute left-2 top-2 z-10 flex flex-wrap gap-1.5">
            {isNew && <NewBadge />}
            {onOffer && <OfferBadge />}
          </span>
        )}
        <span className="absolute right-2 top-2 z-10">
          <AvailabilityTag availability={product.availability} />
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

        <p className="mt-auto pt-2 text-lg font-semibold text-ink-900">
          {formatPrice(product.price, product.priceOnEnquiry)}
        </p>

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
