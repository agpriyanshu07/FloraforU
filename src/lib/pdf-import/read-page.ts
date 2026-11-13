"use server";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Reads one catalogue page and returns the products on it, ready for the
 * admin to check on the review screen.
 *
 * The browser has already pulled the page apart (src/lib/pdf-import/extract.ts):
 * this receives the page's text, a small picture of the whole page, and
 * thumbnails of the photographs found on it. Claude does the part that used
 * to be done by hand for every one of the first 590 products -- tidy the
 * name, separate the pack/size line from the price, choose the category, and
 * write the one-line description.
 *
 * Nothing here writes to the database. Every result goes to a review screen
 * first; prices especially are only ever read off the page, never guessed.
 */

export type ReadPageResult =
  | { ok: true; products: PageProduct[] }
  | { ok: false; error: string; setup?: boolean };

export type PageProduct = Omit<z.infer<typeof productSchema>, "category" | "availability"> & {
  /** A slug from the shop's own list, or "" when the admin has to choose. */
  category: string;
  availability: "in_stock" | "limited" | "made_to_order";
};

const MODEL = "claude-opus-5-5";

// Category and availability are plain strings on purpose. The SDK's schema
// helper turns a z.enum into free text with the options in a description, so
// the API does not hold the model to the list -- and an answer outside it would
// fail parsing and lose the whole page. Matching on this side instead means a
// near-miss ("Pots and Vases") still lands, and a real miss is left for the
// admin to choose rather than thrown away.
const productSchema = z.object({
  code: z.string().nullable().describe("The product code exactly as printed, or null if the page has none."),
  name: z.string().describe("Clean product name, Title Case."),
  spec: z.string().describe("Pack / size / unit line, short, ' · '-separated. Empty string if nothing."),
  price: z.number().nullable().describe("Lowest price printed for this product, in rupees. null if none is printed."),
  description: z.string().describe("One or two plain sentences for the product page."),
  category: z.string().describe("The category slug from the list in the instructions."),
  subcategory: z.string().nullable().describe("Name of a subcategory listed under the chosen category, or null."),
  availability: z.string().describe('One of "in_stock", "limited", "made_to_order".'),
  photos: z.array(z.number().int()).describe("Numbers of the photo thumbnails that show this product, best first."),
  check: z.string().nullable().describe("If anything on this product is uncertain, say what the admin should check. Otherwise null."),
});
const pageSchema = z.object({ products: z.array(productSchema) });

const squash = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");

async function catalogueContext() {
  const categories = await db.category.findMany({
    orderBy: { displayOrder: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      subcategories: { select: { name: true }, orderBy: { displayOrder: "asc" } },
    },
  });
  return categories;
}

function systemPrompt(categories: Awaited<ReturnType<typeof catalogueContext>>): string {
  const list = categories
    .map(
      (c) =>
        `- ${c.slug} — ${c.name}: ${c.description}` +
        (c.subcategories.length ? `\n  Subcategories: ${c.subcategories.map((s) => s.name).join("; ")}` : ""),
    )
    .join("\n");

  return `You turn pages of a product catalogue into listings for FloralforU, a wholesale and retail shop in Dhanbad, India, selling artificial flowers, event décor, lights, pots, gift packing and similar. The website is a catalogue: customers enquire on WhatsApp, there is no online payment.

Each request is one page of the shop's own catalogue PDF. You get the page's extracted text, a picture of the whole page, and numbered thumbnails of the photographs found on it. Most pages show one product; some show several, and cover, index or contact pages show none — return an empty list for those.

Read every fact off the page. The price is the most important field and customers act on it, so never estimate or infer one: if a price is not clearly printed for a product, set price to null and say so in "check". Where several prices are printed (by size, quality or colour), use the lowest as price and put the full breakdown in spec. "45/-" means ₹45.

Write in the shop's existing style:
- name: the product's own name, Title Case, with obvious misspellings in English words fixed ("Pannel" → "Panel", "Vaccum" → "Vacuum"). Keep the shop's own Hindi/trade words as they are (Jhaler, Kamal, Lardi, Toran). Do not add marketing words.
- spec: short facts — size, pack, unit — joined with " · ". "Per Mtr" becomes "Sold per metre", "Per Pcs" becomes "per piece".
- description: one or two plain sentences saying what it is and how it is sold. No superlatives.
- category: the slug that fits best from the list below. subcategory: one of that category's listed subcategories if one clearly fits, else null.
- availability: in_stock unless the page says otherwise.
- photos: the thumbnail numbers that show this product. Leave out logos, icons, borders and decorative flowers. On a one-product page that is usually every thumbnail.
- check: a short note if anything is uncertain (unreadable price, two products that might be one, a category you are unsure of). null when the page is clear.

Examples, from pages the shop has already listed:
Page text: "2507 / Long peacock Tin Jar Jar Capacity: 200-250 grms Tin: Vaccum Tin / Price - 45/- Per Pcs"
→ code "2507", name "Long Peacock Tin Jar", spec "Vacuum tin · holds 200–250 g", price 45, description "Printed vacuum tin jar holding 200–250 g, sold per piece.", category gift-boxes-trays-bags-baskets
Page text: "3302 / Haldi Thems / Price: 170/- Per Mtr"
→ code "3302", name "Haldi Theme Cloth", spec "Sold per metre", price 170, description "Checked haldi-theme cloth, sold by the metre.", category backdrops-wall-panels-cloths
Page text: "Tiwal Pannel Haldi Size:2*4 Feet / Price: /- Per Mtr"
→ name "Taiwan Panel Haldi", spec "2 × 4 feet", price null, check "No price printed on the page."

Categories:
${list}`;
}

