import { test, expect, type Page } from "@playwright/test";
import { PUBLIC_ROUTES, loadLazyImages, reseed } from "./helpers";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PDFDocument } from "pdf-lib";
import { photoJpeg } from "../src/lib/pdf-photos";
import { brandFonts, brandLogoPng, BRAND } from "../src/lib/pdf-brand";
import { sanitise } from "../src/lib/pdf-text";
import { imageProps } from "../src/lib/image";

/** Any real product photo on disk, for the converter test below. */
function realPhotoFile(): string {
  const dir = path.join(process.cwd(), "public", "img", "products");
  const file = fs.readdirSync(dir).find((f) => f.endsWith(".webp"));
  if (!file) throw new Error("no product photos in public/img/products");
  return file;
}

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

test("the sort options order the grid correctly, and a retired one still loads", async ({
  page,
}) => {
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
  expect(up).not.toEqual(down);

  await page.goto("/catalogue?sort=newest");
  const newest = await gridNames(page);
  expect(newest.length).toBeGreaterThan(1);

  // Only three sorts are offered now; nobody shops décor alphabetically.
  const offered = await page.$$eval("select#catalogue-sort option", (o) => o.map((e) => e.textContent!.trim()));
  expect(offered).toEqual(["Newest first", "Price: low to high", "Price: high to low"]);

  // A link someone bookmarked or sent on WhatsApp while A-Z existed must still
  // open the catalogue, not break it — it falls back to the default order.
  await page.goto("/catalogue?sort=name-asc");
  expect(await gridNames(page)).toEqual(newest);
});

test("each quick filter narrows the set to its own products", async ({ page }) => {
  await page.goto("/catalogue");
  const all = await resultCount(page);

  await page.goto("/catalogue?new=1");
  const isNew = await resultCount(page);

  await page.goto("/catalogue?offer=1");
  const onOffer = await resultCount(page);

  await page.goto("/catalogue?limited=1");
  const limited = await resultCount(page);

  expect(isNew).not.toBe(all);
  expect(onOffer).not.toBe(all);
  expect(limited).not.toBe(all);
  expect(isNew).not.toBe(onOffer);

  // The stock filter must actually mean stock: every card in it says so.
  // (resultCount returns the whole "N products · page 1 of 1" line.)
  expect(Number.parseInt(String(limited), 10)).toBeGreaterThan(0);
  const cards = page.locator("article");
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    await expect(
      cards.nth(i).getByText("Limited", { exact: true }),
      `card ${i} in the limited filter`,
    ).toBeVisible();
  }

  // And it is reachable by pressing the button, not only by typing the URL.
  await page.goto("/catalogue");
  await page.getByRole("button", { name: "Limited stock" }).click();
  await expect.poll(() => resultCount(page)).toBe(limited);
  expect(new URL(page.url()).searchParams.get("limited")).toBe("1");
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

test("paging through the catalogue never repeats or loses a product", async ({ page }) => {
  // The catalogue sorts "Newest first" by createdAt, and two seeded products
  // share one to the millisecond. With no further sort key Postgres may return
  // tied rows in either order, and it is not obliged to choose the same order
  // twice — so with LIMIT/OFFSET paging on top, one product shows up on both
  // page 1 and page 2 while another is never shown at all. Every sort now ends
  // on id, which makes the order total.
  //
  // Walks the whole catalogue rather than the first few pages: the fault only
  // shows when a tie happens to straddle a page boundary, so the more
  // boundaries this crosses the more reliably it catches a regression. It
  // checks an invariant that must hold regardless — every product, exactly
  // once, across all pages.
  const hrefsOn = () =>
    page
      .getByRole("main")
      .locator('a[href^="/product/"]')
      .evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute("href")!))]);

  await page.goto("/catalogue");
  const total = Number((await resultCount(page)).match(/\d+/)![0]);
  expect(total, "no products in the catalogue to page through").toBeGreaterThan(0);

  const first = await hrefsOn();
  const pageSize = first.length;
  const pageCount = Math.ceil(total / pageSize);

  const all = [...first];
  for (let n = 2; n <= pageCount; n++) {
    await page.goto(`/catalogue?page=${n}`);
    all.push(...(await hrefsOn()));
  }

  const duplicated = [...new Set(all.filter((href, i) => all.indexOf(href) !== i))];
  expect(duplicated, "a product appeared on more than one page").toEqual([]);
  expect(new Set(all).size, "paging did not reach every product").toBe(total);

  // And the order is the same on a second request, not merely internally
  // consistent within one.
  await page.goto("/catalogue?page=1");
  expect(await hrefsOn(), "page 1 came back in a different order").toEqual(first);
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

