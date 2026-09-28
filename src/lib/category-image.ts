import COVERS from "./category-covers.json";

/**
 * Categories created by the seed were given placeholder artwork at
 * `/img/categories/<slug>.svg`, and that URL is stored in the database. Real
 * covers arrived later as `<slug>-cover.webp` files, but the stored URLs on an
 * already-seeded database still point at the placeholders — so every category
 * card kept showing generated artwork even though the photographs had shipped.
 *
 * Rather than ask the owner to retype sixteen URLs in the admin, a stored URL
 * that is still exactly that category's seeded placeholder resolves to its
 * cover. Anything else — a URL the owner typed, a Cloudinary upload, a
 * placeholder belonging to a different slug — is returned untouched, so this
 * can never overwrite a deliberate choice.
 *
 * The list of slugs that have a cover is a committed manifest rather than a
 * directory read: `public/` is served from the CDN and is not on disk inside a
 * serverless function, so checking the filesystem at request time would find
 * nothing in production. Both cover scripts rewrite the manifest.
 */
const HAS_COVER = new Set<string>(COVERS);

export function resolveCategoryImage(slug: string, stored: string | null): string | null {
  if (stored !== `/img/categories/${slug}.svg`) return stored;
  return HAS_COVER.has(slug) ? `/img/categories/${slug}-cover.webp` : stored;
}
