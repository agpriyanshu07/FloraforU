import { test, expect, type Page } from "@playwright/test";
import { PUBLIC_ROUTES, loadLazyImages, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => reseed());

const gridNames = (page: Page) =>
  page.$$eval("article h3 a", (as) => as.map((a) => a.textContent!.trim()));

// Scoped to main: the header search has its own polite live region for its
// suggestion count, and an unscoped selector picks up whichever comes first in
// the DOM — which is the header's.
const resultCount = (page: Page) =>
  page.$eval('main p[aria-live="polite"]', (el) => el.textContent!.trim());

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

  // Each campaign card is itself the way in, so the whole card links through
  // to the offers page rather than only the button underneath it.
  await expect(strip.locator('a[href="/offers"]').first()).toBeVisible();
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

// ------------------------------------------------------------------ wishlist --

test("an item can be saved, survives navigation, and reaches the saved list", async ({
  page,
}) => {
  await page.goto("/catalogue");

  // Nothing saved yet, so the header offers no count.
  await expect(page.getByRole("link", { name: "Saved items" })).toBeVisible();

  const hearts = page.getByRole("button", { name: /^Save .+ for later$/ });
  await hearts.first().click();
  await hearts.nth(1).click();

  // The heart is a real toggle, not a one-way action.
  await expect(
    page.getByRole("button", { name: /^Remove .+ from your saved items$/ }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Saved items — 2 items" })).toBeVisible();

  // Survives a full navigation, because it lives in localStorage rather than
  // in component state.
  await page.goto("/wishlist");
  const cards = page.locator("article");
  await expect(cards).toHaveCount(2);
  await expect(page.getByText("2 items saved in this browser.")).toBeVisible();

  // The point of the list on a WhatsApp-only shop: one message with everything
  // on it, naming the actual items rather than a generic opener.
  const send = page.getByRole("link", { name: /Send this list on WhatsApp/ });
  // wa.me encodes spaces as "+", which decodeURIComponent leaves alone.
  const href = decodeURIComponent((await send.getAttribute("href")) ?? "").replace(
    /\+/g,
    " ",
  );
  expect(href).toContain("I've saved these items");
  const firstName = (await cards.first().getByRole("heading").textContent())?.trim();
  expect(href).toContain(firstName!);

  // Un-saving from the list removes it from the list.
  await page.getByRole("button", { name: /^Remove .+ from your saved items$/ }).first().click();
  await expect(cards).toHaveCount(1);

  await page.getByRole("button", { name: "Clear list" }).click();
  await expect(page.getByText("Nothing saved yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Saved items" })).toBeVisible();
});

test("the saved list survives a browser with no storage available", async ({
  browser,
}) => {
  // Private mode and locked-down browsers throw on localStorage access. The
  // hearts must degrade to "does not remember", never take the page down.
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("storage disabled");
      },
    });
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/wishlist");
  await expect(page.getByText("Nothing saved yet")).toBeVisible();

  await page.goto("/catalogue");
  await page.getByRole("button", { name: /^Save .+ for later$/ }).first().click();
  await expect(page.locator("article").first()).toBeVisible();

  expect(errors, "storage being unavailable must not throw").toEqual([]);
  await context.close();
});