test("the catalogue PDF is a photo catalogue, one product to a page", async ({ page }) => {
  // The PDF used to be a dense text table. The shop's own supplier catalogue
  // is a page per product with the photograph on it, and that is what their
  // customers are used to being sent, so this one is too. The two things that
  // can silently regress are the photographs disappearing (pdf-lib embeds
  // JPEG and PNG only, and every product photo here is .webp, so a broken
  // conversion step yields a valid PDF with nothing in it) and the layout
  // quietly collapsing back to many products per page.
  await page.goto("/categories/lamps-diyas");
  const products = new Set(
    await page.locator('a[href^="/product/"]').evaluateAll((links) =>
      links.map((a) => a.getAttribute("href")),
    ),
  ).size;
  expect(products, "no products to build a catalogue from").toBeGreaterThan(0);

  const response = await page.request.get("/api/catalogue-pdf?category=lamps-diyas");
  expect(response.status()).toBe(200);
  const body = await response.body();

  // A JPEG inside a PDF is an image stream filtered with /DCTDecode. Counting
  // them is the cheapest honest way to ask "are there photographs in here".
  const streams = body.toString("latin1").match(/\/DCTDecode/g) ?? [];
  expect(streams.length, "the PDF has no embedded photographs").toBeGreaterThan(0);

  // Read back with the same library that wrote it rather than parsing bytes:
  // pdf-lib stores the page tree in compressed object streams, so the page
  // count is not greppable.
  const doc = await PDFDocument.load(body);
  expect(
    doc.getPageCount(),
    "fewer pages than products — the one-product-per-page layout is gone",
  ).toBeGreaterThanOrEqual(products + 1);
});

test("a photo that cannot be read is skipped, not fatal", async () => {
  // A product whose photo is missing still belongs in the catalogue; its page
  // draws a "Photo coming soon" panel. These are the three answers the
  // converter has to get right for that to hold.
  const real = await photoJpeg("/img/products/" + realPhotoFile());
  expect(real, "a real product photo failed to convert").not.toBeNull();
  // JPEG's magic number. Proves it converted rather than passing .webp through
  // for pdf-lib to reject at embed time.
  expect(real!.subarray(0, 3).toString("hex")).toBe("ffd8ff");

  expect(await photoJpeg("/img/products/definitely-not-here.webp")).toBeNull();

  // Image URLs are admin-entered text, so this is a path the shop could type.
  // Deliberately points at a REAL image that lives outside /public: aimed at
  // /etc/passwd the test would pass either way, since sharp rejects a file
  // that is not an image and the guard never gets the credit.
  expect(
    await photoJpeg("/../data/categories/pots-vases.webp"),
    "a file outside /public was read",
  ).toBeNull();
});

test("downloading a subcategory gives that subcategory only", async ({ page }) => {
  // The whole point of the per-category download is that the shop answers one
  // enquiry with one file. A filtered page whose download quietly ignores the
  // filter is worse than no download: nobody reports it, they just stop using
  // it and go back to sending photos one at a time.
  await page.goto("/categories/lights-lighting-decor");
  const chip = page.locator('nav[aria-label="Filter by type"] a').nth(1);
  const chipText = (await chip.innerText()).replace(/\s+/g, " ").trim();
  const chipCount = Number(chipText.match(/(\d+)\s*$/)![1]);
  const sub = new URL((await chip.getAttribute("href"))!, "http://x").searchParams.get("sub")!;

  const whole = await PDFDocument.load(
    await (await page.request.get("/api/catalogue-pdf?category=lights-lighting-decor")).body(),
  );
  const res = await page.request.get(`/api/catalogue-pdf?category=lights-lighting-decor&sub=${sub}`);
  expect(res.status()).toBe(200);
  const only = await PDFDocument.load(await res.body());

  // One page per product, plus a cover and at least one price-list page. The
  // upper bound is what catches a download that ignored ?sub= and returned the
  // category: that PDF has a page per product in the whole category.
  expect(only.getPageCount()).toBeGreaterThanOrEqual(chipCount + 2);
  expect(
    only.getPageCount(),
    "the subcategory download returned more than that subcategory",
  ).toBeLessThan(whole.getPageCount());

  // And it is named for what it holds: a shop sending three of these in one
  // WhatsApp thread cannot have them all called the same thing.
  expect(res.headers()["content-disposition"]).toContain(`-${sub}-`);
});

test("the download button follows the subcategory filter on screen", async ({ page }) => {
  await page.goto("/categories/lights-lighting-decor");
  // Scoped to main: the footer carries a whole-catalogue link of its own.
  const link = page.getByRole("main").getByRole("link", { name: /Download this category/i });
  await expect(link).toHaveAttribute("href", "/api/catalogue-pdf?category=lights-lighting-decor");

  const chip = page.locator('nav[aria-label="Filter by type"] a').nth(1);
  const sub = new URL((await chip.getAttribute("href"))!, "http://x").searchParams.get("sub")!;
  await chip.click();

  // The chip is a <Link>, so click() returns before the navigation lands and
  // the button is still the unfiltered one for a moment. Waiting for the URL
  // and asserting with a retrying matcher is the difference between a test
  // that passes locally and one that passes on a slower CI runner.
  await page.waitForURL(new RegExp(`[?&]sub=${sub}(&|$)`));
  const filtered = page.getByRole("main").getByRole("link", { name: /^Download /i });
  await expect(filtered).toHaveAttribute(
    "href",
    `/api/catalogue-pdf?category=lights-lighting-decor&sub=${sub}`,
  );
});

