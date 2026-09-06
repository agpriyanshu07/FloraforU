import path from "node:path";
import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, isolateReviewLimiter, reseed, signIn } from "./helpers";

// These tests mutate shared database state and build on each other, so they run
// in order rather than in parallel.
test.describe.configure({ mode: "serial" });

test.beforeAll(() => reseed());

// These tests create offers and import 41 products. Reset afterwards too, so a
// local run leaves the database exactly as the seed made it rather than
// stranding "QA Verify Sale" campaigns and probe rows on the running site.
test.afterAll(() => reseed());

const FIXTURE = path.join(process.cwd(), "fixtures", "sample-import.csv");

// NOTE: on any admin page the *first* submit button is the header "Sign out".
// Always target buttons by their label.

test("a wrong password is rejected and the email is kept", async ({ page }) => {
  await page.goto("/admin/login");
  await page.fill("#email", ADMIN_EMAIL);
  await page.fill("#password", "wrong-password");
  await page.click('button[type=submit]');

  await expect(page.locator('form p[role="alert"]')).toContainText("don't match");
  // React resets the form after a server action; the email must survive it.
  await expect(page.locator("#email")).toHaveValue(ADMIN_EMAIL);
});

test("correct credentials reach the dashboard", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Enquiries this week")).toBeVisible();
});

test("a product round-trips: create, edit, delete — each visible on the public site", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/admin/products/new");

  const name = `QA Verify Lamp ${Date.now()}`;
  await page.fill("#name", name);
  await page.selectOption("#categoryId", { label: "Lamps & Diyas" });
  await page.fill("#spec", 'Set of 3 | 14", 18", 22" — QA row');
  await page.fill("#code", "QA-9999");

  // No price and no "Price on Enquiry" must be rejected...
  await page.click('button:has-text("Create product")');
  await expect(page.getByText('Enter a price, or tick "Price on Enquiry"')).toBeVisible();

  // ...and the rejection must not wipe what was already typed, selects included.
  await expect(page.locator("#name")).toHaveValue(name);
  await expect(page.locator("#code")).toHaveValue("QA-9999");
  await expect(page.locator("#categoryId")).not.toHaveValue("");

  await page.fill("#price", "2450");
  await page.click('button:has-text("Create product")');
  await page.waitForURL(/\/admin\/products(\?|$)/);
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();

  await page.goto(`/catalogue?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();

  // Edit
  await page.goto("/admin/products");
  await page.click(`a:has-text("${name}")`);
  const edited = `${name} (edited)`;
  await page.fill("#name", edited);
  await page.fill("#price", "2650");
  await page.click('button:has-text("Save changes")');
  await page.waitForURL(/\/admin\/products(\?|$)/);

  await page.goto(`/catalogue?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole("link", { name: edited, exact: true })).toBeVisible();
  await expect(page.getByText("₹2,650")).toBeVisible();

  // Delete
  await page.goto("/admin/products");
  await page.click(`a:has-text("${edited}")`);
  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Delete product")');
  await page.waitForURL(/\/admin\/products\?deleted=1/);

  await page.goto(`/catalogue?q=${encodeURIComponent(name)}`);
  await expect(page.getByText(edited)).toHaveCount(0);
});

test("the bulk importer validates per row, then imports the good ones", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products/import");

  // Dry run first — reports problems, writes nothing.
  await page.setInputFiles("#file", FIXTURE);
  await expect(page.locator('input[name="dryRun"]')).toBeChecked();
  await page.click('button:has-text("Upload and import")');
  await expect(page.getByRole("heading", { name: "Dry run results" })).toBeVisible({
    timeout: 60_000,
  });

  const problems = await page.$$eval("table tbody tr", (rows) =>
    rows.map((r) => [...r.children].map((c) => c.textContent!.trim())),
  );
  const columns = [...new Set(problems.map((r) => r[1]))];
  // The fixture's five distinct defects: missing name, unknown category,
  // non-numeric price, invalid availability, duplicated code.
  expect(columns.sort()).toEqual(["availability", "category", "code", "name", "price"]);
  expect(page.getByText("No category called")).toBeTruthy();

  // Real import.
  await page.setInputFiles("#file", FIXTURE);
  await page.uncheck('input[name="dryRun"]');
  await page.click('button:has-text("Upload and import")');
  await expect(page.getByRole("heading", { name: "Import results" })).toBeVisible({
    timeout: 90_000,
  });

  const summary = await page.evaluate(() => document.body.innerText);
  expect(Number(summary.match(/Created\n(\d+)/)?.[1]), "rows created").toBe(41);
  expect(Number(summary.match(/Skipped\n(\d+)/)?.[1]), "rows skipped").toBe(5);

  await page.goto("/admin/products?q=Sparkular");
  await expect(page.getByText("Sparkular Cold Fountain")).toBeVisible();

  await page.goto("/catalogue?q=Sparkular");
  await expect(page.getByText("Sparkular Cold Fountain")).toBeVisible();

  // A blank price column must become Price on Enquiry, not ₹0.
  await page.goto("/catalogue?q=Rose%20Petal%20Pack");
  await expect(page.getByText("Price on Enquiry").first()).toBeVisible();
});

