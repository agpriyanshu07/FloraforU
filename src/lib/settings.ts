import { db } from "./db";

/**
 * Business settings live in the DB so the shop owner can edit them from
 * /admin/settings without a code change. Anything the owner has not filled in
 * yet falls back to the placeholder defaults below — every one of these is
 * listed as an open item in the project README.
 */
export type SiteSettings = {
  businessName: string;
  legalName: string;
  tagline: string;
  addressLine: string;
  city: string;
  pincode: string;
  phone: string;
  whatsapp: string;
  email: string;
  hours: string;
  gstin: string;
  instagram: string;
  mapEmbedUrl: string;
  whatsappTemplate: string;
  seoTitle: string;
  seoDescription: string;
  pdfFooter: string;
  followerCount: string;
  eventsCount: string;
  yearsCount: string;
  siteUrl: string;
  /**
   * Master switch for the Instagram-comment feature. Off by default and stored
   * as a string like every other setting, because the settings table is a
   * simple key/value store. Nothing about the feature renders while this is
   * anything other than "true".
   */
  instagramCommentsEnabled: string;
};

// PLACEHOLDER values are prefixed so they are greppable and obvious in review.
export const DEFAULT_SETTINGS: SiteSettings = {
  businessName: "FloralforU",
  legalName: "FloralforU",
  tagline: "One stop solution for all your event needs",
  addressLine: "Shop no LGF A1, Lower Ground, Newtech Villa, Dari Mohalla, Bank More",
  city: "Dhanbad",
  pincode: "826001",
  phone: "+91 00000 00000", // PLACEHOLDER — awaiting client
  whatsapp: "910000000000", // PLACEHOLDER — awaiting client
  email: "hello@floralforu.in", // PLACEHOLDER — awaiting client
  hours: "Mon – Sat, 10:00 AM – 8:00 PM · Sunday closed",
  gstin: "", // left blank until the client confirms they want it public
  instagram: "https://www.instagram.com/floralforu_/",
  mapEmbedUrl: "",
  whatsappTemplate:
    "Hi FloralforU! I'd like to enquire about {product}{code}.\n{url}",
  seoTitle:
    "FloralforU — Artificial Flowers, Event Décor & SFX Items in Dhanbad",
  seoDescription:
    "Browse FloralforU's full catalogue of artificial flowers, backdrops, lights, lamps, pots, SFX machines and event décor. Enquire on WhatsApp — no online payment, just a quick chat.",
  pdfFooter: "FloralforU · Dhanbad · Prices subject to change without notice.",
  followerCount: "5,500+",
  eventsCount: "400+",
  yearsCount: "6+",
  siteUrl: "http://localhost:3000",
  instagramCommentsEnabled: "false",
};

export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.setting.findMany();
  const overrides = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const merged = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]) {
    const v = overrides[key];
    if (typeof v === "string" && v.trim() !== "") merged[key] = v;
  }
  return merged;
}

export async function saveSettings(values: Partial<SiteSettings>) {
  const entries = Object.entries(values).filter(([, v]) => v !== undefined);
  await Promise.all(
    entries.map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      }),
    ),
  );
}