test("a bad subcategory download is a bad link, not a catalogue of nothing", async ({ request }) => {
  // A subcategory slug is only unique inside its category — "Hanging" exists
  // under both Lights and Artificial Flowers — so one on its own names nothing.
  expect((await request.get("/api/catalogue-pdf?sub=jhumar")).status()).toBe(400);
  // Real category, subcategory that is not in it.
  expect(
    (await request.get("/api/catalogue-pdf?category=lights-lighting-decor&sub=not-a-real-one"))
      .status(),
  ).toBe(404);
});

test("the catalogue PDF carries the shop's own fonts and logo", async () => {
  // These are read off disk at request time. If they are ever missing from the
  // deployed bundle the route still returns a valid PDF — it just quietly
  // loses the branding — so the check is that the inputs are really there.
  const faces = await brandFonts();
  for (const [name, bytes] of Object.entries(faces)) {
    expect(bytes.length, `${name} is empty`).toBeGreaterThan(1000);
    // TrueType's magic number. Catches a woff2 or an HTML error page sitting
    // where a font should be, which pdf-lib would only reject at embed time.
    expect(bytes.subarray(0, 4).toString("hex"), `${name} is not a TTF`).toBe("00010000");
  }

  const logo = await brandLogoPng(BRAND.rose600, 220);
  expect(logo, "the logo did not rasterise").not.toBeNull();
  expect(logo!.subarray(1, 4).toString(), "the logo is not a PNG").toBe("PNG");
});

test("the catalogue prints the shop's own words, accents and all", () => {
  // This was a real defect. The standard PDF fonts are WinAnsi-encoded, so
  // every string was stripped to ASCII first and all 53 pages of this category
  // were headed "LIGHTS & LIGHTING DCOR".
  expect(sanitise("Lights & Lighting Décor")).toBe("Lights & Lighting Décor");

  // Punctuation above U+017F has to be mapped rather than dropped, or the
  // shop's opening hours print as "Mon  Sat, 10:00 AM  8:00 PM".
  expect(sanitise("Mon – Sat, 10:00 AM – 8:00 PM")).toBe("Mon - Sat, 10:00 AM - 8:00 PM");
  expect(sanitise("5 ft × 8 ft")).toBe("5 ft x 8 ft");
  expect(sanitise("we’ll confirm")).toBe("we'll confirm");

  // The rupee sign sits outside the embedded subsets, and pdf-lib throws at
  // draw time rather than embed time — so a stray one would be a 500 on a
  // download rather than a wrong character.
  expect(sanitise("₹1,200")).toBe("Rs 1,200");
  expect(sanitise("商品")).toBe("");
});

test("no page asks the image optimizer for a width it never displays", async ({ page }) => {
  // The catalogue holds 920 photographs and every one was going through the
  // optimizer on the stock width ladder, which tops out at 3840 — upscales of
  // sources whose median width is 577px. The plain `src`, which is what any
  // consumer that does not read a srcset fetches, was pinned at w=3840 for all
  // of them.
  //
  // Image transformations are metered by the host. A finite monthly allowance
  // spent on widths nothing renders runs out, and when it does /_next/image
  // stops serving and the photographs disappear from the live site until the
  // meter resets. That is what "sometimes the photos don't render" was, and
  // nothing about the product data was ever involved in it.
  //
  // The ceiling is the widest source photograph in the catalogue: 1440px.
  const MAX = 1440;

  for (const route of ["/", "/catalogue", "/categories", "/categories/pots-vases", "/product/lace-pot"]) {
    await page.goto(route);
    const { widths, fallbacks } = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll<HTMLImageElement>('img[src*="_next/image"], img[srcset*="_next/image"]')];
      const widthOf = (url: string) => Number(new URL(url, location.origin).searchParams.get("w"));
      return {
        widths: imgs.flatMap((i) =>
          (i.getAttribute("srcset") ?? "")
            .split(",")
            .map((part) => part.trim().split(" ")[0])
            .filter((u) => u.includes("_next/image"))
            .map(widthOf),
        ),
        fallbacks: imgs
          .map((i) => i.getAttribute("src") ?? "")
          .filter((u) => u.includes("_next/image"))
          .map(widthOf),
      };
    });

    const tooWide = [...new Set(widths.filter((w) => w > MAX))];
    expect(tooWide, `${route} offers widths nothing on the page renders`).toEqual([]);
    const bigFallback = [...new Set(fallbacks.filter((w) => w > MAX))];
    expect(bigFallback, `${route} has a fallback src above ${MAX}px`).toEqual([]);
  }
});

