import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getSettings } from "@/lib/settings";
import { buildWhatsappUrl, withUtm } from "@/lib/whatsapp";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  const whatsappHref = withUtm(
    buildWhatsappUrl({
      number: settings.whatsapp,
      template: settings.whatsappTemplate,
    }),
    "website",
    "header",
  );

  return (
    <div className="flex min-h-full flex-col">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <SiteHeader businessName={settings.businessName} whatsappHref={whatsappHref} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
