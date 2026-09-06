import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import EnquireButton from "@/components/EnquireButton";
import {
  ClockIcon,
  InstagramIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
} from "@/components/icons";
import { getSettings } from "@/lib/settings";
import { buildWhatsappUrl, withUtm } from "@/lib/whatsapp";

// Cached; admin writes revalidate this path explicitly, so the window is a backstop.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Contact & directions",
  description:
    "Visit FloralforU at Bank More, Dhanbad, or message us on WhatsApp. Shop address, phone, hours and directions.",
};

/** Shared by both action buttons so the row divides evenly. min-w-0 lets a
 *  column shrink below its label's width, which is what makes the grid hold. */
const contactBtn = "min-w-0 !px-3 text-center leading-tight break-words sm:!px-5";

export default async function ContactPage() {
  const settings = await getSettings();
  const wa = withUtm(
    buildWhatsappUrl({ number: settings.whatsapp, template: settings.whatsappTemplate }),
    "website",
    "contact-page",
  );
  const fullAddress = `${settings.addressLine}, ${settings.city} – ${settings.pincode}`;
  const mapSrc =
    settings.mapEmbedUrl ||
    `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`;

  return (
    <div className="shell py-10">
      <header className="mb-8 max-w-3xl">
        <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)]">Contact us</h1>
        <p className="mt-2 text-ink-600">
          WhatsApp is the fastest way to reach us — send a photo or a voice note
          and we&apos;ll tell you what we have and what it costs. No online
          payments, no order forms to fill in.
        </p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-display text-2xl">Visit the shop</h2>
            <ul className="mt-4 space-y-4 text-[15px]">
              <li className="flex gap-3">
                <PinIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <span>
                  <span className="block font-semibold">Address</span>
                  <address className="not-italic text-ink-600">{fullAddress}</address>
                </span>
              </li>
              <li className="flex gap-3">
                <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <span>
                  <span className="block font-semibold">Hours</span>
                  <span className="text-ink-600">{settings.hours}</span>
                </span>
              </li>
              <li className="flex gap-3">
                <PhoneIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <span>
                  <span className="block font-semibold">Phone</span>
                  <a
                    href={`tel:${settings.phone.replace(/\s/g, "")}`}
                    className="text-ink-600 hover:text-rose-700"
                  >
                    {settings.phone}
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <MailIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <span>
                  <span className="block font-semibold">Email</span>
                  <a
                    href={`mailto:${settings.email}`}
                    className="text-ink-600 hover:text-rose-700"
                  >
                    {settings.email}
                  </a>
                </span>
              </li>
            </ul>

            {/* One row on every width, two equal columns sharing whatever the
                card gives them. The phone number above is itself a tel: link,
                so calling is still one tap from here without a button of its
                own. Verified from 320px to 1440px; nothing clips and the 44px
                touch target holds throughout. */}
            <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3">
              <EnquireButton
                href={wa}
                label="Chat on WhatsApp"
                className={`${contactBtn} btn-whatsapp`}
              />
              <a
                href={withUtm(settings.instagram, "website", "contact-page")}
                target="_blank"
                rel="noopener noreferrer"
                className={`${contactBtn} btn-ghost`}
              >
                <InstagramIcon className="h-4 w-4 shrink-0" />
                Instagram
              </a>
            </div>

            {settings.gstin && (
              <p className="mt-6 border-t border-line pt-4 text-[13px] text-ink-600">
                Registered as {settings.legalName} · GSTIN {settings.gstin}
              </p>
            )}
          </div>

          <div className="card overflow-hidden">
            <iframe
              src={mapSrc}
              title={`Map showing ${settings.businessName} at ${fullAddress}`}
              className="aspect-[4/3] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
