/**
 * Builds the wa.me deep link behind every Enquire button.
 *
 * The template is admin-editable (Settings → WhatsApp default message) and
 * supports three tokens:
 *   {product} — product name
 *   {code}    — " (code 2001)" or "" when the product has no code
 *   {url}     — absolute link back to the product page
 *
 * Callers that already have the exact wording they want — an offer enquiry, a
 * saved list — pass `message` instead and skip templating entirely.
 *
 * wa.me needs a digits-only number with country code and no leading "+".
 */
export function normaliseWhatsappNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function buildWhatsappUrl({
  number,
  template,
  message,
  productName,
  productCode,
  productUrl,
  note,
}: {
  number: string;
  template?: string;
  /**
   * A complete message, used as-is. Without this, a caller with no product had
   * its wording silently replaced by the generic fallback below — which is what
   * happened to the offer and review enquiries for as long as they existed.
   */
  message?: string;
  productName?: string;
  productCode?: string | null;
  /**
   * Appended after the template. Used to carry the sale price the customer was
   * actually looking at: without it the shop reads "enquiring about Dry Flower
   * Bunch", quotes the everyday rate, and the customer has to argue the
   * discount they saw a second earlier.
   */
  note?: string;
  productUrl?: string;
}): string {
  const text = (
    message
      ? message
      : productName && template
        ? template
            .replace("{product}", productName)
            .replace("{code}", productCode ? ` (code ${productCode})` : "")
            .replace("{url}", productUrl ?? "")
        : // No product to substitute in, so the admin template's {product}
          // tokens would render literally. A generic opener is the safe result.
          "Hi FloralforU! I'd like to enquire about your event décor items."
  ).trim();

  const body = note ? `${text}\n\n${note}` : text;

  return `https://wa.me/${normaliseWhatsappNumber(number)}?text=${encodeURIComponent(body)}`;
}

/** Adds UTM tags so WhatsApp traffic from the site is attributable. */
export function withUtm(url: string, source: string, medium = "website"): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", medium);
  return u.toString();
}

/**
 * A link that opens a message thread with the shop, rather than its profile.
 *
 * "DM on Instagram" used to point at the profile page, so it promised a
 * conversation and delivered a grid of photos — the customer then had to find
 * Message themselves. ig.me/m/<handle> is Instagram's own direct-message link
 * and opens the thread in the app.
 *
 * Falls back to the profile URL when the handle can't be read out of the
 * stored address, because a link to the right shop beats a broken one.
 */
export function instagramDmUrl(profileUrl: string): string {
  const handle = profileUrl
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@/, "");

  return /^[A-Za-z0-9._]{1,30}$/.test(handle)
    ? `https://ig.me/m/${handle}`
    : profileUrl;
}
