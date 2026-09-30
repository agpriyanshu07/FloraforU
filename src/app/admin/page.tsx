import Link from "next/link";
import { PageHeader, StatTile, TableShell, EmptyRow } from "@/components/admin/ui";
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

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Everything waiting on you, then the numbers."
        action={
          <Link href="/admin/products/new" className="btn-primary">
            Add a product
          </Link>
        }
      />

      <section aria-labelledby="jobs-heading">
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
        <TableShell
          head={
            <tr>
              <th scope="col" className="px-4 py-3">Product</th>
              <th scope="col" className="px-4 py-3">Category</th>
              <th scope="col" className="px-4 py-3">Price</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Updated</th>
            </tr>
          }
        >
          {recent.length === 0 ? (
            <EmptyRow colSpan={5}>
              Nothing yet — <Link href="/admin/products/new" className="text-rose-600">add your first product</Link>.
            </EmptyRow>
          ) : (
            recent.map((p) => (
              <tr key={p.id}>
                <td data-label="" className="px-4 py-3 font-medium">
                  <Link href={`/admin/products/${p.id}`} className="hover:text-rose-700">
                    {p.name}
                  </Link>
                </td>
                <td data-label="Category" className="px-4 py-3 text-ink-600">{p.category.name}</td>
                <td data-label="Price" className="px-4 py-3">{formatPrice(p.price, p.priceOnEnquiry)}</td>
                <td data-label="Status" className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      p.published ? "bg-sage-100 text-sage-700" : "bg-marigold-100 text-marigold-700"
                    }`}
                  >
                    {p.published ? "Live" : "Draft"}
                  </span>
                </td>
                <td data-label="Updated" className="px-4 py-3 text-ink-600">
                  {p.updatedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </section>
    </>
  );
}