test("a product photograph is shown whole, and at full quality", async ({ page }) => {
  // Half this catalogue is photographed portrait — pots, light stands and
  // garlands are tall things. Fitting a portrait photo into a landscape or
  // square box with object-cover crops the top and bottom off the item:
  // measured across all 920 photographs it was cutting away a median of 35% on
  // the card and 25% on the product page, and more than 40% from 426 of them.
  // The customer was deciding whether to enquire from the middle third of the
  // product.
  const fitOf = (selector: string) =>
    page.locator(selector).first().evaluate((el) => getComputedStyle(el).objectFit);

  await page.goto("/categories/pots-vases");
  expect(
    await fitOf("article .aspect-square img"),
    "the product card is cropping the item again",
  ).toBe("contain");

  const href = await page.locator('a[href^="/product/"]').first().getAttribute("href");
  await page.goto(href!);
  expect(
    await fitOf("main .aspect-square img"),
    "the product page is cropping the item again",
  ).toBe("contain");

  // And the re-encode must not band the gradients. These are already-lossy
  // webp files and most of the stock is glossy, so the optimizer's default 75
  // is a visible second loss — obvious against the source at 2x on a card.
  //
  // Asserted on the helper rather than the rendered page: the seeded catalogue
  // carries placeholder SVGs, which next/image serves untouched, so no product
  // on a seeded page goes through the optimizer at all.
  expect(imageProps("/img/products/3107.webp", 560).quality).toBe(90);
  // A pasted remote URL is still passed through rather than proxied.
  expect(imageProps("https://example.com/x.jpg", 560).unoptimized).toBe(true);
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

  const photo = card.locator("img").first();
  const before = await photo.getAttribute("src");

  // No force and no click-until-it-takes here. The arrows are rendered by the
  // gallery only once it has mounted on the client, so the count assertion
  // above is the wait for hydration: by this line a click reaches React's
  // handler, and a plain click also proves the button is genuinely reachable
  // rather than sitting under something.
  await next.click();

  // The photo changes and the card's link does not fire — the arrows sit inside
  // a linked card, so a stray navigation is the obvious failure here.
  await expect(photo).not.toHaveAttribute("src", before!);
  expect(new URL(page.url()).pathname).toBe("/catalogue");

  // A product with a single photo gets no controls at all.
  await expect(
    page.getByRole("button", { name: /^Next photo of Velvet Backdrop/ }),
  ).toHaveCount(0);
});

test("the photo arrows are never served dead in the markup", async ({ page }) => {
  // The arrows only work once React has attached to them. Shipping them in the
  // server HTML puts a control on screen that ignores the first presses of
  // anyone on a slow connection, so the markup must not carry them at all.
  const html = await (await page.request.get("/catalogue")).text();
  expect(html).toContain("Dry Flower Bunch");
  expect(html).not.toContain("Next photo of");
});

test("the campaign banners carry no words of their own", async ({ page }) => {
  // The banner sits directly under the campaign's real title, discount badge
  // and countdown. Artwork that spells out a headline of its own either says
  // the same thing twice or, worse, contradicts it once a campaign is renamed
  // — which is exactly how the old placeholders ended up reading "Seasonal
  // Offer" under a heading that said something else.
  const dir = path.join(process.cwd(), "public", "img", "offers");
  const banners = fs.readdirSync(dir).filter((f) => f.endsWith(".svg"));
  expect(banners.length).toBeGreaterThan(0);
  for (const file of banners) {
    const svg = fs.readFileSync(path.join(dir, file), "utf8");
    expect(svg, `${file} draws text`).not.toMatch(/<text[\s>]/);
  }

  // And on the page itself it is announced as decoration, not described.
  await page.goto("/offers");
  const banner = page.locator('img[src*="/img/offers/"]').first();
  await expect(banner).toHaveCount(1);
  await expect(banner).toHaveAttribute("alt", "");
});

test("a reseed never overwrites real artwork", async () => {
  // The seed regenerates the placeholder art on every run, local and CI. Once
  // the owner drops a real photo or a drawn banner at one of those paths, that
  // regeneration must leave it alone — otherwise the file appears to revert by
  // itself, which is exactly what happened to the campaign banners.
  const file = path.join(process.cwd(), "public", "img", "categories", "lamps-diyas.svg");
  const original = fs.readFileSync(file);
  const real = '<svg xmlns="http://www.w3.org/2000/svg"><!-- a real photo would go here --></svg>';
  try {
    fs.writeFileSync(file, real);
    execFileSync(process.execPath, [
      "scripts/generate-placeholder-art.mjs",
      JSON.stringify([{ slug: "lamps-diyas", short: "Lamps" }]),
    ]);
    expect(fs.readFileSync(file, "utf8")).toBe(real);
  } finally {
    fs.writeFileSync(file, original);
  }
});