let client: Anthropic | null = null;

export async function readCataloguePage(form: FormData): Promise<ReadPageResult> {
  await requireSession();

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return {
      ok: false,
      setup: true,
      error:
        "PDF reading isn't switched on yet. Add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables, then redeploy.",
    };
  }

  const text = String(form.get("text") ?? "");
  const preview = form.get("preview");
  const photos = form.getAll("photo").filter((p): p is File => p instanceof File);
  if (!(preview instanceof File)) return { ok: false, error: "The page picture is missing." };

  const categories = await catalogueContext();
  if (categories.length === 0) return { ok: false, error: "Add at least one category first." };

  const b64 = async (f: File) => Buffer.from(await f.arrayBuffer()).toString("base64");
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: "text", text: "Whole page:" },
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: await b64(preview) } },
  ];
  for (const [i, photo] of photos.entries()) {
    content.push({ type: "text", text: `Photo ${i + 1}:` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: await b64(photo) } });
  }
  content.push({ type: "text", text: `Extracted page text:\n${text || "(no text on this page)"}` });

  client ??= new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      // Reading a page is extraction plus a little judgement; medium keeps the
      // category and price reading careful without paying for deep reasoning.
      output_config: { effort: "medium", format: betaZodOutputFormat(pageSchema) },
      // If the model declines a page, the API re-runs it on a fallback model
      // in the same call rather than failing the page.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // The category list is the same for every page of an import, so it is
      // cached: pages after the first pay a tenth for it.
      system: [{ type: "text", text: systemPrompt(categories), cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "This page could not be read automatically. Add it by hand." };
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return { ok: false, error: "This page could not be read completely. Try it again." };
    }
    const n = photos.length;
    const bySquashed = new Map<string, (typeof categories)[number]>();
    for (const c of categories) {
      bySquashed.set(squash(c.slug), c);
      bySquashed.set(squash(c.name), c);
    }
    const products: PageProduct[] = response.parsed_output.products.map((p) => {
      const cat = bySquashed.get(squash(p.category));
      const sub = cat && p.subcategory
        ? cat.subcategories.find((s) => squash(s.name) === squash(p.subcategory!))?.name ?? null
        : null;
      const availability = (["in_stock", "limited", "made_to_order"] as const).find(
        (a) => a === p.availability,
      ) ?? "in_stock";
      const notes = [p.check, cat ? null : "Choose the category — the suggested one isn't on your list."]
        .filter(Boolean)
        .join(" ");
      return {
        ...p,
        category: cat?.slug ?? "",
        subcategory: sub,
        availability,
        check: notes || null,
        // Thumbnails are numbered from 1 for the model; keep only real ones.
        photos: [...new Set(p.photos)].filter((i) => i >= 1 && i <= n),
      };
    });
    return { ok: true, products };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, setup: true, error: "The ANTHROPIC_API_KEY in Vercel was rejected. Check it and redeploy." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Too many pages at once. Wait a minute and retry this page." };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: `The reading service returned an error (${error.status ?? "network"}). Retry this page.` };
    }
    if (error instanceof Anthropic.AnthropicError) {
      // An answer that does not match the expected shape. Structured output
      // makes this rare; it is still one page, not the whole import.
      return { ok: false, error: "This page's answer could not be understood. Try it again." };
    }
    throw error;
  }
}
