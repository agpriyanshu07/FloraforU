import type { Metadata } from "next";
import Image from "next/image";
import ProductGrid from "@/components/ProductGrid";
import Countdown from "@/components/Countdown";
import EmptyState from "@/components/EmptyState";
import EnquireButton from "@/components/EnquireButton";
import { SparkIcon } from "@/components/icons";
import { getSettings } from "@/lib/settings";
import { buildWhatsappUrl, withUtm } from "@/lib/whatsapp";
import { getActiveOffers, getOfferEnquiryCount, getPastOffers } from "@/lib/queries";
import { offerTheme } from "@/lib/offers";
import ShareToStory from "@/components/ShareToStory";

// Cached, with admin edits pushing through immediately via revalidatePath.
// The short window is a backstop for offers starting or ending on their own.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Current offers",
  description:
    "Named, time-bound seasonal sales from FloralforU — festive décor, lamps, flowers and event equipment at our best rates. Enquire on WhatsApp before the offer ends.",
};

const dateFmt = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function OffersPage() {
  const [settings, active, past] = await Promise.all([
    getSettings(),
    getActiveOffers(),
    getPastOffers(),
  ]);

  // Real counts off the Enquiry log, one per campaign.
  const enquiryCounts = await Promise.all(
    active.map((offer) => getOfferEnquiryCount(offer.id)),
  );

  return (
    <div className="shell py-10">
      <header className="mb-8 max-w-3xl">
        <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)]">Current offers</h1>
        <p className="mt-2 text-ink-600">
          We run named, time-bound sales around the festive calendar. Mention the
          offer name when you message us and we&apos;ll apply the rate.
        </p>
      </header>

      {active.length === 0 ? (
        <EmptyState
          title="No offer running right now"
          body="Our next seasonal sale will show up here — and on Instagram first. Follow @floralforu_ so you don't miss it."
          actionLabel="Browse the catalogue"
          actionHref="/catalogue"
          icon={<SparkIcon className="h-8 w-8" />}
        />
      ) : (
        <div className="space-y-14">
          {active.map((offer, i) => {
            const theme = offerTheme(offer.theme);
            const enquiries = enquiryCounts[i];
            const wa = withUtm(
              buildWhatsappUrl({
                number: settings.whatsapp,
                message: `Hi FloralforU! I'd like to enquire about the "${offer.title}" offer.`,
              }),
              "website",
              `offer-${offer.slug}`,
            );

            return (
              <section key={offer.id} aria-labelledby={`offer-${offer.id}`}>
                <div className="card overflow-hidden">
                  {offer.bannerUrl && (
                    <div className="relative aspect-[16/6] bg-marigold-50">
                      <Image
                        src={offer.bannerUrl}
                        alt={`${offer.title} banner (placeholder artwork, awaiting real campaign banner)`}
                        fill
                        sizes="(max-width: 1200px) 100vw, 1160px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap items-end justify-between gap-4 p-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 id={`offer-${offer.id}`} className="font-display text-3xl">
                          {offer.title}
                        </h2>
                        {offer.discountLabel && (
                          <span
                            className={`rounded-md ${theme.bg} px-2.5 py-1 text-sm font-bold uppercase tracking-wide text-white`}
                          >
                            {offer.discountLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 max-w-2xl text-ink-600">{offer.description}</p>
                      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-600">
                        <span>
                          {dateFmt(offer.startsAt)} – {dateFmt(offer.endsAt)}
                        </span>
                        <Countdown
                          endsAt={offer.endsAt.toISOString()}
                          fallback={`Ends ${dateFmt(offer.endsAt)}`}
                          urgentWithinHours={offer.urgentWithinHours}
                          chipClass={theme.chip}
                          escalate
                        />
                      </p>
                      {/* Genuine figure from the Enquiry log. Hidden at 0 rather
                          than printed, which would read as a negative signal. */}
                      {enquiries > 0 && (
                        <p className="mt-2 text-sm text-ink-600">
                          {enquiries} {enquiries === 1 ? "person has" : "people have"}{" "}
                          enquired about these items this week.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <EnquireButton
                        href={wa}
                        label="Enquire on WhatsApp"
                        className="btn-accent"
                      />
                      <ShareToStory
                        productName={offer.title}
                        spec={offer.description}
                        price={offer.discountLabel ?? ""}
                        handle={settings.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "")}
                        label="Download sale poster"
                        offer={{
                          title: offer.title,
                          discountLabel: offer.discountLabel,
                          endsAtLabel: `Ends ${dateFmt(offer.endsAt)}`,
                          theme: offer.theme,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <h3 className="mb-4 mt-7 font-display text-xl">
                  {offer.products.length} items in this offer
                </h3>
                <ProductGrid
                  products={offer.products.map((op) => op.product)}
                  settings={settings}
                  offerTerms={
                    new Map(
                      offer.products.map((op) => [
                        op.productId,
                        { offerPrice: op.offerPrice, discountPercent: offer.discountPercent },
                      ]),
                    )
                  }
                />
              </section>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-offers" className="mt-16 border-t border-line pt-10">
          <h2 id="past-offers" className="font-display text-2xl">
            Past campaigns
          </h2>
          <p className="mt-1 text-ink-600">
            These have ended — message us for current pricing on anything you saw here.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((o) => (
              <li key={o.id} className="card p-4">
                <h3 className="font-display text-lg">{o.title}</h3>
                <p className="mt-1 text-sm text-ink-600">{o.description}</p>
                <p className="mt-2 text-[13px] font-semibold text-ink-600">
                  Ended {dateFmt(o.endsAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