test("a product name cannot inject script into the public page", async ({ page }) => {
  // A name containing `</script>` used to close the JSON-LD block early and
  // execute — stored XSS reachable from this very form, or from an imported
  // supplier spreadsheet.
  const payload = `</script><script>window.__XSS_FIRED=1</script>`;

  await signIn(page);
  await page.goto("/admin/products/new");
  await page.fill("#name", payload);
  await page.selectOption("#categoryId", { index: 1 });
  await page.fill("#spec", "XSS regression probe");
  await page.fill("#price", "100");
  await page.click('button:has-text("Create product")');
  await page.waitForURL(/\/admin\/products(\?|$)/);

  const slug = await page.$$eval(
    "table tbody tr a[href^='/admin/products/']",
    (as) => as[0]?.getAttribute("href") ?? "",
  );
  expect(slug).not.toBe("");

  await page.goto("/catalogue?q=XSS%20regression%20probe");
  const href = await page.getAttribute('article a[href^="/product/"]', "href");
  expect(href, "the probe product should be listed").toBeTruthy();

  await page.goto(href!);
  expect(
    await page.evaluate(() => (window as unknown as Record<string, unknown>).__XSS_FIRED),
    "injected script must not execute",
  ).toBeUndefined();

  const blocks = await page.$$eval('script[type="application/ld+json"]', (els) =>
    els.map((e) => e.textContent ?? ""),
  );
  expect(blocks, "exactly one JSON-LD block, not a split one").toHaveLength(1);
  expect(() => JSON.parse(blocks[0])).not.toThrow();
  expect(blocks[0], "no raw < may survive into the document").not.toContain("<");
  expect(JSON.parse(blocks[0]).name, "the name is still carried, just escaped").toBe(payload);

  // Clean up so the catalogue is left as the seed made it.
  await page.goto(slug);
  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Delete product")');
  await page.waitForURL(/\/admin\/products\?deleted=1/);
});

test("a category holding products cannot be deleted without reassigning them", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/admin/categories");

  const before = await page.locator("table tbody tr").count();
  await page.click('table tbody tr:first-child button:has-text("Delete")');

  const dialog = page.locator('div[role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("still has");
  await expect(dialog).toContainText("Move those products to");
  await expect(dialog.locator("select")).toHaveAttribute("required", "");

  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(await page.locator("table tbody tr").count()).toBe(before);
});

