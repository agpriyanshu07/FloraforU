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
  "/reviews",
  "/about",
  "/contact",
  "/wishlist",
] as const;

/**
 * Runs a snippet against the real database in a throwaway tsx process.
 *
 * The suite drives a separate server process, so the alternative is a second
 * Prisma client inside the test runner holding its own connections open for
 * the whole run. `reseed()` already shells out for the same reason; this is
 * that, for a single row.
 */
function dbEval(body: string): string {
  return execFileSync(
    "npx",
    [
      "tsx",
      "-e",
      // dotenv explicitly: this is a fresh process, and `tsx -e` does not read
      // .env the way `npm run seed` does. Without it the snippet dies with
      // "Environment variable not found: DATABASE_URL" on any machine that
      // keeps its connection string in a file rather than the shell.
      `import "dotenv/config";
       import { PrismaClient } from "./src/generated/prisma";
       const db = new PrismaClient();
       (async () => { ${body} })()
         .then(() => db.$disconnect())
         .catch((e) => { console.error(e); process.exit(1); });`,
    ],
    { encoding: "utf8", env: { ...process.env } },
  ).trim();
}

/** How many reviews are sitting in the moderation queue right now. */
export function pendingReviewCount(): number {
  return Number(
    dbEval(`process.stdout.write(String(await db.review.count({ where: { status: "pending" } })));`),
  );
}

/** Puts one review in the queue and returns its id, for the caller to remove. */
export function addPendingReview(): string {
  return dbEval(
    `const r = await db.review.create({ data: {
       customerName: "Nav badge probe",
       quote: "Left pending so the badge has something to count.",
       status: "pending", submittedByCustomer: true, visible: false,
     } });
     process.stdout.write(r.id);`,
  );
}

export function deleteReview(id: string) {
  dbEval(`await db.review.delete({ where: { id: ${JSON.stringify(id)} } });`);
}
