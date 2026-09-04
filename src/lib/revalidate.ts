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
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/categories/[slug]", "page");
}
