/**
 * Generates the branded placeholder artwork used until the client supplies real
 * product photography. Every file this writes is a PLACEHOLDER — it carries a
 * small "placeholder" mark so nobody mistakes it for a real product photo.
 *
 *   node scripts/generate-placeholder-art.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const OUT = join(process.cwd(), "public", "img");

// Palette drawn from the design tokens in src/app/globals.css.
const SCHEMES = [
  { bg: "#fbedf2", ink: "#9b2c5a", soft: "#f4d5e0" },
  { bg: "#eef3ee", ink: "#4f6f52", soft: "#dce7dd" },
  { bg: "#fff7ed", ink: "#8a4b12", soft: "#ffedd5" },
  { bg: "#fdf5f8", ink: "#7d2148", soft: "#f4d5e0" },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A stylised bloom — six petals around a centre. */
function bloom(cx, cy, r, fill, opacity) {
  const petals = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return `<ellipse cx="${(cx + Math.cos(a) * r * 0.55).toFixed(1)}" cy="${(
      cy + Math.sin(a) * r * 0.55
    ).toFixed(1)}" rx="${(r * 0.45).toFixed(1)}" ry="${(r * 0.28).toFixed(
      1,
    )}" transform="rotate(${((a * 180) / Math.PI).toFixed(1)} ${(
      cx + Math.cos(a) * r * 0.55
    ).toFixed(1)} ${(cy + Math.sin(a) * r * 0.55).toFixed(1)})" />`;
  }).join("");
  return `<g fill="${fill}" opacity="${opacity}">${petals}<circle cx="${cx}" cy="${cy}" r="${(
    r * 0.22
  ).toFixed(1)}" /></g>`;
}

function tile({ label, sub, w = 800, h = 600, scheme, seed = 0 }) {
  const s = SCHEMES[scheme % SCHEMES.length];
  const rand = (n) => {
    // small deterministic PRNG so regenerating gives identical files
    let x = Math.sin(seed * 999 + n * 37) * 10000;
    return x - Math.floor(x);
  };
  const blooms = Array.from({ length: 7 }, (_, i) =>
    bloom(
      rand(i) * w,
      rand(i + 20) * h,
      40 + rand(i + 40) * 70,
      s.ink,
      0.07 + rand(i + 60) * 0.08,
    ),
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)} placeholder artwork">
  <rect width="${w}" height="${h}" fill="${s.bg}"/>
  ${blooms}
  <rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="${s.soft}" stroke-width="8"/>
  <g font-family="Georgia, 'Times New Roman', serif" text-anchor="middle">
    <text x="${w / 2}" y="${h / 2 + 6}" font-size="${Math.round(w / 16)}" fill="${s.ink}">${esc(label)}</text>
  </g>
  <g font-family="Inter, system-ui, sans-serif" text-anchor="middle">
    <text x="${w / 2}" y="${h / 2 + Math.round(w / 16) + 22}" font-size="${Math.round(w / 45)}" letter-spacing="3" fill="${s.ink}" opacity="0.75">${esc(sub.toUpperCase())}</text>
  </g>
</svg>`;
}

function write(rel, content) {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

const categories = JSON.parse(process.argv[2] ?? "[]");
categories.forEach((c, i) => {
  write(`categories/${c.slug}.svg`, tile({ label: c.short, sub: "placeholder photo", scheme: i, seed: i + 1 }));
});

// Hero, offers, gallery, review avatars
write("hero.svg", tile({ label: "FloralforU", sub: "event décor · dhanbad", w: 1200, h: 800, scheme: 0, seed: 77 }));
["ganesh-puja-sale", "monsoon-clearance"].forEach((slug, i) =>
  write(`offers/${slug}.svg`, tile({ label: "Seasonal Offer", sub: slug.replace(/-/g, " "), w: 1200, h: 420, scheme: i + 2, seed: 100 + i })),
);
for (let i = 1; i <= 9; i++) {
  write(`gallery/g${i}.svg`, tile({ label: i <= 5 ? "Event Setup" : "Dispatch", sub: "placeholder photo", w: 700, h: 700, scheme: i, seed: 200 + i }));
}
console.log(`Wrote placeholder artwork for ${categories.length} categories + hero/offers/gallery.`);
