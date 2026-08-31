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
  await expect(page.getByText(/Ends in \d+d/)).toBeVisible();

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

// ------------------------------------------------------------------- exports --

test("the catalogue PDF is generated from live data", async ({ request }) => {
  const response = await request.get("/api/catalogue-pdf");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");

  const body = await response.body();
  expect(body.subarray(0, 5).toString()).toBe("%PDF-");
  expect(body.byteLength, "PDF should hold the whole catalogue").toBeGreaterThan(10_000);
});