test("the wishlist endpoint only returns published products, in saved order", async ({
  request,
}) => {
  const res = await request.post("/api/wishlist", {
    data: { slugs: ["dry-flower-bunch-assorted", "not-a-real-product", "lace-pot"] },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();

  // The unknown slug is dropped rather than erroring, and the order the
  // customer saved things in is preserved.
  expect(body.products.map((p: { slug: string }) => p.slug)).toEqual([
    "dry-flower-bunch-assorted",
    "lace-pot",
  ]);

  const bad = await request.post("/api/wishlist", {
    data: { slugs: Array.from({ length: 61 }, (_, i) => `p-${i}`) },
  });
  expect(bad.status(), "an oversized list is refused").toBe(400);
});

// -------------------------------------------------------------------- search --

test("the header search suggests products and runs a real search on submit", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("combobox", { name: "Search the catalogue" });
  await expect(input).toBeVisible();

  await input.fill("lamp");
  const options = page.getByRole("option");
  await expect(options.first()).toBeVisible();
  await expect(await options.count()).toBeGreaterThan(0);

  // Suggestions are a shortcut to the item itself.
  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", /option-0$/);
  await input.press("Enter");
  await page.waitForURL("**/product/**");

  // Escape closes the list without navigating anywhere.
  await page.goto("/");
  await input.fill("pot");
  await expect(page.getByRole("option").first()).toBeVisible();
  await input.press("Escape");
  await expect(page.getByRole("option")).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe("/");

  // Enter with nothing highlighted submits the form, which is the full search:
  // /catalogue matches name, spec, code, description and category, not just the
  // handful of names the suggestion endpoint returns.
  await input.fill("marigold");
  await input.press("Enter");
  await page.waitForURL("**/catalogue?q=marigold");
  await expect(page.locator("article").first()).toBeVisible();
});

test("search works with JavaScript disabled", async ({ browser }) => {
  // The suggestions are an enhancement; the form underneath must still search.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  await page.getByRole("combobox", { name: "Search the catalogue" }).fill("marigold");
  await page.keyboard.press("Enter");

  await page.waitForURL("**/catalogue?q=marigold");
  await expect(page.locator("article").first()).toBeVisible();
  await context.close();
});

test("the suggestion endpoint ignores one-character queries", async ({ request }) => {
  // A single letter matches most of the catalogue: no use as a suggestion, and
  // not a query worth running on every keystroke.
  const tooShort = await request.get("/api/search?q=l");
  expect((await tooShort.json()).products).toEqual([]);

  const real = await request.get("/api/search?q=lamp");
  const body = await real.json();
  expect(body.products.length).toBeGreaterThan(0);
  expect(body.products.length).toBeLessThanOrEqual(6);

  // Case-insensitive: PostgreSQL's `contains` is not, by default.
  const upper = await request.get("/api/search?q=LAMP");
  expect((await upper.json()).products.length).toBe(body.products.length);
});

// --------------------------------------------------------- detail and polish --

test("the sticky enquire bar appears once the real button is scrolled past", async ({
  browser,
}) => {
  // The whole site funnels to one action, and on a phone that action scrolls
  // away behind the description, reviews and related items.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/product/lace-pot");

  const bar = page.locator("div.fixed.bottom-0").first();
  const hidden = async () =>
    ((await bar.getAttribute("class")) ?? "").includes("translate-y-full");

  expect(await hidden(), "hidden while the real button is still in view").toBe(true);

  // A jump, not a gradual scroll: an IntersectionObserver never fires for this
  // (intersection never changes), which is how two earlier attempts silently
  // did nothing.
  await page.evaluate(() => window.scrollTo(0, 3000));
  await expect.poll(hidden, { timeout: 4000 }).toBe(false);
  await expect(bar.getByRole("link", { name: /Enquire about Lace Pot/ })).toBeVisible();

  // Back up to the button and the duplicate gets out of the way again.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(hidden, { timeout: 4000 }).toBe(true);

  await context.close();
});

test("back to top appears on a long page and returns to the top", async ({ page }) => {
  await page.goto("/catalogue");
  const button = page.getByRole("button", { name: "Back to top" });

  // Checked by state, not geometry: the button is always positioned in the
  // viewport and is hidden by opacity, so toBeInViewport() reports it visible
  // even when it is not.
  const hidden = async () =>
    ((await button.getAttribute("class")) ?? "").includes("opacity-0");

  expect(await hidden(), "hidden near the top of the page").toBe(true);

  await page.evaluate(() => window.scrollTo(0, 2500));
  await expect.poll(hidden, { timeout: 4000 }).toBe(false);

  await button.click();
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 4000 }).toBe(0);
});

