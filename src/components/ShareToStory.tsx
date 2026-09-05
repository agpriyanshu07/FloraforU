"use client";

import { useState } from "react";

/** Campaign accents, mirroring OFFER_THEMES for the canvas (which needs raw
 *  hex, not Tailwind classes). */
const THEME_HEX: Record<string, { bg: string; ink: string }> = {
  marigold: { bg: "#b45309", ink: "#8a4b12" },
  "festive-red": { bg: "#b3261e", ink: "#8c1d18" },
  "monsoon-blue": { bg: "#1f5673", ink: "#17425a" },
  "midnight-gold": { bg: "#3d2c4f", ink: "#2c1f3a" },
};

export type StoryOffer = {
  title: string;
  discountLabel: string | null;
  endsAtLabel: string;
  theme: string;
};

/**
 * "Share to Instagram Story" — renders a 1080x1920 story card on a canvas and
 * downloads it as a PNG, ready to post. Runs entirely in the browser; no server
 * round-trip and no image-generation service.
 *
 * Two shapes: a product card (the original), or a campaign card when `offer` is
 * passed — same generator so both stay visually consistent as the brand evolves.
 */
export default function ShareToStory({
  productName,
  spec,
  price,
  imageUrl,
  handle,
  offer,
  label,
}: {
  productName: string;
  spec: string;
  price: string;
  imageUrl?: string;
  handle: string;
  /** When present, renders a campaign card instead of a product card. */
  offer?: StoryOffer;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function makeStory() {
    setBusy(true);
    try {
      const W = 1080;
      const H = 1920;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const accent = offer ? (THEME_HEX[offer.theme] ?? THEME_HEX.marigold) : null;

      ctx.fillStyle = "#fffbf7";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = accent ? accent.bg : "#fbedf2";
      ctx.fillRect(0, 0, W, 420);

      if (imageUrl) {
        await new Promise<void>((resolve) => {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const size = 760;
            const x = (W - size) / 2;
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(x, 300, size, size, 36);
            ctx.clip();
            ctx.drawImage(img, x, 300, size, size);
            ctx.restore();
            resolve();
          };
          img.onerror = () => resolve();
          img.src = imageUrl;
        });
      }

      ctx.fillStyle = accent ? "#ffffff" : "#9b2c5a";
      ctx.font = "bold 44px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("FloralforU", W / 2, 190);
      ctx.font = "28px Inter, system-ui, sans-serif";
      ctx.fillStyle = accent ? "rgba(255,255,255,0.85)" : "#6b5a61";
      ctx.fillText(handle, W / 2, 240);

      if (offer && accent) {
        // Campaign card: the sale name and discount carry the poster, with the
        // real end date rather than a vague "hurry".
        ctx.fillStyle = "#2a1d22";
        ctx.font = "bold 72px Georgia, serif";
        wrap(ctx, offer.title, W / 2, 1180, W - 160, 86);

        if (offer.discountLabel) {
          ctx.fillStyle = accent.bg;
          ctx.font = "bold 96px Georgia, serif";
          ctx.fillText(offer.discountLabel, W / 2, 1400);
        }

        ctx.fillStyle = "#6b5a61";
        ctx.font = "36px Inter, system-ui, sans-serif";
        ctx.fillText(offer.endsAtLabel, W / 2, 1520);

        ctx.fillStyle = "#6b5a61";
        ctx.font = "30px Inter, system-ui, sans-serif";
        ctx.fillText("Enquire on WhatsApp · Dhanbad", W / 2, 1680);
      } else {
        ctx.fillStyle = "#2a1d22";
        ctx.font = "bold 58px Georgia, serif";
        wrap(ctx, productName, W / 2, 1180, W - 160, 70);

        ctx.fillStyle = "#6b5a61";
        ctx.font = "32px Inter, system-ui, sans-serif";
        wrap(ctx, spec, W / 2, 1330, W - 200, 44);

        ctx.fillStyle = "#9b2c5a";
        ctx.font = "bold 72px Georgia, serif";
        ctx.fillText(price, W / 2, 1560);

        ctx.fillStyle = "#6b5a61";
        ctx.font = "30px Inter, system-ui, sans-serif";
        ctx.fillText("Enquire on WhatsApp · Dhanbad", W / 2, 1680);
      }

      const slugSource = offer ? offer.title : productName;
      const link = document.createElement("a");
      link.download = `floralforu-${slugSource.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-story.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={makeStory} className="btn-ghost btn-sm" disabled={busy}>
      {busy ? "Preparing…" : (label ?? "Save as Instagram Story")}
    </button>
  );
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let cursor = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursor);
      line = word;
      cursor += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cursor);
}
