import Image from "next/image";
import Link from "next/link";
import Countdown from "./Countdown";
import { ArrowRightIcon, SparkIcon } from "./icons";
import { offerTheme } from "@/lib/offers";
import { formatPrice } from "@/lib/format";

export type StripProduct = {
  slug: string;
  name: string;
  price: number | null;
  priceOnEnquiry: boolean;
  imageUrl: string | null;
  imageAlt: string;
};

export type StripOffer = {
  id: string;
  slug: string;
  title: string;
  description: string;
  discountLabel: string | null;
  endsAt: string;
  endsAtLabel: string;
  theme: string;
  urgentWithinHours: number;
  enquiriesThisWeek: number;
  products: StripProduct[];
};

/**
 * The homepage sale module.
 *
 * This used to be a second full-bleed coloured bar, which put the campaign
 * name, the same countdown and the same "view offers" button on screen twice —
 * once in the site-wide ribbon above the header, then again below the hero.
 * Two identical bars read as a rendering bug rather than as a sale.
 *
 * So the two surfaces now do different jobs. The ribbon is the thin persistent
 * reminder that a sale is on. This is the merchandising: what is actually
 * discounted, in pictures, with a way in. The campaign colour survives as a
 * single accent rule rather than a full-width wash, which is what stops it
 * reading as "the orange bar, again".
 *
 * Multiple live campaigns stack as cards. The previous version rotated them
 * through a carousel, which meant the second campaign was behind a timer and,
 * with reduced motion, behind nothing at all. Stacking shows every campaign to
 * everybody and needs no motion, no timer and no special case.
 */
export default function OfferStrip({ offers }: { offers: StripOffer[] }) {
  if (offers.length === 0) return null;

  return (
    <section
      aria-labelledby="offer-strip-heading"
      className="border-y border-line bg-rose-50/60 py-14"
    >
      <div className="shell">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="offer-strip-heading" className="font-display text-3xl">
              {offers.length > 1 ? "Sales on right now" : "Sale on right now"}
            </h2>
            <p className="mt-1 text-ink-600">
              Rates below are already discounted. Message us to confirm stock and
              delivery for your date.
            </p>
          </div>
          <Link href="/offers" className="btn-ghost btn-sm">
            All offers
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <ul className="grid gap-5">
          {offers.map((offer) => {
            const theme = offerTheme(offer.theme);
            return (
              <li key={offer.id} className="card overflow-hidden">
                {/* The campaign colour, kept to a rule. A full-width themed
                    block here is what made this look like a duplicate ribbon. */}
                <div aria-hidden className={`h-1.5 ${theme.bg}`} />

                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <SparkIcon className={`h-5 w-5 shrink-0 ${theme.onCream}`} />
                    <h3 className="font-display text-2xl">{offer.title}</h3>

                    {offer.discountLabel && (
                      <span
                        className={`rounded-md ${theme.bg} px-2.5 py-1 text-sm font-bold uppercase tracking-wide text-white`}
                      >
                        {offer.discountLabel}
                      </span>
                    )}

                    <Countdown
                      endsAt={offer.endsAt}
                      fallback={`Ends ${offer.endsAtLabel}`}
                      urgentWithinHours={offer.urgentWithinHours}
                      escalate
                    />
                  </div>

                  {offer.description && (
                    <p className="mt-2 max-w-2xl text-ink-600">{offer.description}</p>
                  )}

                  {/* Real figure from the Enquiry log. Hidden at 0 rather than
                      printed as "0 people", which reads as a negative signal. */}
                  {offer.enquiriesThisWeek > 0 && (
                    <p className="mt-2 text-sm text-ink-600">
                      {offer.enquiriesThisWeek}{" "}
                      {offer.enquiriesThisWeek === 1 ? "person has" : "people have"}{" "}
                      enquired about these items this week.
                    </p>
                  )}

                  {offer.products.length > 0 && (
                    <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                      {offer.products.map((p) => (
                        <li key={p.slug}>
                          <Link
                            href={`/product/${p.slug}`}
                            className="group block focus-visible:outline-none"
                          >
                            <span className="relative block aspect-square overflow-hidden rounded-xl border border-line bg-cream">
                              {p.imageUrl && (
                                <Image
                                  src={p.imageUrl}
                                  alt={p.imageAlt || p.name}
                                  fill
                                  sizes="(max-width: 640px) 45vw, 200px"
                                  className="object-cover transition-transform duration-200 motion-safe:group-hover:scale-105"
                                />
                              )}
                            </span>
                            <span className="mt-1.5 block truncate text-sm font-medium group-hover:text-rose-700">
                              {p.name}
                            </span>
                            <span className="block text-sm text-ink-600">
                              {formatPrice(p.price, p.priceOnEnquiry)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-5">
                    <Link href="/offers" className="btn-primary btn-sm">
                      See the {offer.title}
                      <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