test("an offer appears while live and archives itself once its dates pass", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/offers");

  const title = `QA Verify Sale ${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);
  const inFive = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);

  await page.fill("#title", title);
  await page.fill("#offer-description", "Automated verification campaign.");
  await page.fill("#startsAt", today);
  await page.fill("#endsAt", today);
  await page.click('button:has-text("Create campaign")');
  await expect(page.getByText("end date must be after the start date")).toBeVisible();

  await page.fill("#endsAt", inFive);
  const boxes = page.locator('input[name="productIds"]');
  for (const i of [0, 1, 2]) await boxes.nth(i).check();
  await page.click('button:has-text("Create campaign")');
  await page.waitForURL(/\/admin\/offers\?saved=/);

  await page.goto("/offers");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  // Move it into the past.
  await page.goto("/admin/offers");
  const editHref = await page.$$eval(
    "table tbody tr",
    (rows, name) =>
      rows
        .find((r) => (r as HTMLElement).innerText.includes(name))
        ?.querySelector('a[href*="edit="]')
        ?.getAttribute("href") ?? "",
    title,
  );
  await page.goto(editHref);
  await page.fill("#startsAt", new Date(Date.now() - 20 * 864e5).toISOString().slice(0, 10));
  await page.fill("#endsAt", new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10));
  await page.click('button:has-text("Save campaign")');
  await page.waitForURL(/\/admin\/offers\?saved=/);

  await page.goto("/offers");
  const body = await page.evaluate(() => document.body.innerText);
  const [active, past] = body.split("Past campaigns");
  expect(active, "an out-of-date offer must leave the active list").not.toContain(title);
  expect(past, "and be archived").toContain(title);
});

test("homepage curation reorders the public category grid", async ({ page }) => {
  // The order inputs were once wired to a stale hidden field, so edits silently
  // did nothing. This drives the real form and reads the public homepage back.
  await page.goto("/");
  const before = await page.$$eval(
    "section[aria-labelledby=categories-heading] article h3 a",
    (as) => as.map((a) => a.textContent!.trim()),
  );

  await signIn(page);
  await page.goto("/admin/homepage");
  const names = await page.$$eval('input[name^="categoryOrder_"]', (els) =>
    els.map((e) => (e as HTMLInputElement).name),
  );
  expect(names.length, "one order input per category").toBe(16);

  // Send the last category to the front and the first to the back.
  await page.fill(`input[name="${names[names.length - 1]}"]`, "0");
  await page.fill(`input[name="${names[0]}"]`, "99");
  await page.click('button:has-text("Save homepage")');
  await page.waitForURL(/homepage\?saved=1/);

  await page.goto("/");
  const after = await page.$$eval(
    "section[aria-labelledby=categories-heading] article h3 a",
    (as) => as.map((a) => a.textContent!.trim()),
  );
  expect(after[0], "the promoted category should now lead the grid").not.toBe(before[0]);
});

test("the contact form validates, is rate limited, and lands in the enquiry log", async ({
  page,
  request,
}) => {
  const message = `QA verification message ${Date.now()}`;

  // Give this run its own client identity — the limiter keys on the forwarded IP.
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250) + 1}`,
  });

  await page.goto("/contact");
  await page.fill("#name", "QA Bot");
  await page.fill("#phone", "9999999999");
  await page.fill("#email", "not-an-email");
  await page.fill("#message", message);
  await page.click('button[type=submit]');
  await expect(page.getByText("email doesn't look right")).toBeVisible();

  await page.fill("#email", "qa@example.com");
  await page.click('button[type=submit]');
  await expect(page.getByText("Message received")).toBeVisible();

  // The limiter must actually fire under a flood from a single address. The
  // limiter is in-memory with a 10-minute window, so this run needs an address
  // no earlier run has already spent.
  const floodIp = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
  const statuses: number[] = [];
  for (let i = 0; i < 8; i++) {
    const res = await request.post("/api/contact", {
      headers: { "x-forwarded-for": floodIp },
      data: {
        name: "Flood Bot",
        phone: "9000000000",
        email: "",
        message: `flooding the contact form, request number ${i}`,
      },
    });
    statuses.push(res.status());
  }
  expect(statuses[0]).toBe(200);
  expect(statuses, "the flood must be cut off").toContain(429);

  await signIn(page);
  await page.goto("/admin/enquiries?channel=form");
  await expect(page.getByText(message)).toBeVisible();
  await expect(page.getByText("qa@example.com")).toBeVisible();
});

test("settings validate and propagate to every Enquire link", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/settings");

  await expect(page.getByText("Still using placeholder values")).toBeVisible();

  await page.fill("#whatsapp", "12");
  await page.click('button:has-text("Save settings")');
  await expect(page.getByText("full number with country code")).toBeVisible();

  await page.fill("#whatsapp", "919876543210");
  await page.fill("#whatsappTemplate", "no token here");
  await page.click('button:has-text("Save settings")');
  await expect(page.getByText("must contain {product}")).toBeVisible();

  await page.fill(
    "#whatsappTemplate",
    "Hi FloralforU! I'd like to enquire about {product}{code}.\n{url}",
  );
  await page.click('button:has-text("Save settings")');
  await expect(page.getByText("Settings saved")).toBeVisible();

  await page.goto("/catalogue");
  const href = await page.getAttribute('a[href^="https://wa.me/"]', "href");
  expect(href).toContain("https://wa.me/919876543210");
});