test("a product card pages through its photos without navigating away", async ({
  page,
}) => {
  await page.goto("/catalogue");

  const card = page.locator("article").filter({ hasText: "Dry Flower Bunch" }).first();
  const next = card.getByRole("button", { name: /^Next photo of Dry Flower Bunch/ });
  await expect(next).toHaveCount(1);

  const before = await card.locator("img").first().getAttribute("src");

  // The photo changes and the card's link does not fire — the arrows sit inside
  // a linked card, so a stray navigation is the obvious failure here.
  //
  // Clicked until it takes, rather than once: the arrows are hydrated on the
  // client, and on a loaded CI runner a click can land in the window before
  // React attaches its handler — a single click has nothing to retry it, and
  // the assertion then fails on a gallery that works. The click only fires
  // while the photo is still the first one, so this can never page past the
  // change it is waiting for.
  await expect
    .poll(
      async () => {
        const src = await card.locator("img").first().getAttribute("src");
        if (src === before) await next.click({ force: true });
        return src;
      },
      { timeout: 10_000 },
    )
    .not.toBe(before);
  expect(new URL(page.url()).pathname).toBe("/catalogue");

  // A product with a single photo gets no controls at all.
  await expect(
    page.getByRole("button", { name: /^Next photo of Velvet Backdrop/ }),
  ).toHaveCount(0);
});

