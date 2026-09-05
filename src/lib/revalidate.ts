import { revalidatePath } from "next/cache";

/**
 * Clears the cache for every public page the owner can change from /admin.
 *
 * The public pages are cached (see the `revalidate` export on each one), so an
 * edit is only visible once its path is revalidated. The two dynamic segments
 * are passed as route patterns, which clears every page under them — what a
 * category rename or a bulk price change needs.
 *
 * Lives outside the "use server" action modules because those may only export
 * async functions, and both of them need this.
 */
export function refreshPublicPages() {
  for (const path of [
    "/",
    "/catalogue",
    "/categories",
    "/offers",
    "/reviews",
    "/gallery",
    "/about",
    "/contact",
    "/sitemap.xml",
  ]) {
    revalidatePath(path);
  }
  // The route-group prefix is required: revalidatePath matches the route file
  // structure, not the public URL, and both pages live in app/(site). Without
  // "(site)" these two calls match nothing, and a product edit stayed invisible
  // for the full hour — on the very pages WhatsApp links point customers at.
  revalidatePath("/(site)/product/[slug]", "page");
  revalidatePath("/(site)/categories/[slug]", "page");
}
