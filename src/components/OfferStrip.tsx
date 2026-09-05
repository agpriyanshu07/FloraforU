import Image from "next/image";
import Link from "next/link";
import Countdown from "./Countdown";
import Reveal from "./Reveal";
import { ArrowRightIcon } from "./icons";
import { offerTheme } from "@/lib/offers";

export type StripProduct = {
  slug: string;
  name: string;
  imageUrl: string | null;
};

export type StripOffer = {
  id: string;
  slug: string;
  title: string;
  description: string;
  bannerUrl: string | null;
  discountLabel: string | null;
  endsAt: string;
  endsAtLabel: string;
  theme: string;
  urgentWithinHours: number;
  enquiriesThisWeek: number;
  products: StripProduct[];
};

/** Decorative drifting motes. Fixed positions so the layout never shifts. */
const MOTES = [
  { left: "6%", top: "18%", size: 6, delay: "0s" },
  { left: "18%", top: "72%", size: 4, delay: "1.4s" },
  { left: "34%", top: "12%", size: 5, delay: "2.8s" },
  { left: "62%", top: "80%", size: 5, delay: "0.7s" },
  { left: "78%", top: "26%", size: 7, delay: "2.1s" },
  { left: "92%", top: "62%", size: 4, delay: "3.5s" },
];

/**
 * The homepage offers section.
 *
 * This was previously a second full-bleed coloured bar, which repeated the
 * ribbon above the header almost word for word — the same campaign name, the
 * same countdown, the same button — so a live sale appeared twice and read as
 * a rendering fault. The ribbon stays the thin persistent reminder; this is
 * where the campaign is actually presented, banner and all.
 *
 * Multiple live campaigns stack. The version before this rotated them through
 * a carousel, which put the second campaign behind a timer and, under reduced
 * motion, behind nothing at all.
 */
export default function OfferStrip({ offers }: { offers: StripOffer[] }) {
  if (offers.length === 0) return null;

  return (
    <section
      aria-labelledby="offer-strip-heading"
      className="relative overflow-hidden border-y border-line bg-gradient-to-b from-cream via-marigold-50/40 to-cream py-16"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {MOTES.map((m, i) => (
          <span
            key={i}
            className="ffu-mote absolute rounded-full bg-marigold-600/40"
            style={{
              left: m.left,
              top: m.top,
              width: m.size,
              height: m.size,
              animationDelay: m.delay,
            }}
          />
        ))}
      </div>

      <div className="shell relative">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="offer-strip-heading" className="font-display text-[clamp(1.9rem,4vw,2.6rem)]">
            {offers.length > 1 ? "Current offers" : "Current offer"}
          </h2>
          <p className="mt-2 text-ink-600">
            Limited-time deals on our décor and floral collection.
          </p>
        </div>

        <ul className="mx-auto mt-10 grid max-w-4xl gap-8">
          {offers.map((offer, i) => {
            const theme = offerTheme(offer.theme);
            // The campaign banner if the owner set one, otherwise the first
            // product photo — better than an empty frame either way.
            const art = offer.bannerUrl ?? offer.products[0]?.imageUrl ?? null;

            return (
              <li key={offer.id}>
                <Reveal delayMs={i * 90}>
                  <Link
                    href="/offers"
                    className="group block overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-all duration-300 hover:shadow-xl motion-safe:hover:-translate-y-1"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-marigold-50 sm:aspect-[16/7]">
                      {art && (
                        <Image
                          src={art}
                          alt=""
                          fill
                          sizes="(max-width: 900px) 100vw, 880px"
                          className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                        />
                      )}

                      <span className="absolute right-4 top-4">
                        <Countdown
                          endsAt={offer.endsAt}
                          fallback={`Ends ${offer.endsAtLabel}`}
                          urgentWithinHours={offer.urgentWithinHours}
                          chipClass="bg-ink-900/85 backdrop-blur-sm"
                          escalate
                        />
                      </span>

                      {offer.discountLabel && (
                        <span
                          className={`absolute left-4 top-4 rounded-md ${theme.bg} px-2.5 py-1 text-sm font-bold uppercase tracking-wide text-white`}
                        >
                          {offer.discountLabel}
                        </span>
                      )}
                    </div>

                    <div className="p-5 sm:p-6">
                      <h3
                        className={`font-display text-xl uppercase tracking-wide transition-colors duration-200 ${theme.hoverText}`}
                      >
                        {offer.title}
                      </h3>
                      {offer.description && (
                        <p className="mt-1.5 text-ink-600">{offer.description}</p>
                      )}

                      {/* Real figure from the Enquiry log. Hidden at 0 rather
                          than printed as "0 people", which reads as a negative
                          signal rather than a neutral one. */}
                      {offer.enquiriesThisWeek > 0 && (
                        <p className="mt-2 text-sm text-ink-600">
                          {offer.enquiriesThisWeek}{" "}
                          {offer.enquiriesThisWeek === 1 ? "person has" : "people have"}{" "}
                          enquired about these items this week.
                        </p>
                      )}
                    </div>
                  </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>

        <div className="mt-9 text-center">
          <Link href="/offers" className="btn-primary group">
            View all offers
            <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
