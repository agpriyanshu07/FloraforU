"use client";

import { WhatsappIcon } from "./icons";

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
        /* logging must never block the customer reaching WhatsApp */
      });
    } catch {
      /* ignore */
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={logEnquiry}
      className={className}
      aria-label={ariaLabel ?? label}
    >
      {/* shrink-0: in a narrow flex button the icon was being squeezed to zero
          width instead of keeping its size, so it vanished silently. */}
      <WhatsappIcon className="h-4 w-4 shrink-0" />
      {label}
    </a>
  );
}
