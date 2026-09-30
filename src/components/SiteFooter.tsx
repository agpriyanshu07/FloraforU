import Link from "next/link";
import Image from "next/image";
import { InstagramColorIcon, MailIcon, PhoneIcon, PinIcon, WhatsappIcon } from "./icons";
import type { SiteSettings } from "@/lib/settings";
import { buildWhatsappUrl, withUtm } from "@/lib/whatsapp";

export default function SiteFooter({ settings }: { settings: SiteSettings }) {
  const wa = withUtm(
    buildWhatsappUrl({ number: settings.whatsapp, template: settings.whatsappTemplate }),
    "website",
    "footer",
  );

  return (
    <footer className="mt-20 border-t border-line bg-rose-50">
      <div className="shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          {/* Room here for the full lockup, wordmark and all. */}
          <Image
            src="/img/brand/logo-ffu.svg"
            alt=""
            width={127}
            height={112}
            className="mb-3 h-28 w-auto"
          />
          <p className="font-display text-2xl">{settings.businessName}</p>
          <p className="mt-2 text-sm text-ink-600">{settings.tagline}</p>
          {/* Both are optional, so the whole block goes when neither is set
              rather than leaving two headings over empty space. */}
          {[
            ["Followers", settings.followerCount],
            ["Events served", settings.eventsCount],
          ].some(([, v]) => v.trim() !== "") && (
            <dl className="mt-5 flex gap-6 text-sm">
              {[
                ["Followers", settings.followerCount],
                ["Events served", settings.eventsCount],
              ]
                .filter(([, value]) => value.trim() !== "")
                .map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-ink-600">{label}</dt>
                    <dd className="font-display text-xl text-rose-600">{value}</dd>
                  </div>
                ))}
            </dl>
          )}
        </div>

        <nav aria-label="Catalogue links">
          <h2 className="font-display text-lg">Browse</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              ["/catalogue", "Full catalogue"],
              ["/categories", "All categories"],
              ["/offers", "Current offers"],
              ["/reviews", "Customer reviews"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-ink-600 hover:text-rose-700">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company links">
          <h2 className="font-display text-lg">Shop</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/about" className="text-ink-600 hover:text-rose-700">
                About FloralforU
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-ink-600 hover:text-rose-700">
                Contact & directions
              </Link>
            </li>
            <li>
              <a
                href="/api/catalogue-pdf"
                className="text-ink-600 hover:text-rose-700"
              >
                Download catalogue PDF
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-lg">Reach us</h2>
          <ul className="mt-3 space-y-3 text-sm text-ink-600">
            <li className="flex gap-2">
              <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>
                {settings.addressLine}, {settings.city} – {settings.pincode}
              </span>
            </li>
            <li className="flex gap-2">
              <PhoneIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:text-rose-700">
                {settings.phone}
              </a>
            </li>
            <li className="flex gap-2">
              <MailIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <a href={`mailto:${settings.email}`} className="hover:text-rose-700">
                {settings.email}
              </a>
            </li>
          </ul>
          <div className="mt-4 flex gap-2">
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sm">
              <WhatsappIcon className="h-4 w-4" />
              WhatsApp
            </a>
            <a
              href={withUtm(settings.instagram, "website", "footer")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-instagram btn-sm"
            >
              <InstagramColorIcon className="h-4 w-4" />
              Instagram
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-rose-200/60">
        <div className="shell flex flex-col gap-2 py-5 text-[13px] text-ink-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.legalName}. All rights reserved.
            {settings.gstin ? ` GSTIN: ${settings.gstin}.` : ""}
          </p>
          <p>
            Catalogue site — enquiries only. We do not take online payments; every
            order is confirmed over WhatsApp or phone.
          </p>
        </div>
      </div>
    </footer>
  );
}
