import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BackToTop from "@/components/BackToTop";
import OfferRibbon from "@/components/OfferRibbon";
import { getSettings } from "@/lib/settings";
import { getActiveOffers } from "@/lib/queries";
import { buildWhatsappUrl, withUtm } from "@/lib/whatsapp";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [settings, offers] = await Promise.all([getSettings(), getActiveOffers()]);

  const whatsappHref = withUtm(
    buildWhatsappUrl({
      number: settings.whatsapp,
      template: settings.whatsappTemplate,
    }),
    "website",
    "header",
  );

  // getActiveOffers already sorts by priority then soonest-ending, so the
  // ribbon carries whichever campaign the shop most wants seen. It sits above
  // the header rather than fixed over the page: a persistent fixed bar would
  // eat vertical space on every scroll and is a known focus-order hazard.
  const lead = offers[0];

  return (
    <div className="flex min-h-full flex-col">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      {lead && (
        <OfferRibbon
          offer={{
            id: lead.id,
            title: lead.title,
            discountLabel: lead.discountLabel,
            endsAt: lead.endsAt.toISOString(),
            endsAtLabel: lead.endsAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            }),
            theme: lead.theme,
            urgentWithinHours: lead.urgentWithinHours,
          }}
        />
      )}
      <SiteHeader
        businessName={settings.businessName}
        whatsappHref={whatsappHref}
        instagramHref={withUtm(settings.instagram, "website", "header")}
      />
      {/* tabIndex -1 so the skip link and Back to top can move focus here. */}
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter settings={settings} />
      <BackToTop />
    </div>
  );
}
