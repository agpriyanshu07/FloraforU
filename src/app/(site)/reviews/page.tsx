import type { Metadata } from "next";
import ReviewCard from "@/components/ReviewCard";
import ReviewForm from "@/components/ReviewForm";
import EmptyState from "@/components/EmptyState";
import { HeartIcon, InstagramIcon, WhatsappIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PUBLIC_REVIEW_WHERE } from "@/lib/queries";
import { buildWhatsappUrl, instagramDmUrl, withUtm } from "@/lib/whatsapp";

// Cached; admin writes revalidate this path explicitly, so the window is a backstop.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Customer reviews",
  description:
    "What brides, event planners and shopkeepers in Dhanbad say about ordering décor, flowers and SFX items from FloralforU.",
};

export default async function ReviewsPage() {
  const [settings, reviews] = await Promise.all([
    getSettings(),
    db.review.findMany({ where: PUBLIC_REVIEW_WHERE, orderBy: { displayOrder: "asc" } }),
  ]);

  // Quotes lifted from Instagram get their own attributed section, always
  // linking back to the post they came from. Gated behind the settings flag so
  // the whole feature can be switched off instantly without touching code.
  const instagramEnabled = settings.instagramCommentsEnabled === "true";
  const fromInstagram = instagramEnabled
    ? reviews.filter((r) => r.sourceUrl && /instagram\.com/i.test(r.sourceUrl))
    : [];
  const instagramIds = new Set(fromInstagram.map((r) => r.id));
  const mainReviews = reviews.filter((r) => !instagramIds.has(r.id));

  const average =
    reviews.length > 0
      ? (reviews.reduce((n, r) => n + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const wa = withUtm(
    buildWhatsappUrl({
      number: settings.whatsapp,
      message: "Hi FloralforU! I'd like to leave a review about my recent order.",
    }),
    "website",
    "reviews",
  );

  return (
    <div className="shell py-10">
      <header className="mb-8 max-w-3xl">
        <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)]">
          What our customers say
        </h1>
        <p className="mt-2 text-ink-600">
          Collected from Instagram DMs, WhatsApp messages and conversations at the
          shop counter.
          {average && reviews.length > 0 && (
            <>
              {" "}
              Currently averaging{" "}
              <strong className="text-ink-900">{average} out of 5</strong> across{" "}
              {reviews.length} reviews.
            </>
          )}
        </p>
      </header>

      {reviews.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mainReviews.map((r) => (
            <li key={r.id} className="flex">
              <ReviewCard {...r} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No reviews published yet"
          body="We're in the middle of moving our Instagram reviews over to the website. In the meantime, our Reviews highlight on Instagram has them all."
          actionLabel="See reviews on Instagram"
          actionHref={settings.instagram}
          icon={<HeartIcon className="h-8 w-8" />}
        />
      )}

      {fromInstagram.length > 0 && (
        <section aria-labelledby="from-instagram" className="mt-14">
          <h2 id="from-instagram" className="font-display text-2xl">
            From Instagram
          </h2>
          <p className="mt-1 text-ink-600">
            Comments left on our posts, quoted as written. Each one links to the
            post it came from.
          </p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fromInstagram.map((r) => (
              <li key={r.id} className="flex">
                <ReviewCard {...r} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="write-a-review" className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <ReviewForm />

        {/* The messaging routes stay exactly as they were — plenty of customers
            would rather send a voice note than fill in a form. */}
        <div className="card flex flex-col items-start gap-4 p-8">
          <h2 className="font-display text-2xl">Prefer to message us?</h2>
          <p className="text-ink-600">
            Send your review however suits you and we&apos;ll add it here ourselves.
            It genuinely helps other customers decide.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
              <WhatsappIcon className="h-4 w-4" />
              Send a review on WhatsApp
            </a>
            <a
              href={withUtm(instagramDmUrl(settings.instagram), "website", "reviews")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-instagram"
            >
              <InstagramIcon className="h-4 w-4" />
              DM on Instagram
            </a>
          </div>
          <p className="text-[13px] text-ink-600">
            However you send it, we read every review before it goes on the site.
            We don&apos;t take payments online, so we can&apos;t mark reviews as
            &ldquo;verified purchases&rdquo; — we won&apos;t pretend otherwise.
          </p>
        </div>
      </section>
    </div>
  );
}
