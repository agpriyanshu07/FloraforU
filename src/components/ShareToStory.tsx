"use client";

import { useState } from "react";

/**
 * "Share to Instagram Story" — renders a 1080x1920 story card on a canvas from
 * the product's details and downloads it as a PNG, ready to post. Runs entirely
 * in the browser; no server round-trip and no image-generation service.
 */
export default function ShareToStory({
  productName,
  spec,
  price,
  imageUrl,
  handle,
}: {
  productName: string;
  spec: string;
  price: string;
  imageUrl?: string;
  handle: string;
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

      ctx.fillStyle = "#fffbf7";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fbedf2";
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

      ctx.fillStyle = "#9b2c5a";
      ctx.font = "bold 44px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("FloralforU", W / 2, 190);
      ctx.font = "28px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#6b5a61";
      ctx.fillText(handle, W / 2, 240);

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

      const link = document.createElement("a");
      link.download = `floralforu-${productName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-story.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={makeStory} className="btn-ghost btn-sm" disabled={busy}>
      {busy ? "Preparing…" : "Save as Instagram Story"}
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
