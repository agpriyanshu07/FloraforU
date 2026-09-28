/**
 * Photographs that live in the repository but not in the database.
 *
 * Until Cloudinary is configured the shop cannot upload, so photos arrive
 * here as committed files. A file alone is not enough: the site reads image
 * URLs from the database, and nothing writes them there except an import or
 * an admin edit. That left seven lights showing "Photo coming soon" on the
 * live site with their photographs sitting in `public/`, and the Instagram
 * strip empty with five shop photos likewise sitting unused.
 *
 * These maps close that gap. They are consulted only when the database has
 * nothing — a product with no images at all, or a gallery with no real photo
 * — so anything uploaded or imported later takes precedence without needing
 * this file touched. Re-importing catalogue-batch-11.csv makes the product
 * half of it redundant, which is the intended end state.
 *
 * Keyed by name rather than slug: these products carry no shop code and the
 * importer matches them on name too, so the two agree.
 */

/** Product name -> its photos, in order. */
const PRODUCT_PHOTOS: Record<string, string[]> = {
  "Humming Hanging Bird 915": ["/img/products/humming-hanging-bird-915.webp"],
  "Dan Shaped Hanging 945": ["/img/products/dan-shaped-hanging-945.webp"],
  "Candle Light 916": ["/img/products/candle-light-916.webp"],
  "Big Star 904": ["/img/products/big-star-904.webp"],
  "Cover Bird 914": ["/img/products/cover-bird-914.webp"],
  "Hanging Light 903": ["/img/products/hanging-light-903.webp"],
  "Golden Jali 931": ["/img/products/golden-jali-931.webp"],
};

type Img = { url: string; alt?: string | null };

/**
 * Fills in a product's photos when it has none. Anything with a photo
 * already is returned untouched, so this can never mask real data.
 */
export function withPhotoFallback<T extends { name: string; images: Img[] }>(product: T): T {
  if (product.images.length > 0) return product;
  const urls = PRODUCT_PHOTOS[product.name];
  if (!urls) return product;
  return { ...product, images: urls.map((url) => ({ url, alt: product.name })) };
}

export function withPhotoFallbacks<T extends { name: string; images: Img[] }>(products: T[]): T[] {
  return products.map(withPhotoFallback);
}

/**
 * The Instagram strip's photos, used only when the gallery holds no real
 * ones of its own. Frames from the shop's own reels, captions included.
 */
export const INSTAGRAM_FALLBACK = [
  { id: "ig-roses", title: "Artificial roses — more variety in stock", imageUrl: "/img/instagram/artificial-roses-variety.webp" },
  { id: "ig-garlands", title: "Ready-made garlands", imageUrl: "/img/instagram/ready-made-garlands.webp" },
  { id: "ig-bunches", title: "Rose bunches in every shade", imageUrl: "/img/instagram/rose-bunches.webp" },
  { id: "ig-roses-dalia-peony", title: "Roses, dahlias and peonies by the bunch", imageUrl: "/img/instagram/rose-dalia-peony.webp" },
  { id: "ig-vases", title: "Decorative vases with made-up stems", imageUrl: "/img/instagram/vases-and-stems.webp" },
  { id: "ig-hangings", title: "Garlands, jhumars and bell hangings in the shop", imageUrl: "/img/instagram/come-visit-us.webp" },
  { id: "ig-signboard", title: "The shop at Bank More, Dhanbad", imageUrl: "/img/instagram/shopfront-signboard.webp" },
  { id: "ig-opening", title: "Opening day at the Bank More shop", imageUrl: "/img/instagram/shop-opening.webp" },
  { id: "ig-wholesale", title: "Wholesale prices in Dhanbad", imageUrl: "/img/instagram/wholesale-dhanbad.webp" },
  { id: "ig-heads", title: "Loose flower heads by the bag", imageUrl: "/img/instagram/loose-flower-heads.webp" },
  { id: "ig-ribbons", title: "Ribbons, beads and craft supplies", imageUrl: "/img/instagram/ribbons-and-craft-supplies.webp" },
  { id: "ig-baskets", title: "Cane baskets, laces and trims", imageUrl: "/img/instagram/baskets-and-trims.webp" },
] as const;
