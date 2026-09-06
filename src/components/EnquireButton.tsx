"use client";

import { InstagramIcon, PhoneIcon, WhatsappIcon } from "./icons";

const CHANNEL_ICONS = {
  whatsapp: WhatsappIcon,
  call: PhoneIcon,
  instagram: InstagramIcon,
} as const;

type Props = {
  href: string;
  productId?: string;
  label?: string;
  className?: string;
  channel?: "whatsapp" | "call" | "instagram";
  ariaLabel?: string;
};

/**
 * Every conversion on this site goes through here. It is a real anchor, so it
 * works with JavaScript disabled; the click handler only adds the enquiry-log
 * write (fire-and-forget, `keepalive` so it survives the navigation).
 *
 * There is intentionally no cart, no quantity selector and no checkout — the
 * button hands the visitor straight to a human on WhatsApp.
 */
export default function EnquireButton({
  href,
  productId,
  label = "Enquire",
  className = "btn-primary w-full",
  channel = "whatsapp",
  ariaLabel,
}: Props) {
  const Icon = CHANNEL_ICONS[channel];
  // tel: is handed to the dialler, not to a browsing context. Opening it in a
  // new tab left an empty window behind on desktop, and _blank on a non-http
  // scheme buys nothing anyway.
  const external = /^https?:/i.test(href);

  function logEnquiry() {
    try {
      fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          channel,
          productId,
          pagePath: window.location.pathname,
        }),
      }).catch(() => {
        /* logging must never block the customer reaching us */
      });
    } catch {
      /* ignore */
    }
  }

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={logEnquiry}
      className={className}
      aria-label={ariaLabel ?? label}
    >
      {/* The icon follows the channel. It used to be the WhatsApp mark
          unconditionally, so "Call the shop" — a tel: link — wore a WhatsApp
          logo and promised the wrong app.

          shrink-0: in a narrow flex button the icon was being squeezed to zero
          width instead of keeping its size, so it vanished silently. */}
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </a>
  );
}
