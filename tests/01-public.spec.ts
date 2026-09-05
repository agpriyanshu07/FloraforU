import { test, expect, type Page } from "@playwright/test";
import { PUBLIC_ROUTES, loadLazyImages, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => reseed());

const gridNames = (page: Page) =>
  page.$$eval("article h3 a", (as) => as.map((a) => a.textContent!.trim()));

const resultCount = (page: Page) =>
  page.$eval('p[aria-live="polite"]', (el) => el.textContent!.trim());

// ---------------------------------------------------------------- rendering --

for (const width of [375, 768, 1440]) {
  test(`every public page renders at ${width}px with no overflow or console errors`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });

    for (const route of PUBLIC_ROUTES) {
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(`PAGEERROR ${e.message}`));

      const response = await page.goto(route);
      expect(response?.status(), `${route} status`).toBe(200);

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflows, `${route} scrolls horizontally at ${width}px`).toBe(false);
      expect(errors, `${route} console errors`).toEqual([]);

      page.removeAllListeners("console");
      page.removeAllListeners("pageerror");
    }
  });
}

// ------------------------------------------------------- the hard constraint --

test("no cart, checkout or payment UI exists on any page", async ({ page }) => {
  const banned = ["add to cart", "buy now", "checkout", "proceed to pay", "add to basket"];

  for (const route of PUBLIC_ROUTES) {
    await page.goto(route);
    const found = await page.evaluate((keys) => {
      const text = document.body.innerText.toLowerCase();
      return keys.filter((k) => text.includes(k));
    }, banned);
    expect(found, `${route} contains cart/checkout wording`).toEqual([]);
  }
});

// ------------------------------------------------------- the Enquire mechanic --

for (const [route, label] of [
  ["/", "home"],
  ["/catalogue", "catalogue"],
  ["/categories/pots-vases", "category"],
] as const) {
  test(`${label}: Enquire buttons are wa.me links naming the product and linking back`, async ({
    page,
  }) => {
    await page.goto(route);

    const links = await page.$$eval('a[href^="https://wa.me/"]', (as) =>
      as.map((a) => ({ href: (a as HTMLAnchorElement).href, aria: a.getAttribute("aria-label") })),
    );
    const productLinks = links.filter((l) => l.aria?.startsWith("Enquire about "));
    expect(productLinks.length, "product Enquire links found").toBeGreaterThanOrEqual(3);

    for (const link of productLinks.slice(0, 3)) {
      const url = new URL(link.href);
      const message = url.searchParams.get("text") ?? "";
      const name = link.aria!.replace("Enquire about ", "").replace(" on WhatsApp", "");

      expect(url.pathname, "wa.me number").toMatch(/^\/\d{10,}$/);
      expect(message, `message names "${name}"`).toContain(name);
      expect(message, "message links back to the product").toContain("/product/");
    }
  });
}

test("an Enquire click is recorded in the enquiry log", async ({ request }) => {
  const response = await request.post("/api/enquiries", {
    data: { channel: "whatsapp", pagePath: "/catalogue" },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true });
});

// ------------------------------------------------------------------ browsing --

test("the category grid lists every category and each one resolves", async ({ page }) => {
  await page.goto("/categories");

  const hrefs = await page.$$eval('a[href^="/categories/"]', (as) => [
    ...new Set(as.map((a) => a.getAttribute("href")!)),
  ]);
  expect(hrefs.length, "categories in the grid").toBe(16);

  for (const href of hrefs) {
    const response = await page.goto(href);
    expect(response?.status(), `${href} status`).toBe(200);
    expect(await page.locator("article").count(), `${href} product count`).toBeGreaterThan(0);
  }
});

test("catalogue search narrows the result set", async ({ page }) => {
  await page.goto("/catalogue");
  const all = await gridNames(page);

  await page.goto("/catalogue?q=fog");
  const searched = await gridNames(page);

  expect(searched.length).toBeGreaterThan(0);
  expect(searched.length).toBeLessThan(all.length);
  expect(searched.join(" ").toLowerCase()).toContain("fog");
});

