import ProductCard from "./ProductCard";
import type { ProductCardData } from "@/lib/queries";
import type { SiteSettings } from "@/lib/settings";

export default function ProductGrid({
  products,
  settings,
  offerIds,
  priorityCount = 0,
  heading,
}: {
  products: ProductCardData[];
  settings: SiteSettings;
  offerIds?: Set<string>;
  priorityCount?: number;
  heading?: string;
}) {
  return (
    <>
      {/* Product cards are <h3>. Pages where no visible <h2> precedes the grid
          pass a heading so the document outline doesn't skip a level — that
          outline is how screen-reader users navigate the page. */}
      {heading && <h2 className="sr-only">{heading}</h2>}
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {products.map((product, i) => (
          <li key={product.id} className="relative flex">
            <ProductCard
              product={product}
              settings={settings}
              onOffer={offerIds?.has(product.id)}
              priority={i < priorityCount}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