test("every page shares with a preview image messengers can actually render", async ({
  page,
}) => {
  // WhatsApp is how this shop's links travel, and WhatsApp renders no SVG. The
  // product pages used to point og:image straight at the product photo, which
  // is an SVG placeholder — so a forwarded link previewed with no image at all,
  // while the tag looked perfectly present. Every page must offer a raster
  // card, and it must actually load.
  for (const route of ["/", "/catalogue", "/offers", "/product/dry-flower-bunch-assorted"]) {
    await page.goto(route);
    const src = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute("content");
    expect(src, `${route} has no og:image`).toBeTruthy();
    expect(src!.toLowerCase(), `${route} shares an SVG`).not.toContain(".svg");

    const res = await page.request.get(src!);
    expect(res.status(), `${route} og:image did not load`).toBe(200);
    expect(res.headers()["content-type"], `${route} og:image is not an image`).toMatch(
      /^image\/(png|jpeg|webp)/,
    );
  }
});

test("the shop describes itself to search engines, on every page", async ({ page }) => {
  // A local shop's whole search story is "there is a business in Dhanbad, at
  // this address, on this phone number". The product pages described their
  // products; nothing described the shop.
  for (const route of ["/", "/catalogue", "/contact", "/product/dry-flower-bunch-assorted"]) {
    await page.goto(route);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const shop = blocks.map((b) => JSON.parse(b)).find((b) => b["@type"] === "Store");
    expect(shop, `${route} carries no Store block`).toBeTruthy();
    expect(shop.address.addressLocality).toBeTruthy();
    expect(shop.address.addressCountry).toBe("IN");
    expect(shop.telephone).toBeTruthy();

    // Free-text opening hours must never be published as if they were the
    // machine format: a wrong answer in a field search engines act on is worse
    // than no answer.
    expect(shop.openingHours).toBeUndefined();
  }

  // And the trail above a product, which is what a result shows instead of a
  // bare URL.
  await page.goto("/product/dry-flower-bunch-assorted");
  const crumbs = (
    await page.locator('script[type="application/ld+json"]').allTextContents()
  )
    .map((b) => JSON.parse(b))
    .find((b) => b["@type"] === "BreadcrumbList");
  expect(crumbs).toBeTruthy();
  expect(crumbs.itemListElement).toHaveLength(3);
  expect(crumbs.itemListElement[0].name).toBe("Home");
  expect(crumbs.itemListElement[2].name).toContain("Dry Flower Bunch");
});

test("every indexable page names its canonical URL", async ({ page }) => {
  // The catalogue links to a lot of its own filter, sort and page combinations.
  // Without this they compete with each other as separate near-identical
  // results for the same inventory.
  for (const route of ["/", "/catalogue", "/categories", "/offers", "/contact", "/about"]) {
    await page.goto(route);
    const href = await page
      .locator('link[rel="canonical"]')
      .first()
      .getAttribute("href");
    expect(href, `${route} has no canonical`).toBeTruthy();
  }

  await page.goto("/catalogue?category=lamps-diyas&sort=price-asc&page=2");
  const canonical = await page.locator('link[rel="canonical"]').first().getAttribute("href");
  expect(new URL(canonical!).pathname).toBe("/catalogue");
  expect(new URL(canonical!).search).toBe("");
});

test("the product actions line up instead of staggering down the page", async ({
  page,
}) => {
  // Left to wrap, these five buttons sized themselves to their labels and broke
  // into a staircase — one wide, then two, then one, then one — which reads as
  // five unrelated things rather than one set of actions.
  for (const width of [320, 360, 393, 414]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/product/foam-rose-garland-lardi");

    const row = page.locator("#product-actions");
    const boxes = await row.evaluate((el) =>
      [...el.children].map((c) => {
        const r = c.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
      }),
    );
    expect(boxes.length, `${width}px: five actions`).toBe(5);

    const [primary, ...secondary] = boxes;
    const widths = secondary.map((b) => b.w);
    expect(
      Math.max(...widths) - Math.min(...widths),
      `${width}px: the four secondary buttons are one size`,
    ).toBeLessThanOrEqual(1);
    expect(primary.w, `${width}px: the main action is the widest`).toBeGreaterThan(widths[0]);

    // Two per row, so four secondary buttons make exactly two rows.
    const rows = new Set(secondary.map((b) => b.top));
    expect(rows.size, `${width}px: secondary actions form two rows`).toBe(2);

    // No label wrapping to a second line, which is what made rows uneven.
    const heights = boxes.map((b) => b.h);
    expect(
      Math.max(...heights) - Math.min(...heights),
      `${width}px: no button is taller than the rest`,
    ).toBeLessThanOrEqual(1);
  }
});

