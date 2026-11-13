import Link from "next/link";
import { PageHeader, StatTile } from "@/components/admin/ui";
import { NavIcon } from "@/components/admin/icons";
import { getSettings, placeholderSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { daysAgo, formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * One thing that needs the owner's attention, in the order it needs it.
 *
 * `tone` is severity, not decoration: `blocking` means the public site is
 * currently doing the wrong thing and nobody will notice from looking at it.
 */
type Job = {
  tone: "blocking" | "waiting" | "suggested";
  title: string;
  detail: string;
  href: string;
  cta: string;
};

const TONES = {
  blocking: {
    chip: "bg-red-100 text-red-700",
    edge: "border-l-4 border-l-red-600",
    label: "Needs fixing",
  },
  waiting: {
    chip: "bg-marigold-100 text-marigold-700",
    edge: "border-l-4 border-l-marigold-600",
    label: "Waiting on you",
  },
  suggested: {
    chip: "bg-rose-100 text-rose-700",
    edge: "border-l-4 border-l-rose-300",
    label: "Worth doing",
  },
} as const;

export default async function AdminDashboard() {
  const now = new Date();
  const weekAgo = daysAgo(7);

  const [
    products,
    drafts,
    categories,
    activeOffers,
    enquiriesWeek,
    enquiriesTotal,
    unhandled,
    publishedReviews,
    pendingReviews,
    recent,
    missingImages,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { published: false } }),
    db.category.count(),
    db.offer.count({
      where: { published: true, startsAt: { lte: now }, endsAt: { gte: now } },
    }),
    db.enquiry.count({ where: { createdAt: { gte: weekAgo } } }),
    db.enquiry.count(),
    db.enquiry.count({ where: { handled: false } }),
    db.review.count({ where: { visible: true, status: "approved" } }),
    db.review.count({ where: { status: "pending" } }),
    db.product.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true, name: true, slug: true, price: true, priceOnEnquiry: true,
        published: true, updatedAt: true, category: { select: { name: true } },
        images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1, select: { url: true } },
      },
    }),
    db.product.count({ where: { images: { none: {} } } }),
  ]);

  const placeholders = placeholderSettings(await getSettings());

  /**
   * The dashboard used to open with four stat tiles and put the only list of
   * actual jobs under a quiet "Worth doing" heading below them -- so the first
   * thing on screen was a number you cannot do anything with, and the thing
   * you came to do was below the fold. This inverts it.
   */
  const jobs: Job[] = [];

  if (placeholders.length > 0) {
    // First, always. An unset WhatsApp number sends every Enquire button to a
    // number that does not exist, and nothing about the site looks wrong when
    // it happens: no broken page, no error, no failing test. The shop simply
    // stops receiving enquiries.
    jobs.push({
      tone: "blocking",
      title: `${placeholders.join(", ")} ${placeholders.length === 1 ? "is" : "are"} still a placeholder`,
      detail: placeholders.includes("WhatsApp number")
        ? "Every Enquire button on the site opens a chat with a number that does not exist, so nothing is reaching you."
        : "These came from the build and were never replaced with the shop's real details.",
      href: "/admin/settings",
      cta: "Open Settings",
    });
  }

  if (pendingReviews > 0) {
    jobs.push({
      tone: "waiting",
      title: `${pendingReviews} review${pendingReviews === 1 ? "" : "s"} waiting for approval`,
      detail:
        "Submitted through the site and hidden until you approve. Nothing on the public page hints that they are there.",
      href: "/admin/reviews",
      cta: "Moderate reviews",
    });
  }

  if (unhandled > 0) {
    jobs.push({
      tone: "waiting",
      title: `${unhandled} enquir${unhandled === 1 ? "y" : "ies"} not marked as followed up`,
      detail: "Tick them off once you have replied, so this list stays meaningful.",
      href: "/admin/enquiries",
      cta: "Open the inbox",
    });
  }

  if (missingImages > 0) {
    jobs.push({
      tone: "suggested",
      title: `${missingImages} product${missingImages === 1 ? " has" : "s have"} no photo`,
      detail:
        "They show a placeholder illustration on the catalogue. A bulk import with an image column fills them in one pass.",
      href: "/admin/products?photo=none",
      cta: "See which ones",
    });
  }

  if (publishedReviews === 0) {
    jobs.push({
      tone: "suggested",
      title: "No reviews are published yet",
      detail: "The Reviews page is live but empty. Transcribing a few Instagram DMs is the quickest fill.",
      href: "/admin/reviews",
      cta: "Add a review",
    });
  }

  if (drafts > 0) {
    jobs.push({
      tone: "suggested",
      title: `${drafts} product${drafts === 1 ? "" : "s"} still unpublished`,
      detail: "Drafts are invisible to customers. Publish them, or leave them if they are seasonal.",
      href: "/admin/products?status=draft",
      cta: "Review drafts",
    });
  }

  const urgent = jobs.some((j) => j.tone === "blocking");
  const jobsSection = (
      <section aria-labelledby="jobs-heading" className="mb-8">
        <h2 id="jobs-heading" className="sr-only">
          What needs doing
        </h2>

        {jobs.length === 0 ? (
          <p className="card flex items-center gap-3 p-5 text-sm">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sage-100 text-lg text-sage-700"
            >
              ✓
            </span>
            <span>
              <strong className="block">Nothing needs your attention.</strong>
              <span className="text-ink-600">
                Settings are filled in, no reviews are waiting, every enquiry is
                followed up and every product has a photo.
              </span>
            </span>
          </p>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => {
              const tone = TONES[job.tone];
              return (
                <li
                  key={job.title}
                  className={`card flex flex-wrap items-center gap-x-4 gap-y-3 p-4 ${tone.edge}`}
                >
                  <div className="min-w-0 flex-1 basis-full sm:basis-64">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone.chip}`}
                    >
                      {tone.label}
                    </span>
                    <strong className="mt-1.5 block text-[15px] leading-snug">{job.title}</strong>
                    <p className="mt-0.5 text-[13px] text-ink-600">{job.detail}</p>
                  </div>
                  <Link
                    href={job.href}
                    className={job.tone === "blocking" ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
                  >
                    {job.cta}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
  );

  return (
    <>
      <PageHeader title="Dashboard" description="What you can do here, and anything waiting on you." />

      {/* Something actively breaking the site -- an unset WhatsApp number
          sends every enquiry nowhere -- outranks the quick actions. Otherwise
          the jobs wait below them. */}
      {urgent && jobsSection}

      {/* The four things the shop does most, as big targets. The dashboard
          used to offer one small "Add a product" button and leave everything
          else to the menu; most visits are one of these. */}
      <section aria-labelledby="actions-heading" className="mb-8">
        <h2 id="actions-heading" className="sr-only">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/products/import-pdf"
            className="flex flex-col gap-1 rounded-2xl bg-rose-600 p-5 text-white shadow-sm transition-colors duration-200 hover:bg-rose-700"
          >
            <NavIcon name="add" />
            <span className="mt-1 font-display text-xl">Add products from a PDF</span>
            <span className="text-sm text-rose-100">Upload your catalogue. Names, prices and photos are filled in for you to check.</span>
          </Link>
          <Link href="/admin/products/new" className="card flex flex-col gap-1 p-5 transition-colors duration-200 hover:bg-rose-50">
            <span className="text-rose-600"><NavIcon name="products" /></span>
            <span className="mt-1 font-display text-xl">Add one product</span>
            <span className="text-sm text-ink-600">Type it in yourself, with photos from your phone.</span>
          </Link>
          <form action="/admin/products" className="card flex flex-col gap-2 p-5">
            <label htmlFor="dash-q" className="font-display text-xl">Find a product</label>
            <span className="text-sm text-ink-600">To change a price, photo or stock.</span>
            <div className="mt-auto flex gap-2">
              <input id="dash-q" name="q" className="field min-w-0 flex-1" placeholder="Name or code" />
              <button type="submit" className="btn-primary btn-sm shrink-0">Go</button>
            </div>
          </form>
          <Link href="/admin/offers" className="card flex flex-col gap-1 p-5 transition-colors duration-200 hover:bg-rose-50">
            <span className="text-rose-600"><NavIcon name="offers" /></span>
            <span className="mt-1 font-display text-xl">Run an offer</span>
            <span className="text-sm text-ink-600">
              {activeOffers > 0 ? `${activeOffers} running now. Start or change one.` : "A sale with start and end dates."}
            </span>
          </Link>
        </div>
      </section>

      {!urgent && jobsSection}

      <section aria-labelledby="numbers-heading" className="mt-8">
        <h2 id="numbers-heading" className="mb-3 font-display text-xl">
          The catalogue at a glance
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="Products"
            value={products}
            hint={drafts > 0 ? `${drafts} unpublished` : "All published"}
            href="/admin/products"
          />
          <StatTile label="Categories" value={categories} href="/admin/categories" />
          <StatTile
            label="Active offers"
            value={activeOffers}
            hint={activeOffers === 0 ? "No campaign running" : "Live on the site now"}
            href="/admin/offers"
          />
          <StatTile
            label="Enquiries this week"
            value={enquiriesWeek}
            hint={`${enquiriesTotal} all time`}
            href="/admin/enquiries"
          />
        </div>
      </section>

      <section aria-labelledby="recent-heading" className="mt-8">
        <h2 id="recent-heading" className="mb-3 font-display text-xl">
          Recently edited
        </h2>
        {recent.length === 0 ? (
          <p className="card p-5 text-sm">
            Nothing yet — <Link href="/admin/products/import-pdf" className="text-rose-600">add your first products</Link>.
          </p>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-rose-50">
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-rose-50">
                    {p.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0].url} alt="" className="h-full w-full object-contain" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block truncate text-[13px] text-ink-600">
                      {p.category.name} · {formatPrice(p.price, p.priceOnEnquiry)} ·{" "}
                      {p.updatedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      p.published ? "bg-sage-100 text-sage-700" : "bg-marigold-100 text-marigold-700"
                    }`}
                  >
                    {p.published ? "Live" : "Draft"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
