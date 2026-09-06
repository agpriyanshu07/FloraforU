import { pricingFor, type OfferTerms } from "@/lib/pricing";

/**
 * A product's price, with the everyday one struck through when a campaign is
 * running. Used on cards, the product page and the sticky bar so all three
 * quote the same figure.
 *
 * The struck price is the one in red: it is the number being taken away, and
 * red-on-crossed-out is what a shopper already reads as "was". The price they
 * actually pay stays in the ink colour at full weight, so the largest, darkest
 * number on the card is always the one they owe.
 */
export default function Price({
  price,
  priceOnEnquiry,
  terms,
  size = "card",
  className = "",
}: {
  price: number | null | undefined;
  priceOnEnquiry: boolean;
  terms?: OfferTerms | null;
  size?: "card" | "page";
  className?: string;
}) {
  const { originalLabel, currentLabel, percentOff, saving } = pricingFor(
    price,
    priceOnEnquiry,
    terms,
  );

  const currentClass =
    size === "page"
      ? "font-display text-3xl text-ink-900"
      : "text-lg font-semibold text-ink-900";

  if (percentOff === null) {
    return <p className={`${currentClass} ${className}`}>{currentLabel}</p>;
  }

  return (
    <div className={className}>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={currentClass}>{currentLabel}</span>
        {/* aria-label rather than the bare number: a screen reader announces
            "1,250" with no way to hear the line through it, which would sound
            like the price went up. */}
        <span
          aria-label={`Was ${originalLabel}`}
          className={`text-red-700 line-through ${size === "page" ? "text-lg" : "text-sm"}`}
        >
          {originalLabel}
        </span>
        <span
          className={`rounded-full bg-red-700 px-2 py-0.5 font-semibold text-white ${
            size === "page" ? "text-[13px]" : "text-[11px]"
          }`}
        >
          {percentOff}% off
        </span>
      </p>
      {size === "page" && saving !== null && (
        <p className="mt-1 text-sm font-medium text-sage-700">
          You save ₹{new Intl.NumberFormat("en-IN").format(saving)} in this sale.
        </p>
      )}
    </div>
  );
}