test("a shopper can take away one category instead of the whole catalogue", async ({
  page,
}) => {
  // Most enquiries are about one kind of thing. Sending 97 products to answer
  // "what backdrops do you have" is a lot to scroll on a phone.
  await page.goto("/categories/lamps-diyas");
  // Scoped to main: the footer carries a whole-catalogue link of its own.
  const link = page.getByRole("main").getByRole("link", { name: /Download this category/i });
  await expect(link).toBeVisible();
  expect(await link.getAttribute("href")).toBe("/api/catalogue-pdf?category=lamps-diyas");

  const one = await page.request.get("/api/catalogue-pdf?category=lamps-diyas");
  expect(one.status()).toBe(200);
  expect(one.headers()["content-type"]).toContain("application/pdf");
  // Named for the category: a shop sending four of these in one thread cannot
  // have them all called the same thing.
  expect(one.headers()["content-disposition"]).toContain("floralforu-lamps-diyas-");

  const all = await page.request.get("/api/catalogue-pdf");
  expect(all.status()).toBe(200);
  expect((await one.body()).length, "one category is smaller than the lot").toBeLessThan(
    (await all.body()).length,
  );

  // A bad slug is a bad link, not a catalogue of nothing.
  expect((await page.request.get("/api/catalogue-pdf?category=no-such-thing")).status()).toBe(404);

  // And the catalogue's own button follows the filter.
  await page.goto("/catalogue?category=lamps-diyas");
  // Scoped to the page body: the footer carries a whole-catalogue link too.
  const filtered = page.getByRole("main").getByRole("link", { name: /Download .* PDF/i });
  expect(await filtered.getAttribute("href")).toBe("/api/catalogue-pdf?category=lamps-diyas");
  await page.goto("/catalogue");
  expect(
    await page
      .getByRole("main")
      .getByRole("link", { name: /Download catalogue PDF/i })
      .getAttribute("href"),
  ).toBe("/api/catalogue-pdf");
});

