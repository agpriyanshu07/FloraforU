import { formatPrice } from "./format";

/**
 * What a product costs while a campaign is running.
 *
 * One function, because the old price and the new one appear on the card, the
 * product page, the offers page and the sticky bar — and a shop where the
 * catalogue and the product page disagree about a sale price is a shop that
 * gets argued with on WhatsApp.
 */
export type OfferPricing = {
  /** The everyday price, struck through when there is a discount. */
  originalLabel: string;
  /** What the customer pays now. Equals originalLabel when nothing is off. */
  currentLabel: string;
  /** Whole percent off, for the badge. Null when there is no real discount. */
  percentOff: number | null;
  /** Rupees saved, for the "you save" line. Null when there is no discount. */
  saving: number | null;
};

export type OfferTerms = {
  /** Applies to every product in the campaign. */
  discountPercent?: number | null;
  /** Overrides the percentage for this one product. */
  offerPrice?: number | null;
};

/**
 * Rounded to whole rupees. A shop quotes ₹1,000, not ₹999.60, and the figure
 * on the site has to be the figure said on the phone.
 */
export function offerPriceOf(
  price: number | null | undefined,
  priceOnEnquiry: boolean,
  terms: OfferTerms | null | undefined,
): number | null {
  if (priceOnEnquiry || price === null || price === undefined || !terms) return null;

  if (terms.offerPrice !== null && terms.offerPrice !== undefined) {
    // A stored override that is not actually cheaper is treated as no offer
    // rather than shown as one — a struck-through price that saves nothing is
    // the kind of thing that gets a shop accused of faking discounts.
    return terms.offerPrice < price ? Math.round(terms.offerPrice) : null;
  }

  const percent = terms.discountPercent;
  if (!percent || percent <= 0 || percent >= 100) return null;
  const discounted = Math.round(price * (1 - percent / 100));
  return discounted < price ? discounted : null;
}

export function pricingFor(
  price: number | null | undefined,
  priceOnEnquiry: boolean,
  terms: OfferTerms | null | undefined,
): OfferPricing {
  const original = formatPrice(price, priceOnEnquiry);
  const discounted = offerPriceOf(price, priceOnEnquiry, terms);

  if (discounted === null || price === null || price === undefined) {
    return {
      originalLabel: original,
      currentLabel: original,
      percentOff: null,
      saving: null,
    };
  }

  return {
    originalLabel: original,
    currentLabel: formatPrice(discounted, false),
    // Rounded from the real prices rather than echoing the campaign's own
    // percentage, so the badge can never disagree with the two numbers beside it.
    percentOff: Math.round(((price - discounted) / price) * 100),
    saving: price - discounted,
  };
}

/**
 * The line appended to a WhatsApp enquiry when the customer is looking at a
 * sale price, so the shop opens the chat already knowing which figure was on
 * screen. Null when nothing is discounted — an enquiry gains nothing from a
 * sentence repeating the price already in the template's link.
 */
export function enquiryPriceNote(pricing: OfferPricing): string | null {
  if (pricing.percentOff === null) return null;
  return `Seen on the website at ${pricing.currentLabel} (was ${pricing.originalLabel}, ${pricing.percentOff}% off).`;
}
