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
} {
  if (isCloudinaryUrl(url)) {
    return { src: cloudinaryTransform(url, width), unoptimized: true };
  }
  const isRemote = /^https?:\/\//i.test(url);
  return isRemote ? { src: url, unoptimized: true } : { src: url };
}
