import { serialiseJsonLd } from "@/lib/json-ld";
import type { SiteSettings } from "@/lib/settings";

/** One escaped ld+json block. Every structured-data emitter goes through this. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialiseJsonLd(data) }}
    />
  );
}

/**
 * The shop itself, on every public page.
 *
 * This is the piece a local business cannot do without: it is how a search
 * engine learns that FloralforU is a shop in Dhanbad with an address and a
 * phone number, rather than a website that happens to mention Dhanbad. The
 * product pages already describe their products; nothing described the shop.
 *
 * Only fields the settings actually hold are emitted. In particular the opening
 * hours are deliberately absent: `settings.hours` is free text the owner types
 * ("Mon–Sat, 10am–8pm"), and schema.org wants a strict machine format, so
 * publishing it raw would be worse than publishing nothing — it would be
 * telling search engines something false in a field they act on.
 */
export function LocalBusinessJsonLd({ settings }: { settings: SiteSettings }) {
  const url = settings.siteUrl.replace(/\/$/, "");

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Store",
        "@id": `${url}/#shop`,
        name: settings.businessName,
        ...(settings.legalName && settings.legalName !== settings.businessName
          ? { legalName: settings.legalName }
          : {}),
        description: settings.seoDescription,
        url,
        image: `${url}/opengraph-image`,
        ...(settings.phone ? { telephone: settings.phone } : {}),
        ...(settings.email ? { email: settings.email } : {}),
        address: {
          "@type": "PostalAddress",
          ...(settings.addressLine ? { streetAddress: settings.addressLine } : {}),
          addressLocality: settings.city,
          ...(settings.pincode ? { postalCode: settings.pincode } : {}),
          addressCountry: "IN",
        },
        areaServed: settings.city,
        ...(settings.instagram ? { sameAs: [settings.instagram] } : {}),
      }}
    />
  );
}

/**
 * The trail above a page, for the breadcrumb line search engines show under a
 * result instead of a bare URL. The site already renders these visually; this
 * says the same thing in the form a crawler reads.
 */
export function BreadcrumbJsonLd({
  trail,
  siteUrl,
}: {
  trail: { name: string; path: string }[];
  siteUrl: string;
}) {
  const base = siteUrl.replace(/\/$/, "");
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: trail.map((step, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: step.name,
          item: `${base}${step.path}`,
        })),
      }}
    />
  );
}