test("the longest category name does not push the catalogue sideways", async ({
  page,
}) => {
  // The per-category download button carries the category's own name, and the
  // longest one — "Gift Boxes, Trays, Bags & Baskets" — is wider than a phone.
  // Pinned to one line it made the whole page scroll horizontally.
  const longest = "gift-boxes-trays-bags-baskets";
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/catalogue?category=${longest}`);
    await expect(
      page.getByRole("main").getByRole("link", { name: /Download .* PDF/i }),
    ).toBeVisible();
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, `no sideways scroll at ${width}px`).toBeLessThanOrEqual(clientWidth);
  }
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

test("every Instagram link is recognisably Instagram, and readable", async ({
  page,
}) => {
  // These buttons used to be filled with Instagram's gradient. Three saturated
  // fills in one row of actions read as loud rather than branded, and white
  // text over the warm end of that palette measured ~2.4:1, so the gradient had
  // to stay anchored just so to clear AA at all. The surface is quiet now and
  // the brand lives in the glyph.
  const contrast = (fg: number[], bg: number[]) => {
    const lum = ([r, g, b]: number[]) => {
      const ch = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
    };
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
  };
  const rgb = (v: string) => [...v.matchAll(/\d+/g)].slice(0, 3).map(Number);

  for (const route of ["/", "/contact", "/reviews", "/product/lace-pot"]) {
    await page.goto(route);

    const links = page.locator("a.btn-instagram");
    const count = await links.count();
    expect(count, `Instagram buttons on ${route}`).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);

      // The mark, painted in Instagram's gradient. This is the part that says
      // which service the button opens, so it has to be there and it has to be
      // painted — the gradient was once defined inside the header's button,
      // which is display:none on a phone, and a paint server inside a hidden
      // subtree renders nothing: an invisible icon on a visible button.
      const glyph = link.locator("svg").first();
      await expect(glyph, `${route} link ${i} has a glyph`).toHaveCount(1);
      const stroke = await glyph.evaluate((el) => getComputedStyle(el).stroke);
      expect(stroke, `${route} link ${i} glyph paint`).toContain("ffu-ig");

      const { colour, background } = await link.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { colour: cs.color, background: cs.backgroundColor };
      });
      const ratio = contrast(rgb(colour), rgb(background));
      expect(
        ratio,
        `${route} link ${i}: label contrast is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  }

  // And the gradient itself is defined once, somewhere that is never hidden.
  await page.goto("/");
  const def = page.locator("#ffu-ig");
  await expect(def).toHaveCount(1);
  const hidden = await def.evaluate((el) => {
    let node: Element | null = el.closest("svg");
    while (node) {
      if (getComputedStyle(node).display === "none") return true;
      node = node.parentElement;
    }
    return false;
  });
  expect(hidden, "the gradient must not be defined inside a hidden element").toBe(false);
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

  const button = page.getByRole("button", { name: /^Download details/i });
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

test("category cards show their real cover even when the database still holds the seeded placeholder", async ({ page }) => {
  // The seed stores /img/categories/<slug>.svg on every category, which is
  // exactly the state a long-running database is in: the cover files shipped
  // later, but nothing rewrote the stored URLs. The cards must resolve to the
  // covers anyway, or the photographs never appear on the live site.
  for (const path of ["/", "/categories"]) {
    await page.goto(path);
    await loadLazyImages(page);

    // Scoped to category cards by the link they wrap. Seeded demo products
    // also carry /img/categories/*.svg as their photo, so a selector on the
    // URL alone matches product cards too and proves nothing.
    const srcs = await page
      .locator('article:has(a[href^="/categories/"]) img')
      .evaluateAll((imgs) => imgs.map((i) => decodeURIComponent((i as HTMLImageElement).src)));

    expect(srcs.length, `${path} should render category cards`).toBeGreaterThan(0);
    const placeholders = srcs.filter((s) => /\/img\/categories\/[a-z0-9-]+\.svg/.test(s));
    expect(placeholders, `${path} still renders placeholder artwork`).toEqual([]);
    expect(srcs.some((s) => s.includes("-cover.webp"))).toBe(true);
  }
});

test("an Instagram photo opens in place instead of leaving the site", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.locator('section[aria-labelledby="instagram-heading"]');
  await section.scrollIntoViewIfNeeded();

  const tiles = section.locator("ul button");
  const count = await tiles.count();
  expect(count, "no photo tiles to click").toBeGreaterThan(0);

  // Every tile used to be an <a> to instagram.com, so a customer could not
  // look at one of the shop's own photos without being sent off the site. The
  // one link out is the "Open Instagram" button beside the heading.
  await expect(section.locator('ul a[href*="instagram.com"]')).toHaveCount(0);
  await expect(section.locator("a.btn-instagram")).toHaveCount(1);

  const before = page.url();
  await tiles.first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(page.url(), "clicking a photo navigated away").toBe(before);

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

// A retina screen asks for twice the pixels, which is where the stretching
// actually showed -- at the default scale factor of 1 the old layout came out
// at 0.94 of what it needed and this test passed while the photos were visibly
// blurry on the shop owner's Mac. Checked by reverting the layout: at 2x the
// old sizing fails this, at 1x it does not.
test.describe("on a retina screen", () => {
  test.use({ deviceScaleFactor: 2 });

  test("the Instagram photos are not blown up past what the files hold", async ({
    page,
  }) => {
    // These are frames from the shop's reels at 335px across. The section used
    // to draw them three-across at ~360 CSS px, which on a retina screen asked
    // 720 device pixels of a 335-pixel file — that, not the files, is why they
    // looked blurry. A little over 1:1 is invisible; a factor of two is not.
    await page.goto("/");
    const section = page.locator('section[aria-labelledby="instagram-heading"]');

    // Deliberately not loadLazyImages(): it scrolls to the bottom and back to
    // the top, which puts this section out of view again before the browser
    // has started fetching anything, and all five tiles then sit at
    // complete=false with currentSrc="" forever. Scroll to it and stay there.
    await section.scrollIntoViewIfNeeded();

    // An image still loading reports currentSrc as "", which resolves against
    // the page and hands back the HTML document -- that is the "source image
    // cannot be decoded" this first failed CI with, not a real problem with
    // the photos.
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('section[aria-labelledby="instagram-heading"] ul img')].every(
          (i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).currentSrc !== "",
        ),
    );

    // naturalWidth on the tile itself is no use: with a w-descriptor srcset the
    // browser reports a density-corrected size, not the file's pixels. Loading
    // the same URL into a bare Image, which has no srcset, gives the real one.
    const tiles = await section.locator("ul img").evaluateAll(async (els) => {
      const out = [];
      for (const el of els as HTMLImageElement[]) {
        const css = el.getBoundingClientRect().width;
        const probe = new Image();
        await new Promise((resolve, reject) => {
          probe.onload = resolve;
          probe.onerror = () => reject(new Error(`could not load ${probe.src}`));
          probe.src = el.currentSrc;
        });
        out.push({ wanted: css * devicePixelRatio, got: probe.naturalWidth });
      }
      return out;
    });

    expect(tiles.length, "no photos measured").toBeGreaterThan(0);
    for (const t of tiles) {
      expect(
        t.got / t.wanted,
        `a ${t.got}px photo is being stretched across ${Math.round(t.wanted)} device pixels`,
      ).toBeGreaterThan(0.9);
    }
  });
});