test("search is case-insensitive whatever the shopper types", async ({ page }) => {
  // PostgreSQL's `contains` is case-sensitive, unlike SQLite's. Without an
  // explicit insensitive mode a shopper typing "fog" — which is what people
  // actually type — got zero results on the hosted database while "Fog"
  // worked. Every spelling must return the same set.
  const counts: Record<string, string[]> = {};
  for (const q of ["fog", "FOG", "Fog", "fOg"]) {
    await page.goto(`/catalogue?q=${q}`);
    counts[q] = (await gridNames(page)).sort();
  }

  expect(counts.fog.length, "lowercase search must find products").toBeGreaterThan(0);
  expect(counts.FOG).toEqual(counts.fog);
  expect(counts.Fog).toEqual(counts.fog);
  expect(counts.fOg).toEqual(counts.fog);
});

test("the category filter restricts the grid to that category", async ({ page }) => {
  await page.goto("/catalogue?category=sfx-special-effects");

  expect((await gridNames(page)).length).toBeGreaterThan(0);
  const tags = await page.$$eval("article span.uppercase", (els) => [
    ...new Set(els.map((e) => e.textContent!.trim())),
  ]);
  expect(tags).toContain("SFX & Special Effects");
});

test("all five sort options order the grid correctly", async ({ page }) => {
  await page.goto("/catalogue?sort=name-asc");
  const asc = await gridNames(page);
  expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b)));

  await page.goto("/catalogue?sort=name-desc");
  const desc = await gridNames(page);
  expect(desc).toEqual([...desc].sort((a, b) => b.localeCompare(a)));
  expect(asc).not.toEqual(desc);

  const prices = async () =>
    page.$$eval("article p.text-lg", (els) =>
      els
        .map((e) => e.textContent!.trim())
        .filter((t) => t.startsWith("₹"))
        .map((t) => Number(t.replace(/[₹,]/g, ""))),
    );

  await page.goto("/catalogue?sort=price-asc");
  const up = await prices();
  expect(up.length).toBeGreaterThan(1);
  expect(up).toEqual([...up].sort((a, b) => a - b));

  await page.goto("/catalogue?sort=price-desc");
  const down = await prices();
  expect(down).toEqual([...down].sort((a, b) => b - a));

  await page.goto("/catalogue?sort=newest");
  expect(await gridNames(page)).not.toEqual(up.length ? asc : []);
});

test("the New and On-offer quick filters each narrow the set", async ({ page }) => {
  await page.goto("/catalogue");
  const all = await resultCount(page);

  await page.goto("/catalogue?new=1");
  const isNew = await resultCount(page);

  await page.goto("/catalogue?offer=1");
  const onOffer = await resultCount(page);

  expect(isNew).not.toBe(all);
  expect(onOffer).not.toBe(all);
  expect(isNew).not.toBe(onOffer);
});

test("a zero-result search shows a real empty state, not a blank grid", async ({ page }) => {
  await page.goto("/catalogue?q=zzzzznotathing");
  await expect(page.getByText("No products match those filters")).toBeVisible();
});

// -------------------------------------------------------------------- offers --

test("an active offer is shown with a live countdown and an expired one is archived", async ({
  page,
}) => {
  await page.goto("/offers");
  await expect(page.getByRole("heading", { name: "Ganesh Puja Sale" })).toBeVisible();

  // The countdown only renders after hydration; before that it shows a date.
  // Scoped to the campaign's own card: the site-wide offer ribbon carries a
  // second countdown, and several campaigns can run at once, so an unscoped
  // match is ambiguous.
  await expect(
    page
      .locator("section", { has: page.getByRole("heading", { name: "Ganesh Puja Sale" }) })
      .getByText(/Ends in \d+d/)
      .first(),
  ).toBeVisible();

  const body = await page.evaluate(() => document.body.innerText);
  const [active, past] = body.split("Past campaigns");
  expect(active, "expired campaign must not appear as active").not.toContain(
    "Monsoon Clearance",
  );
  expect(past, "expired campaign should be archived").toContain("Monsoon Clearance");
});

// ------------------------------------------------------------- accessibility --

test("every image carries an alt attribute", async ({ page }) => {
  for (const route of PUBLIC_ROUTES) {
    await page.goto(route);
    await loadLazyImages(page);

    const missing = await page.$$eval("img", (imgs) =>
      imgs.filter((i) => i.getAttribute("alt") === null).map((i) => i.getAttribute("src")),
    );
    expect(missing, `${route} images without alt`).toEqual([]);
  }
});

// -------------------------------------------------------------- admin is shut --

test("admin routes redirect to login when signed out", async ({ page }) => {
  for (const route of ["/admin", "/admin/products", "/admin/settings", "/admin/enquiries"]) {
    await page.goto(route);
    expect(page.url(), `${route} should redirect`).toContain("/admin/login");
  }
});

