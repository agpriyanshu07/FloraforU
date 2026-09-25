import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/settings";
import { OG_SIZE, PALETTE, bloom } from "@/lib/og";

export const alt = "FloralforU — event décor and artificial flowers, Dhanbad";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * The card WhatsApp, Instagram and Facebook show when someone forwards a link
 * to the shop. Until now they showed none: the site set no `og:image` at all
 * outside product pages, so a shared link was a bare line of text — on a
 * platform where forwarding a link *is* the marketing.
 *
 * Rendered to PNG at build time. That matters: the placeholder artwork on this
 * site is SVG, and neither WhatsApp nor Facebook will render an SVG preview,
 * so pointing `og:image` at one of those files would have looked fixed while
 * still showing nothing.
 *
 * Typeface is the one bundled with `next/og` rather than the brand's Playfair:
 * Satori needs a ttf/otf it can read from disk, next/font only leaves woff2
 * behind, and fetching a font mid-build to gain one serif is not worth the
 * failure mode. The card carries the brand in its colour and layout instead.
 */
export default async function Image() {
  const s = await getSettings();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PALETTE.cream,
          position: "relative",
        }}
      >
        {bloom({ x: 905, y: 92, r: 150, colour: PALETTE.marigold, opacity: 0.22 })}
        {bloom({ x: 1075, y: 330, r: 108, colour: PALETTE.rose, opacity: 0.16 })}
        {bloom({ x: 868, y: 470, r: 78, colour: PALETTE.sage, opacity: 0.2 })}

        <div style={{ display: "flex", height: 18, background: PALETTE.rose }} />

        <div style={{ display: "flex", flexDirection: "column", padding: "0 74px" }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 6,
              color: PALETTE.ink600,
              textTransform: "uppercase",
            }}
          >
            {/* No arithmetic on the settings: yearsCount is free text the
                owner types ("6+"), so subtracting it from the year produced a
                card reading "SINCE NAN". */}
            {s.city} · event décor & artificial flowers
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 104,
              fontWeight: 700,
              color: PALETTE.rose,
              marginTop: 14,
              letterSpacing: -2,
            }}
          >
            {s.businessName}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 40,
              color: PALETTE.ink900,
              marginTop: 18,
              maxWidth: 780,
              lineHeight: 1.3,
            }}
          >
            {s.tagline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "0 74px 60px",
          }}
        >
          <div
            style={{
              display: "flex",
              background: PALETTE.whatsapp,
              color: "#ffffff",
              fontSize: 28,
              fontWeight: 600,
              padding: "16px 30px",
              borderRadius: 999,
            }}
          >
            Enquire on WhatsApp
          </div>
          <div style={{ display: "flex", fontSize: 28, color: PALETTE.ink600 }}>
            {s.siteUrl.replace(/^https?:\/\//, "")}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
