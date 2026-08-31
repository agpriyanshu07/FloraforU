/**
 * Builds the wa.me deep link behind every Enquire button.
 *
 * The template is admin-editable (Settings → WhatsApp default message) and
 * supports three tokens:
 *   {product} — product name
 *   {code}    — " (code 2001)" or "" when the product has no code
 *   {url}     — absolute link back to the product page
 *
 * wa.me needs a digits-only number with country code and no leading "+".
 */
export function normaliseWhatsappNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function buildWhatsappUrl({
  number,
  template,
  productName,
  productCode,
  productUrl,
}: {
  number: string;
  template: string;
  productName?: string;
  productCode?: string | null;
  productUrl?: string;
}): string {
  const text = (
    productName
      ? template
          .replace("{product}", productName)
          .replace("{code}", productCode ? ` (code ${productCode})` : "")
          .replace("{url}", productUrl ?? "")
      : "Hi FloralforU! I'd like to enquire about your event décor items."
  ).trim();

  return `https://wa.me/${normaliseWhatsappNumber(number)}?text=${encodeURIComponent(text)}`;
}

/** Adds UTM tags so WhatsApp traffic from the site is attributable. */
export function withUtm(url: string, source: string, medium = "website"): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", medium);
  return u.toString();
}