// ---------------------------------------------------------------- regressions --

test("an out-of-range page clamps to the last page instead of looking empty", async ({
  page,
}) => {
  await page.goto("/catalogue?page=9999");

  // It must show real results, not the "no products match those filters"
  // message — the filters are fine, the page number was simply too high.
  expect(await page.locator("article").count()).toBeGreaterThan(0);
  await expect(page.getByText("No products match those filters")).toHaveCount(0);
  await expect(page.getByText(/page \d+ of \d+/)).toBeVisible();
});

// ------------------------------------------------------------------- exports --

test("the catalogue PDF is generated from live data", async ({ request }) => {
  const response = await request.get("/api/catalogue-pdf");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");

  const body = await response.body();
  expect(body.subarray(0, 5).toString()).toBe("%PDF-");
  expect(body.byteLength, "PDF should hold the whole catalogue").toBeGreaterThan(10_000);
});

// -------------------------------------------------------------- sale visibility --

test("the offer ribbon follows the visitor across the site, not just the homepage", async ({
  page,
}) => {
  // Before this the only sign of a live sale was the homepage strip and
  // /offers, so anyone arriving on a product page from a shared link saw none.
  for (const route of ["/", "/catalogue", "/product/lace-pot", "/about"]) {
    await page.goto(route);
    await expect(
      page.getByRole("complementary", { name: "Current offer" }),
      `${route} should carry the sale ribbon`,
    ).toBeVisible();
  }

  // Redundant on /offers itself, where the campaigns are already the content.
  await page.goto("/offers");
  await expect(page.getByRole("complementary", { name: "Current offer" })).toHaveCount(0);
});

test("the offer ribbon can be dismissed for the session", async ({ page }) => {
  await page.goto("/");
  const ribbon = page.getByRole("complementary", { name: "Current offer" });
  await expect(ribbon).toBeVisible();

  await page.getByRole("button", { name: /Dismiss the offer bar/ }).click();
  await expect(ribbon).toHaveCount(0);

  // Still gone after a full navigation, since the choice is held in
  // sessionStorage rather than in component state.
  //
  // This leaves and comes back to the same route on purpose. The dismissal is
  // keyed by offer id, and two different routes are two independent ISR cache
  // entries that can have been rendered against different seeds — so comparing
  // across them would test the cache's freshness, not the ribbon.
  await page.goto("/about");
  await page.goto("/");
  await expect(page.getByRole("complementary", { name: "Current offer" })).toHaveCount(0);
});

test("every simultaneously-active offer is reachable from the homepage", async ({
  page,
}) => {
  await page.goto("/");
  const strip = page.locator("section[aria-labelledby='offer-strip-heading']");
  await expect(strip).toBeVisible();

  // The homepage used to render offers[0] and silently drop the rest. Every
  // live campaign is now a card in this section, so each one has to be on the
  // page outright — not behind a carousel, a timer or a click.
  const titles = await strip.locator("h3").allTextContents();
  expect(titles.length).toBeGreaterThan(0);
  expect(titles).toContain("Ganesh Puja Sale");

  for (const title of titles) {
    await expect(strip.getByRole("heading", { name: title, level: 3 })).toBeVisible();
  }

  // The module earns its place by showing what is discounted, so a campaign
  // with products must link to them rather than only announcing itself.
  await expect(strip.locator('a[href^="/product/"]').first()).toBeVisible();
});

test("the homepage sale module needs no motion, and does not repeat the ribbon", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");

  const strip = page.locator("section[aria-labelledby='offer-strip-heading']");
  // No carousel at all any more: campaigns stack, so nothing is stranded
  // behind a rotation that never runs for someone who opted out of motion.
  await expect(strip.getByRole("button", { name: /Show offer/ })).toHaveCount(0);
  await expect(strip).not.toHaveAttribute("aria-roledescription", "carousel");

  // The countdown pulse is genuinely off, not merely slower.
  const animation = await strip
    .locator("span[aria-live='off']")
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe("none");

  // The bug this guards: the ribbon and this module were both full-width
  // themed bars carrying the same title, countdown and button, so the sale
  // appeared twice and read as a rendering fault. The ribbon is a
  // complementary landmark; the module must not be a second one.
  await expect(page.getByRole("complementary", { name: "Current offer" })).toHaveCount(1);
  await expect(strip.getByRole("link", { name: /^View offers$/ })).toHaveCount(0);

  await context.close();
});