test("the browser tab shows the shop's own logo, not the build-time placeholder", () => {
  // The placeholder was a rose disc with "FfU" set in Georgia, drawn before
  // the shop supplied artwork. scripts/brand-icons.mjs replaced it with the
  // traced logo, which is vector outlines — no <text>, no font-family.
  const icon = fs.readFileSync(path.join(process.cwd(), "src/app/icon.svg"), "utf8");
  expect(icon, "icon.svg is still the lettered placeholder").not.toContain("<text");
  expect(icon).not.toContain("font-family");
  expect(icon, "icon.svg has no traced artwork in it").toMatch(/<path[^>]+ d="M/);

  // The .ico carries 16, 32 and 48, all of them the full mark. An earlier
  // version substituted the FfU monogram at 16px, where the ring and sprig do
  // go soft; the shop asked for the real logo at every size instead.
  const ico = fs.readFileSync(path.join(process.cwd(), "src/app/favicon.ico"));
  expect(ico.readUInt16LE(4), "favicon.ico should hold 16, 32 and 48px").toBe(3);
});

test("a category's subcategory chips narrow the list without losing anything", async ({ page }) => {
  // The chips are links, not script, so a narrowed list can be shared in a
  // WhatsApp message and opened by someone who never saw the page it came
  // from — which is how this shop actually sends people to stock.
  await page.goto("/categories/lights-lighting-decor");

  const chips = page.getByRole("navigation", { name: "Filter by type" });
  await expect(chips).toBeVisible();

  const all = chips.getByRole("link", { name: /^All/ });
  await expect(all).toHaveAttribute("aria-current", "true");

  const stands = chips.getByRole("link", { name: /^Light Stand & Hanging/ });
  const href = await stands.getAttribute("href");
  expect(href, "a chip must be a real, shareable URL").toContain("sub=light-stand-and-hanging");

  const before = await page.locator('a[href^="/product/"]').count();
  await stands.click();
  await page.waitForURL("**/categories/lights-lighting-decor?sub=light-stand-and-hanging");

  await expect(
    chips.getByRole("link", { name: /^Light Stand & Hanging/ }),
  ).toHaveAttribute("aria-current", "true");
  const after = await page.locator('a[href^="/product/"]').count();
  expect(after, "the chip did not narrow the grid").toBeLessThan(before);
  expect(after, "the chip emptied the grid").toBeGreaterThan(0);

  // Every product still carries this category — a subcategory narrows, it does
  // not move stock out from under its parent.
  await expect(page.getByText("Lights & Lighting Décor").first()).toBeVisible();

  // And back to everything, which is the only way out of a filter for someone
  // who arrived on the filtered URL and has no history to go back to.
  await chips.getByRole("link", { name: /^All/ }).click();
  await page.waitForURL("**/categories/lights-lighting-decor");
  expect(await page.locator('a[href^="/product/"]').count()).toBe(before);
});

test("a subcategory chip keeps the search it was applied to", async ({ page }) => {
  // Dropping the other parameters would silently widen a search the moment
  // someone narrowed it by type, which is the opposite of what they asked for.
  await page.goto("/categories/lights-lighting-decor?q=stand&sort=price-asc");
  const chip = page
    .getByRole("navigation", { name: "Filter by type" })
    .getByRole("link", { name: /^Light Stand & Hanging/ });
  const href = await chip.getAttribute("href");
  expect(href).toContain("q=stand");
  expect(href).toContain("sort=price-asc");
  expect(href).toContain("sub=light-stand-and-hanging");
});

test("a category with no subcategories shows no filter row at all", async ({ page }) => {
  // Cooler & Fan has four products. An "All 4" chip on its own is noise, and a
  // row of one is worse than none.
  await page.goto("/categories/cooler-fan");
  await expect(page.getByRole("navigation", { name: "Filter by type" })).toHaveCount(0);
  expect(await page.locator('a[href^="/product/"]').count()).toBeGreaterThan(0);
});

test("a link to a renamed subcategory explains itself instead of lying", async ({ page }) => {
  // This is what a link already sent on WhatsApp becomes the moment the shop
  // renames or deletes that subcategory. It used to read "0 products in this
  // category" on a category holding 183 of them.
  await page.goto("/categories/gift-boxes-trays-bags-baskets?sub=no-such-grouping");

  await expect(page.getByText(/0 products match that filter/)).toBeVisible();
  await expect(page.getByText(/0 products in this category/)).toHaveCount(0);

  // And there is a way out, not just an empty grid.
  const all = page
    .getByRole("navigation", { name: "Filter by type" })
    .getByRole("link", { name: /^All/ });
  await all.click();
  await page.waitForURL("**/categories/gift-boxes-trays-bags-baskets");
  expect(await page.locator('a[href^="/product/"]').count()).toBeGreaterThan(0);
});
