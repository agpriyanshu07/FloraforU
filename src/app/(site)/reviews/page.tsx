import type { Metadata } from "next";
import ReviewCard from "@/components/ReviewCard";
import EmptyState from "@/components/EmptyState";
import { HeartIcon, InstagramIcon, WhatsappIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { buildWhatsappUrl, withUtm } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer reviews",
  description:
    "What brides, event planners and shopkeepers in Dhanbad say about ordering décor, flowers and SFX items from FloralforU.",
};

export default async function ReviewsPage() {
  const [settings, reviews] = await Promise.all([
    getSettings(),
    db.review.findMany({ where: { visible: true }, orderBy: { displayOrder: "asc" } }),
  ]);

  const average =
    reviews.length > 0
      ? (reviews.reduce((n, r) => n + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const wa = withUtm(
    buildWhatsappUrl({
      number: settings.whatsapp,
      template: "Hi FloralforU! I'd like to leave a review about my recent order.",
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
          {reviews.map((r) => (
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

      <section className="card mt-12 flex flex-col items-center gap-4 p-8 text-center">
        <h2 className="font-display text-2xl">Ordered from us before?</h2>
        <p className="max-w-xl text-ink-600">
          Send us a message and we&apos;ll add your review here. It genuinely helps
          other customers decide.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
            <WhatsappIcon className="h-4 w-4" />
            Send a review on WhatsApp
          </a>
          <a
            href={withUtm(settings.instagram, "website", "reviews")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            <InstagramIcon className="h-4 w-4" />
            DM on Instagram
          </a>
        </div>
      </section>
    </div>
  );
}
