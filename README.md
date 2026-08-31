# FloralforU — catalogue website

A mobile-first catalogue site for **FloralforU**, a one-stop event-décor, artificial-flower
and SFX supplier in Bank More, Dhanbad ([@floralforu_](https://www.instagram.com/floralforu_/)).

It replaces the shop's "share a Google Drive PDF" workflow with a live, searchable
catalogue the owner maintains themselves, and funnels every visitor to a WhatsApp
conversation with a real person.

> **There is no cart, no checkout and no online payment anywhere in this project — by
> design.** Every conversion path ends at an **Enquire** button that opens WhatsApp with a
> message naming the exact product. There are no customer accounts either; the only login
> in the codebase protects `/admin`.

---

## Quick start

```bash
npm install
cp .env.example .env          # then set AUTH_SECRET to a long random string
npx prisma migrate dev        # creates prisma/dev.db
npm run seed                  # 16 categories, 97 products, offers, reviews, gallery, admin user
npm run dev                   # http://localhost:3000
```

Admin portal: <http://localhost:3000/admin> — seeded credentials `owner@floralforu.in` /
`floralforu123`. **Change these before the site is reachable by anyone else:**

```bash
npm run admin:password
```

It prompts for the email and a new password (hidden, and confirmed twice), so nothing
lands in your shell history. It updates the admin if the email exists and creates one if
it doesn't, which is also how you add a second admin. For scripted use, set `ADMIN_EMAIL`
and `ADMIN_PASSWORD` and it won't prompt.

Note that `npm run seed` resets products, categories, offers, reviews, gallery items **and
admin users** — but never your Settings, so a business phone number or WhatsApp number you
have saved survives a re-seed.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run seed` | Reset and re-seed the database with demo content |
| `npm run admin:password` | Change an admin's password (or add an admin) |
| `npm run db:reset` | Drop, re-migrate and re-seed |
| `npm test` | Playwright suites against a production build |
| `npx eslint src` | Lint |
| `npm run typecheck` | Type-check (runs `next typegen` first) |

`npm test` builds nothing itself — run `npm run build` first, then `npm test`; Playwright
starts the server for you (or reuses one already on port 3000). In a sandbox without a
Playwright-managed browser, point it at your own Chromium:
`CHROMIUM_PATH=/path/to/chrome npm test`.

---

## Stack

| Concern | Choice | Note |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript | |
| Styling | Tailwind CSS v4 | Design tokens live in `src/app/globals.css` |
| Database | SQLite via Prisma | Swap `provider` to `postgresql` for production |
| Admin auth | Signed `jose` JWT in an HttpOnly cookie | See *Why not NextAuth* below |
| PDF export | `pdf-lib`, generated from live DB rows | `src/app/api/catalogue-pdf/route.ts` |
| Bulk import | `papaparse` (CSV) + `xlsx-republish` (Excel) | `src/lib/import.ts` |
| Images | `next/image` | Placeholder SVGs until real photos arrive |

**Why not NextAuth:** the plan suggested NextAuth, but only a single credentials provider
guarding `/admin` was needed — no OAuth, no customer accounts, no adapters. A ~90-line
signed-cookie session (`src/lib/auth.ts`) plus `src/middleware.ts` does the same job with
one dependency instead of a framework. Swap it for NextAuth if you later add Google login
or multiple providers.

---

## Project layout

```
prisma/
  schema.prisma          Models: AdminUser, Category, Product, ProductImage,
                         Offer, OfferProduct, Review, GalleryItem, Enquiry, Setting
  catalogue-data.ts      Seed catalogue (97 products across 16 categories)
  seed.ts                Seed script
src/
  app/(site)/            Public pages — home, categories, catalogue, product,
                         offers, gallery, reviews, about, contact
  app/admin/             Admin portal (auth-gated, excluded from robots.txt)
  app/api/               catalogue-pdf · contact · enquiries · import-template
  components/            ProductCard, EnquireButton, CatalogueControls, …
  components/admin/      Admin-only forms, tables, delete guards
  lib/                   db · auth · settings · catalogue · import · whatsapp · rate-limit
  middleware.ts          Redirects every unauthenticated /admin/* request to login
fixtures/
  sample-import.csv      46 rows / 9 categories, incl. 5 deliberately invalid rows
scripts/
  generate-placeholder-art.mjs   Branded placeholder SVGs
  make-sample-import.mts         Regenerates the import fixture
```

---

## How the pieces work

**The Enquire button** (`src/components/EnquireButton.tsx`) is a real `<a>`, so it works
without JavaScript. Its `wa.me` URL is built in `src/lib/whatsapp.ts` from an
admin-editable template supporting `{product}`, `{code}` and `{url}` tokens, and it is
UTM-tagged so WhatsApp traffic is attributable. The click is logged to the Enquiries table
via `fetch(..., { keepalive: true })` — fire-and-forget, so logging can never delay or
block a customer reaching WhatsApp.

**Catalogue state lives in the URL** (`?q=&category=&sort=&new=&offer=&page=`), so any
filtered view is shareable, bookmarkable and survives the back button. Price sorts push
"Price on Enquiry" items to the end rather than scattering them mid-list.

**Offers auto-expire.** A campaign is public only while `published && startsAt <= now <=
endsAt`; past campaigns move to an archive section automatically. No manual takedown.

**Categories cannot orphan products.** Deleting a category that still holds products opens
a dialog forcing you to choose where those products move.

**The bulk importer validates per row.** One bad row never aborts the file — each rejection
is reported with its spreadsheet row number, column and raw value. A dry-run mode checks a
file without writing anything. Rows whose `code` matches an existing product update that
product instead of creating a duplicate.

**Admin forms survive validation errors.** React 19 resets uncontrolled fields once a form
action resolves, so the server echoes the submission back and forms remount against it
(`ActionState.nonce`). Without this, one validation error would wipe a long product form.

---

## Verification

Both suites live in `tests/` and drive a real browser (Playwright) against a production
build. Every claim below was confirmed by observation, not by reading the code.

| Spec | What it covers |
| --- | --- |
| `tests/01-public.spec.ts` | The public site and the Enquire mechanic |
| `tests/02-admin.spec.ts` | The admin portal, end to end |

Both share one SQLite database, so each reseeds in `beforeAll` and the run is pinned to a
single worker — they are order-independent but never concurrent.

Covered: all 10 public routes render at 375 / 768 / 1440 px with no horizontal overflow and
no console errors; no cart/checkout/payment string anywhere in the rendered UI; `wa.me`
links on three products across three pages carry the product name, code and a link back;
all 16 category pages resolve; search, category filter, both quick filters and all five
sorts each change the result set correctly; the empty state renders for a zero-result
search; an active offer shows a live countdown while an expired one is archived; every
`img` has an `alt` attribute; `/admin/*` redirects to login when signed out; product
create → edit → delete round-trips and each change appears on the public site; the CSV
importer creates 41 rows and reports 5 row-level errors from the fixture; category deletion
is blocked pending reassignment; an offer moved out of its date range disappears from the
public list; the contact form validates, is rate-limited, and lands in the Enquiries log;
settings validation rejects a bad WhatsApp number and a template missing `{product}`.

Lighthouse on the production build:

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| `/` | 93 | 100 | 100 | 100 |
| `/catalogue` | 93 | 100 | 100 | 100 |

`npm run build`, `npm run typecheck` and `npx eslint src` all complete with zero errors.

Type-check via `npm run typecheck`, not bare `tsc`: `LayoutProps` and the other route
helpers are *generated* types, and on a clean checkout they don't exist until
`next dev`, `next build` or `next typegen` has run.

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`: install,
`prisma migrate deploy`, seed, lint, type-check, production build, then both Playwright
suites. On failure it uploads the Playwright report and traces as an artifact.

Lighthouse is deliberately *not* in CI — its scores move with runner load and would produce
flaky failures. Run it against a local production build when performance matters.

---

## Before this goes live

### 1. Real business details (blocking)

Every value below is a **placeholder**. Set them in **Admin → Settings**; the settings page
shows a warning banner while the critical ones are still unset.

| Setting | Placeholder |
| --- | --- |
| WhatsApp number | `910000000000` — **every Enquire button on the site depends on this** |
| Phone number | `+91 00000 00000` |
| Email | `hello@floralforu.in` |
| Site URL | `http://localhost:3000` — used in WhatsApp links, sitemap and share tags |
| GSTIN | blank (hidden until set) |
| Business hours | assumed Mon–Sat 10–8 |
| Follower / events counts | `5,500+` / `400+` — from the Instagram profile, confirm |

The address is taken from the Instagram bio; confirm it is current.

### 2. Product photography (blocking for launch quality)

There are **no real product photos**. Every product, category, offer banner and gallery
tile uses a generated placeholder SVG, each labelled "PLACEHOLDER PHOTO" and carrying alt
text that says so. Regenerate with `node scripts/generate-placeholder-art.mjs`.

Suggested phased approach: photograph the best-selling items per category first, launch
those, and backfill. Product images accept any URL, so a Cloudinary or S3 bucket works
without a code change.

### 3. Catalogue data (blocking — commercial decision)

The 97 seeded products are modelled on the supplied 603-item PDF, which appears to be a
**supplier (giftnfloral / GNF) wholesale price list rather than FloralforU's own retail
catalogue**. All "giftnfloral" / "GNF" watermark text has been stripped from names and
descriptions, but three decisions remain, per line:

1. Is the item actually in FloralforU's stock?
2. Is the listed price the supplier's wholesale rate or the retail sell price?
3. Which items should be **Price on Enquiry** instead of showing a number?

Once decided, load the real list through **Admin → Products → Bulk import**; the template
CSV is downloadable from that page. Also confirm whether **Cooler & Fan** and **Sofa &
Chair** are genuinely stocked — both are seeded as Price on Enquiry / made to order.

### 4. Reviews (blocking — do not fabricate)

The six seeded testimonials are **written from the brief, not real customer quotes**.
Replace them with real Instagram DM / WhatsApp / in-person reviews via **Admin → Reviews**.
The Reviews page renders correctly when empty, so deleting them all before launch is safe.

### 5. Instagram feed

The homepage Instagram section is wired to render **official Instagram embeds** from post
and reel permalinks pasted into **Admin → Gallery** (type "Instagram reel / post"). No API
token and no third-party widget. Until a permalink is added it falls back to the site's own
gallery images plus a live profile link — a working section, deliberately not the "feed
will display here once connected" dead placeholder the reference site ships. Add real
permalinks to switch it to live embeds.

### 6. Deployment

- **Database:** SQLite is fine for a single small instance, but a container filesystem is
  usually ephemeral. For Vercel or similar, switch the Prisma `provider` to `postgresql`,
  point `DATABASE_URL` at a managed instance and re-run the migration. Schedule daily
  backups once the admin portal is the source of truth for the catalogue.
- **`AUTH_SECRET`:** must be a 32+ character random string, different from the dev value.
- **Uploads:** image fields take URLs; there is no file-upload endpoint yet, so use
  Cloudinary / S3 / Vercel Blob and paste the URL.
- **Rate limiting** is in-memory (`src/lib/rate-limit.ts`) — correct for one instance only.
  It keys on `x-forwarded-for`, so make sure your proxy sets that header and strips any
  client-supplied value; move to Redis if you run more than one instance.
- Set the real domain as **Site URL** in Admin → Settings so WhatsApp links, `sitemap.xml`
  and Open Graph tags point at production rather than localhost.

### 7. Not built (out of scope, easy to add later)

Multi-admin roles (Owner vs. Staff), a direct image-upload endpoint, and drag-to-reorder
for images and gallery items (ordering is currently a numeric field).
