import ProductCard from "./ProductCard";
import type { ProductCardData } from "@/lib/queries";
import type { OfferTerms } from "@/lib/pricing";
import type { SiteSettings } from "@/lib/settings";

export default function ProductGrid({
  products,
  settings,
  offerTerms,
  priorityCount = 0,
  heading,
  hideCategory,
}: {
  products: ProductCardData[];
  settings: SiteSettings;
  /** Live campaign terms by product id — see getActiveOfferTerms. */
  offerTerms?: Map<string, OfferTerms>;
  priorityCount?: number;
  heading?: string;
  /**
   * Drop the category line from each card. On a category's own page it repeats
   * the page title on every card -- two wrapped lines of "PACKING & BOUQUET
   * ACCESSORIES" above each of twenty-four names on a phone.
   */
  hideCategory?: boolean;
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
              offer={offerTerms?.get(product.id)}
              priority={i < priorityCount}
              hideCategory={hideCategory}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