test("the contact actions stay on one row at every width", async ({ page }) => {
  // They used to wrap, dropping the last button onto a line of its own. The row
  // has to hold together on a 320px phone and a desktop card alike, and no label
  // may be cut off to achieve it.
  for (const width of [320, 360, 375, 414, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/contact");

    // Found through the WhatsApp link's own parent rather than by class name, so
    // this keeps testing the layout rather than the utilities that produce it.
    const boxes = await page
      .getByRole("link", { name: "Chat on WhatsApp" })
      .evaluate((link) =>
        [...link.parentElement!.children].map((child) => ({
          top: Math.round(child.getBoundingClientRect().top),
          height: Math.round(child.getBoundingClientRect().height),
          // Overflowing content means a label is being cut off, not wrapped.
          clipped: child.scrollWidth > child.clientWidth + 1,
        })),
      );

    expect(boxes, `actions at ${width}px`).toHaveLength(2);
    expect(new Set(boxes.map((b) => b.top)).size, `one row at ${width}px`).toBe(1);
    expect(
      boxes.some((b) => b.clipped),
      `no label cut off at ${width}px`,
    ).toBe(false);
    // The 44px touch target survives the squeeze.
    expect(Math.min(...boxes.map((b) => b.height))).toBeGreaterThanOrEqual(44);
  }

  // Calling is still one tap away, through the phone number itself.
  // Scoped to main: the footer carries the same number.
  await expect(
    page.locator("main").getByRole("link", { name: /^\+91/ }),
  ).toHaveAttribute("href", /^tel:/);
});

test("the homepage reveals its sections on scroll, and never traps content", async ({
  browser,
}) => {
  // Motion has to be asked for: headless Chromium reports
  // prefers-reduced-motion: reduce by default, and the reveals correctly turn
  // themselves off under it — so the default context sees no effect at all.
  const context = await browser.newContext({ reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.goto("/");

  const hidden = () =>
    page.evaluate(
      () =>
        [...document.querySelectorAll(".ffu-reveal")].filter(
          (el) => getComputedStyle(el).opacity === "0",
        ).length,
    );

  // Polled, not read once: the hidden state is applied on mount, so it does not
  // exist in the HTML the navigation resolves with. Something below the fold
  // must start hidden, or there is no effect here at all.
  await expect.poll(hidden, { timeout: 5000 }).toBeGreaterThan(5);

  // Read the page the way a visitor does, then let the last transition finish.
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(120);
  }

  // The failure this guards against is content that never arrives: a section
  // stuck at opacity 0 is invisible but still in the layout, so nothing else
  // looks wrong.
  await expect.poll(hidden, { timeout: 5000 }).toBe(0);
  await context.close();
});

test("reduced motion turns the reveals off rather than speeding them up", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");

  // Nothing is armed at all: no element is ever hidden waiting for a scroll.
  await expect(page.locator(".ffu-reveal")).toHaveCount(0);
  await context.close();
});

test("the homepage content is visible with JavaScript disabled", async ({ browser }) => {
  // The reveal state is applied on mount, never in the server HTML. If that
  // ever inverts, a failed bundle takes the whole page's content with it.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page.locator(".ffu-reveal")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Shop by category" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "New arrivals" })).toBeVisible();
  await context.close();
});

test("every Instagram link carries the brand gradient, readable in white", async ({
  page,
}) => {
  // Instagram's own gradient runs from pale yellow to blue, and white label text
  // on the warm end measures ~2.4:1 — well under AA. The palette here is
  // weighted to the pink-purple-blue half to clear it, which is easy to undo by
  // "restoring" the real thing, so the stops are checked rather than trusted.
  const contrastVsWhite = (r: number, g: number, b: number) => {
    const channel = (c: number) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const luminance =
      0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    return 1.05 / (luminance + 0.05);
  };

  for (const route of ["/", "/contact", "/reviews", "/product/lace-pot"]) {
    await page.goto(route);

    // The action buttons, not every link that happens to point at Instagram —
    // the feed's photo tiles link there too and are meant to look like photos.
    const links = page.locator("a.btn-instagram");
    const count = await links.count();
    expect(count, `Instagram buttons on ${route}`).toBeGreaterThan(0);

    // And none of them has been quietly returned to the old plain treatment.
    await expect(
      page.locator('a[href*="instagram.com"].btn-ghost'),
      `${route} still has a plain Instagram button`,
    ).toHaveCount(0);

    for (let i = 0; i < count; i++) {
      const background = await links
        .nth(i)
        .evaluate((el) => getComputedStyle(el).backgroundImage);

      expect(background, `${route} link ${i} has the gradient`).toContain("gradient");

      // Every stop must clear AA on its own; a blend of two passing colours
      // stays between them, so the whole sweep clears it too.
      const stops = [...background.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)];
      expect(stops.length, `${route} link ${i} colour stops`).toBeGreaterThan(1);

      for (const [, r, g, b] of stops) {
        const ratio = contrastVsWhite(Number(r), Number(g), Number(b));
        expect(
          ratio,
          `${route} link ${i}: white on rgb(${r},${g},${b}) is ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
});

test("an offer shows the old price struck through beside the new one", async ({ page }) => {
  await page.goto("/offers");

  const card = page.locator("article").first();
  await expect(card).toBeVisible();

  // Three things have to agree, or the discount is not believable: the price
  // paid, the price it replaces, and the percentage between them.
  const struck = card.locator(".line-through").first();
  await expect(struck).toBeVisible();

  const rupees = (text: string) => Number(text.replace(/[^0-9]/g, ""));
  const was = rupees((await struck.innerText()).trim());
  const chip = await card.getByText(/\d+% off/).first().innerText();
  const percent = Number(chip.replace(/[^0-9]/g, ""));

  // The current price is the first rupee figure in the block, before the struck one.
  const block = await struck.locator("xpath=..").innerText();
  const now = rupees(block.split("₹")[1] ?? "");

  expect(now, "the sale price is lower than the original").toBeLessThan(was);
  expect(
    Math.round(((was - now) / was) * 100),
    `the badge says ${percent}% and the prices say otherwise`,
  ).toBe(percent);

  // The struck price must be announced as a former price, not read out as if
  // it were what you pay.
  await expect(struck).toHaveAttribute("aria-label", /^Was ₹/);
});

test("a discounted product quotes the sale price everywhere on its page", async ({
  page,
}) => {
  await page.goto("/offers");
  const href = await page
    .locator("article a[href^='/product/']")
    .first()
    .getAttribute("href");
  await page.goto(href!);

  const struck = page.locator("main .line-through").first();
  await expect(struck).toBeVisible();

  // The campaign is named and dated, so the discount can be checked rather than
  // taken on trust.
  await expect(page.getByRole("link", { name: /Sale|Offer|Clearance/ }).first()).toBeVisible();

  // The enquiry itself has to carry the price the customer is looking at.
  // Without it the shop opens a chat about a product with no figure attached,
  // quotes the everyday rate, and the customer argues the discount they just saw.
  const enquire = page.locator('main a[href^="https://wa.me/"]').first();
  // searchParams, not decodeURIComponent: the message is form-encoded, so the
  // latter leaves every space as a "+" and no assertion about wording matches.
  const wa =
    new URL((await enquire.getAttribute("href")) ?? "").searchParams.get("text") ?? "";
  const wasPrice = (await struck.innerText()).trim();

  expect(wa, "the enquiry does not mention the sale price").toContain("Seen on the website at");
  expect(wa, "the old price is not marked as the old one").toContain(`was ${wasPrice}`);

  // And the sticky bar a phone shows quotes the same figure, not the old one.
  const nowPrice = (await page.locator("main .line-through").first().locator("xpath=..").innerText())
    .split("₹")[1]
    ?.split(/\s/)[0];
  expect(wa, "the enquiry quotes a different price from the page").toContain(`₹${nowPrice}`);
});

test("action buttons wear the icon of the thing they open", async ({ page }) => {
  await page.goto("/product/lace-pot");

  // "Call the shop" carried a WhatsApp mark, promising the wrong app. Each
  // button's icon is checked against its href rather than its label.
  // Matched on accessible name, which for the WhatsApp button is its aria-label
  // ("Enquire about <product> on WhatsApp") rather than its visible text.
  const rows: [RegExp, RegExp][] = [
    [/^Enquire about .* on WhatsApp$/, /^https:\/\/wa\.me\//],
    [/^Call the shop$/, /^tel:/],
    [/^DM on Instagram$/, /^https:\/\/ig\.me\/m\//],
  ];

  for (const [name, href] of rows) {
    const link = page.getByRole("link", { name }).first();
    await expect(link, `${name} exists`).toBeVisible();
    expect(await link.getAttribute("href"), `${name} points at the right app`).toMatch(href);
  }

  // A tel: link has no browsing context to open, so it must not target a new tab.
  const call = page.getByRole("link", { name: "Call the shop" }).first();
  expect(await call.getAttribute("target"), "tel: opened a blank tab").toBeNull();
});

test("the story button says it downloads a file, not that it posts for you", async ({
  page,
}) => {
  await page.goto("/product/lace-pot");

  // The old label, "Save as Instagram Story", read as though the site would put
  // the product on the customer's own story. It cannot: it makes a PNG.
  await expect(page.getByRole("button", { name: /Instagram Story/i })).toHaveCount(0);

  const button = page.getByRole("button", { name: /Download story image/i });
  await expect(button).toBeVisible();
  await expect(page.getByText(/You post it yourself/i)).toBeVisible();
});

test("the homepage offer card announces itself as one campaign, not its whole text", async ({
  page,
}) => {
  await page.goto("/");

  // The whole banner is a single link. Without an explicit name it announced as
  // its entire contents run together — "Ends in 14d 9h 47m20% offGanesh Puja
  // SaleFestive lamps, torans…" — which no screen-reader user can act on.
  const card = page.locator('a[href^="/offers#"]').first();
  const name = (await card.getAttribute("aria-label")) ?? "";
  expect(name, "the card link has no name of its own").toMatch(/see this offer$/);
  expect(name.length, "the name is the whole card again").toBeLessThan(80);

  // And it lands on that campaign rather than the top of a page listing several.
  const href = (await card.getAttribute("href"))!;
  await page.goto(href);
  const anchor = href.split("#")[1];
  await expect(page.locator(`#${anchor}`)).toBeVisible();
});
