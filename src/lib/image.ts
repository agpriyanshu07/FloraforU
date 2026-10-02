/**
 * Cloudinary already has a resizing and compressing CDN in front of every image
 * it stores, so pushing those through the host's image optimizer too would pay
 * for the same work twice — and the host's free tier caps how many
 * optimizations a month you get, which 500 products would eat through quickly.
 *
 * So for a Cloudinary URL we ask Cloudinary for the size we want and let
 * next/image pass it through untouched. Everything else — the local
 * placeholder SVGs, or a URL pasted from somewhere else — behaves as before.
 */

const CLOUDINARY_UPLOAD = "/image/upload/";

/**
 * Product photographs are served as they are, straight off the CDN.
 *
 * They do NOT go through the image optimizer, and that is deliberate.
 *
 * The catalogue holds 920 photographs. Image transformations are metered by
 * the host, and 920 sources times several widths each, re-validated on a
 * timer, is more than a small plan's allowance. When it runs out the optimizer
 * stops serving and every product photo on the site turns into a broken-image
 * icon — which is exactly what happened: the logo kept rendering because it is
 * a static file, while all 920 photographs vanished at once.
 *
 * Raising the quality from 75 to 90 is what tipped it over. Quality is part of
 * the cache key, so changing it invalidated every stored variant and forced
 * the whole catalogue to be re-transformed in one go.
 *
 * Serving the original file costs more bytes — a median of 53KB against about
 * 15KB for a small optimized variant — but it is the only form of delivery
 * that cannot fail on a meter, and it is also the HIGHEST quality available:
 * the customer gets the photographer's file, with no second lossy pass over it
 * at all. For a shop that sells on how its stock looks, a page that is heavier
 * but always shows the product beats a lighter one that intermittently shows
 * nothing.
 *
 * Photos uploaded to Cloudinary are already handled below and are unaffected;
 * Cloudinary resizes on its own CDN. As the shop replaces these files with
 * uploads over time, the weight comes back down on its own.
 */

/**
 * `f_auto` picks WebP or AVIF per browser, `q_auto` picks a quality that holds
 * up visually, and `c_limit` never enlarges an image past its original.
 */
export function cloudinaryTransform(url: string, width: number): string {
  const at = url.indexOf(CLOUDINARY_UPLOAD);
  if (at === -1) return url;

  const head = url.slice(0, at + CLOUDINARY_UPLOAD.length);
  const tail = url.slice(at + CLOUDINARY_UPLOAD.length);

  // An already-transformed URL is left alone rather than stacking a second
  // transform onto it.
  if (/^[a-z]{1,3}_[^/]+\//.test(tail)) return url;

  return `${head}f_auto,q_auto,c_limit,w_${width}/${tail}`;
}

export function isCloudinaryUrl(url: string): boolean {
  return url.startsWith("https://res.cloudinary.com/");
}

/**
 * Spread onto next/image. `width` is the largest size the slot renders at.
 *
 * Every remote URL is passed through unoptimized, which also stops next/image
 * throwing "hostname is not configured" on a host that isn't in the config —
 * the marked `unoptimized` path returns before the loader that checks. That
 * matters because the owner can paste any URL into the admin, and a typo in a
 * product photo should leave a broken image, not a 500 on the product page.
 * Nothing unknown is proxied through the optimizer, so this is the safe
 * direction to fail in.
 *
 * Local paths still go through the optimizer as normal.
 */
export function imageProps(url: string, width: number): {
  src: string;
  unoptimized?: true;
  quality?: number;
} {
  if (isCloudinaryUrl(url)) {
    return { src: cloudinaryTransform(url, width), unoptimized: true };
  }
  const isRemote = /^https?:\/\//i.test(url);
  if (isRemote) return { src: url, unoptimized: true };
  // Local file: hand the browser the committed .webp itself. These are already
  // web-ready — median 540px wide and 53KB — so there is little for an
  // optimizer to win here, and a great deal for it to lose.
  return { src: url, unoptimized: true };
}
