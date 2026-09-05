import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";

/**
 * Both suites share one SQLite database, so each resets it to known seed
 * content before running. Without this the suites would depend on each other's
 * order and on whatever the last local run left behind.
 */
export function reseed() {
  execFileSync("npx", ["tsx", "prisma/seed.ts"], {
    stdio: "ignore",
    env: { ...process.env },
  });
}

export const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "owner@floralforu.in";
export const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "floralforu123";

export async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.fill("#email", ADMIN_EMAIL);
  await page.fill("#password", ADMIN_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL("**/admin");
}

/**
 * Gives this page its own bucket in the review rate limiter.
 *
 * The limiter keys on x-forwarded-for, and a browser submission sends none, so
 * every form-driven review in the suite lands in the same "unknown" bucket —
 * three per hour, shared. That is fine on a fresh server and quietly fatal on a
 * reused one (reuseExistingServer is the local default), where the count
 * carries over between runs and a later test starts seeing 429s.
 */
export async function isolateReviewLimiter(page: Page) {
  const ip = `10.77.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  await page.route("**/api/reviews", (route) =>
    route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ip } }),
  );
}

/** Scrolls the full page so lazily-loaded images actually load. */
export async function loadLazyImages(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) window.scrollTo(0, y);
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(250);
}

export const PUBLIC_ROUTES = [
  "/",
  "/categories",
  "/categories/pots-vases",
  "/catalogue",
  "/product/lace-pot",
  "/offers",
  "/gallery",
  "/reviews",
  "/about",
  "/contact",
  "/wishlist",
] as const;
