"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Countdown from "./Countdown";
import { ArrowRightIcon, SparkIcon } from "./icons";
import { offerTheme } from "@/lib/offers";

export type StripOffer = {
  id: string;
  slug: string;
  title: string;
  discountLabel: string | null;
  endsAt: string;
  endsAtLabel: string;
  theme: string;
  urgentWithinHours: number;
  /** Real count from the Enquiry table; 0 means "don't show a number". */
  enquiriesThisWeek: number;
};

const ROTATE_MS = 5000;

/**
 * Homepage campaign strip.
 *
 * Previously the homepage rendered `offers[0]` only, so a second simultaneous
 * campaign was invisible unless a visitor happened to open /offers. This
 * renders every active campaign: one is static, several rotate.
 *
 * Rotation pauses on hover and on keyboard focus, and does not start at all
 * under prefers-reduced-motion — in that case the offers are all rendered
 * stacked instead, so nothing becomes unreachable just because motion is off.
 */
export default function OfferStrip({ offers }: { offers: StripOffer[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const regionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const rotating = offers.length > 1 && !reducedMotion;

  useEffect(() => {
    if (!rotating || paused) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % offers.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [rotating, paused, offers.length]);

  if (offers.length === 0) return null;

  // Reduced motion, or a single offer: render everything, no rotation, no
  // controls. Stacking is the honest fallback — hiding offers behind a paused
  // carousel would make them unreachable for exactly the users who opted out.
  const shown = rotating ? [offers[index]] : offers;

  return (
    <section
      ref={regionRef}
      aria-labelledby="offer-strip-heading"
      aria-roledescription={rotating ? "carousel" : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Named distinctly from the site-wide ribbon: two landmarks both called
          "Current offer" is a real problem when you are moving by region. */}
      <h2 id="offer-strip-heading" className="sr-only">
        {offers.length > 1 ? `${offers.length} offers running now` : "Offer running now"}
      </h2>

      {shown.map((offer) => {
        const theme = offerTheme(offer.theme);
        return (
          <div key={offer.id} className={`${theme.bg} text-white`}>
            <div className="shell flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <SparkIcon className="h-5 w-5 shrink-0" />
                <span className="font-display text-xl">{offer.title}</span>

                {offer.discountLabel && (
                  <span className="rounded-md bg-white/20 px-2 py-0.5 text-sm font-bold uppercase tracking-wide">
                    {offer.discountLabel}
                  </span>
                )}

                <Countdown
                  endsAt={offer.endsAt}
                  fallback={`Ends ${offer.endsAtLabel}`}
                  urgentWithinHours={offer.urgentWithinHours}
                  chipClass={theme.chip}
                  escalate
                />

                {/* Real figure from the Enquiry log, not a manufactured one.
                    Hidden entirely at 0 rather than printed as "0 people".
                    Full white rather than white/85: at 13px the faded variant
                    measures 4.08:1 on marigold-600 and fails AA. */}
                {offer.enquiriesThisWeek > 0 && (
                  <span className="text-[13px] text-white">
                    {offer.enquiriesThisWeek}{" "}
                    {offer.enquiriesThisWeek === 1 ? "enquiry" : "enquiries"} this week
                  </span>
                )}
              </div>

              <Link
                href="/offers"
                className={`btn btn-sm shrink-0 bg-white ${theme.buttonText} hover:bg-cream`}
              >
                View all offers
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        );
      })}

      {rotating && (
        <div className="bg-ink-900/90">
          <div className="shell flex items-center justify-center gap-2 py-1.5">
            {offers.map((offer, i) => (
              <button
                key={offer.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index}
                className={`grid h-11 w-8 place-items-center ${
                  i === index ? "opacity-100" : "opacity-50 hover:opacity-80"
                }`}
              >
                <span
                  aria-hidden
                  className={`block h-1.5 rounded-full bg-white transition-all duration-200 ${
                    i === index ? "w-6" : "w-1.5"
                  }`}
                />
                <span className="sr-only">
                  Show offer {i + 1} of {offers.length}: {offer.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