test("signing out locks the admin portal again", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin");
  await page.click('button:has-text("Sign out")');
  await page.waitForURL("**/admin/login**");

  await page.goto("/admin/products");
  expect(page.url()).toContain("/admin/login");
});

test("a product photo set by URL reaches the public product page", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products/new");

  const name = `QA Photo Pot ${Date.now()}`;
  const primary = "/img/categories/pots-vases.svg";
  const secondary = "/img/categories/lamps-diyas.svg";

  await page.fill("#name", name);
  await page.selectOption("#categoryId", { label: "Pots & Vases" });
  await page.fill("#spec", "QA photo row");
  await page.fill("#price", "999");

  // The textarea lives inside a <details>. It is open already when uploads are
  // switched off, which is how CI runs, but opening it is harmless either way
  // and keeps this test honest if Cloudinary is ever configured for CI.
  // getAttribute returns "" for a boolean attribute that is present, so compare
  // against null rather than testing truthiness — otherwise this closes it.
  const details = page.locator("details:has(#imageUrls)");
  if ((await details.getAttribute("open")) === null) {
    await details.locator("summary").click();
  }
  await page.fill("#imageUrls", `${primary}\n${secondary}`);

  // Both photos should be listed back, with the first marked as the main one.
  // Exact match: the hint text below also contains the words "main photo".
  await expect(page.getByText("Main", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Remove photo/ })).toHaveCount(2);

  await page.click('button:has-text("Create product")');
  await page.waitForURL(/\/admin\/products(\?|$)/);

  // The public page must render the primary photo, not the "coming soon" state.
  // Scoped to <main>: the header carries its own logo image now, and without
  // this scope ".first()" picks that up instead of the product's own photo.
  await page.goto(`/catalogue?q=${encodeURIComponent(name)}`);
  await page.click(`a:has-text("${name}")`);
  const hero = page.locator("main img").first();
  await expect(hero).toHaveAttribute("src", new RegExp(primary.replace(/\//g, "\\/")));

  // Reopening the product must show both photos still attached, in order.
  await page.goto("/admin/products");
  await page.click(`a:has-text("${name}")`);
  await expect(page.locator("#imageUrls")).toHaveValue(`${primary}\n${secondary}`);

  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Delete product")');
  await page.waitForURL(/\/admin\/products\?deleted=1/);
});

test("a submitted review stays invisible until an admin approves it", async ({ page }) => {
  await isolateReviewLimiter(page);
  const quote =
    "QA moderation loop — the marigold lardi arrived a day early and matched the photos exactly.";

  // 1. Submit as an ordinary visitor.
  await page.goto("/reviews");
  await page.fill("#customerName", "QA Moderation");
  await page.fill("#eventType", "Wedding — QA");
  await page.fill("#quote", quote);
  await page.click('button:has-text("Submit review")');
  await expect(page.getByText("Thanks — we've got your review")).toBeVisible();

  // 2. It must NOT be public yet. This is the whole safety model for opening a
  //    public write endpoint on the site's main trust signal.
  await page.goto("/reviews");
  await expect(page.getByText(quote)).toHaveCount(0);

  // 3. Approve it in the admin queue.
  await signIn(page);
  await page.goto("/admin/reviews");
  const row = page.locator("tr", { hasText: "QA Moderation" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Approve" }).click();
  await page.waitForURL("**/admin/reviews?moderated=approved");

  // 4. Only now is it public.
  await page.goto("/reviews");
  await expect(page.getByText(quote)).toBeVisible();
});

test("the review endpoint rejects bad input, drops honeypot spam and rate limits", async ({
  request,
}) => {
  const ip = `10.55.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  const headers = { "x-forwarded-for": ip };

  // Invalid: too-short quote and an out-of-range rating.
  const bad = await request.post("/api/reviews", {
    headers,
    data: { customerName: "A", quote: "short", rating: 9 },
  });
  expect(bad.status()).toBe(400);
  const badBody = await bad.json();
  expect(Object.keys(badBody.fieldErrors)).toEqual(
    expect.arrayContaining(["customerName", "quote", "rating"]),
  );

  // Honeypot filled: accepted with a normal-looking success so a bot learns
  // nothing, but nothing is stored.
  const trap = await request.post("/api/reviews", {
    headers: { "x-forwarded-for": `${ip}9` },
    data: {
      customerName: "Spam Bot",
      quote: "A spam review long enough to clear the length check.",
      rating: 5,
      website: "http://spam.example",
    },
  });
  expect(trap.status()).toBe(200);
  expect((await trap.json()).ok).toBe(true);

  // Rate limit: three per hour, so the fourth is refused.
  const limitIp = { "x-forwarded-for": `${ip}1` };
  for (let i = 1; i <= 3; i++) {
    const ok = await request.post("/api/reviews", {
      headers: limitIp,
      data: {
        customerName: `QA Limit ${i}`,
        quote: `Rate limit probe ${i}, long enough to clear validation.`,
        rating: 5,
      },
    });
    expect(ok.status(), `submission ${i} should be accepted`).toBe(200);
  }
  const blocked = await request.post("/api/reviews", {
    headers: limitIp,
    data: {
      customerName: "QA Limit 4",
      quote: "This fourth one within the hour must be refused by the limiter.",
      rating: 5,
    },
  });
  expect(blocked.status()).toBe(429);
});

test("a review left on a product page shows on that product, and only that one", async ({
  page,
}) => {
  await isolateReviewLimiter(page);

  const quote = "QA product-scoped — lovely lace pot, packed well and exactly as pictured.";

  await page.goto("/product/lace-pot");
  await page.fill("#customerName", "QA Product");
  await page.fill("#quote", quote);
  await page.click('button:has-text("Submit review")');
  await expect(page.getByText("Thanks — we've got your review")).toBeVisible();

  await signIn(page);
  await page.goto("/admin/reviews");
  await page
    .locator("tr", { hasText: "QA Product" })
    .getByRole("button", { name: "Approve" })
    .click();
  await page.waitForURL("**/admin/reviews?moderated=approved");

  await page.goto("/product/lace-pot");
  await expect(page.getByText(quote)).toBeVisible();

  // It belongs to that product, so it must not bleed onto another one. The
  // slug has to be a real published product — a 404 would pass this vacuously.
  await page.goto("/product/acrylic-gift-box-clear");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(quote)).toHaveCount(0);
});

test("a campaign discount round-trips and reaches the public price", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/offers");

  await page
    .locator("tr", { hasText: "Ganesh Puja Sale" })
    .first()
    .getByRole("link", { name: "Edit" })
    .click();
  await page.waitForURL(/edit=/);

  const percent = page.locator("#discountPercent");
  await expect(percent).toHaveValue("20");

  // Selected products float to the top and carry a price box each — editing a
  // ten-item sale used to mean hunting through ninety-seven alphabetical rows.
  const overrides = page.locator('input[id^="price-"]');
  await expect(overrides.first()).toBeVisible();
  const count = await overrides.count();
  expect(count, "one price box per product in the campaign").toBeGreaterThan(1);

  // The form states the rupee outcome before it is saved.
  await percent.fill("50");
  await expect(page.getByText(/Shows as ₹.*campaign percentage/).first()).toBeVisible();

  // An override that isn't a discount is called out rather than accepted.
  await overrides.nth(1).fill("99999999");
  await expect(page.getByText(/Not a discount/).first()).toBeVisible();
  await overrides.nth(1).fill("");

  await page.getByRole("button", { name: /Save campaign/ }).click();
  await page.waitForURL(/saved=/);

  // 50% off has to be what the shop actually sees on the site.
  await page.goto("/offers");
  await expect(page.getByText("50% off").first()).toBeVisible();

  // Put it back, so the suite leaves the campaign as it found it.
  await page.goto("/admin/offers");
  await page
    .locator("tr", { hasText: "Ganesh Puja Sale" })
    .first()
    .getByRole("link", { name: "Edit" })
    .click();
  await page.waitForURL(/edit=/);
  await page.locator("#discountPercent").fill("20");
  await page.getByRole("button", { name: /Save campaign/ }).click();
  await page.waitForURL(/saved=/);
});

test("the admin product list shows the price a sale is currently charging", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/admin/products?q=Marigold");

  // Without this the table shows the everyday rate while the site charges less,
  // and prices get edited without anyone knowing a campaign is running.
  const row = page.locator("tr", { hasText: "Marigold Lardi" }).first();
  await expect(row.locator(".line-through")).toBeVisible();
  await expect(row.getByText("Ganesh Puja Sale")).toBeVisible();
});
