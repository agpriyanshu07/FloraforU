import Image from "next/image";
import Link from "next/link";
import EnquireButton from "./EnquireButton";
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
  const image = product.images[0];
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
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-rose-50"
        tabIndex={-1}
        aria-hidden="true"
      >
        {image ? (
          <Image
            src={image.url}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            priority={priority}
          />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-ink-600">
            Photo coming soon
          </span>
        )}
        {(isNew || onOffer) && (
          <span className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {isNew && <NewBadge />}
            {onOffer && <OfferBadge />}
          </span>
        )}
        <span className="absolute right-2 top-2">
          <AvailabilityTag availability={product.availability} />
        </span>
      </Link>

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
