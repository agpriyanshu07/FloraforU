import { PageHeader, Banner } from "@/components/admin/ui";
import SettingsForm from "./SettingsForm";
import { getSettings, placeholderSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  const placeholders = placeholderSettings(settings);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Business details, contact channels and SEO defaults. Changes apply to the public site immediately."
      />

      {placeholders.length > 0 && (
        <Banner tone="error">
          Still using the build-time placeholder for{" "}
          <strong>{placeholders.join(", ")}</strong>.
          {/* The WhatsApp line used to print regardless of what was actually
              unset, so a shop with a working number and only a placeholder
              email was told its Enquire buttons were broken. Only say it when
              it is true. */}
          {placeholders.includes("WhatsApp number") && (
            <>
              {" "}Every Enquire button on the site opens a chat with that number,
              so nothing can reach you until it is set.
            </>
          )}
          {placeholders.includes("Site URL") && (
            <>
              {" "}The site URL goes into every canonical tag and the sitemap, so
              search engines are being pointed at the wrong address.
            </>
          )}
        </Banner>
      )}

      <SettingsForm settings={settings} />
    </>
  );
}
