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
          Still using placeholder values for: <strong>{placeholders.join(", ")}</strong>. Every
          Enquire button on the site depends on the WhatsApp number — set it before launch.
        </Banner>
      )}

      <SettingsForm settings={settings} />
    </>
  );
}
