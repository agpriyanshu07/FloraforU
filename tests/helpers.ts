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
] as const;
