/**
 * How a product name is filed into a subcategory.
 *
 * Deliberately not marked "server-only": there is no database access and no
 * secret here, just regexes and a pure function, and the drift check runs it
 * as a plain script.
 *
 * The same rules exist twice on purpose, and they must stay in step:
 *
 *   - here, for anything the shop adds later (the CSV importer files a new
 *     row automatically, and the admin offers the same suggestion when a
 *     product is edited);
 *   - in prisma/migrations/20261001133000_classify_catalogue_into_subcategories,
 *     which filed the 590 products that already existed when this shipped.
 *
 * The one difference is the word boundary: \b here, \y there. Postgres reads
 * \b as a backspace character, so the JS spelling matches nothing in SQL --
 * which is how the first draft of that migration left Gift Boxes, Light
 * Panels and Bulbs & Holders empty and dumped their stock in the catch-alls.
 * `npm run check:subcategories` compares the two and fails if they drift.
 *
 * Order is the whole design. The first rule that matches wins, so the specific
 * patterns come before the general ones: "2 Jar Green Flower Box" is a Jar
 * Hamper, not a Gift Box, because Jar Hampers is listed first. A rule with a
 * null pattern is the category's catch-all and must be last.
 *
 * A category absent from this table has no subcategories, and that is a
 * decision rather than an omission: Cooler & Fan has four products and
 * Festive & Puja one, and splitting those helps nobody.
 */
export type SubcategoryRule = { name: string; pattern: RegExp | null };

export const SUBCATEGORY_RULES: Record<string, SubcategoryRule[]> = {
  "Lights & Lighting Décor": [
    { name: "Chandeliers & Jhumar", pattern: /chandelier/i },
    { name: "Light Panels", pattern: /\bpanel\b/i },
    { name: "Light Stands", pattern: /light stand|candle stand|x stand|stand \(set/i },
    { name: "Hanging Lights", pattern: /hanging/i },
    { name: "LED & Par Lights", pattern: /\bled\b|par light/i },
    { name: "Bulbs & Holders", pattern: /\bbulb\b/i },
    { name: "Decorative Lights", pattern: null },
  ],
  "Artificial Flowers & Greenery": [
    { name: "Flower Bunches", pattern: /bunch/i },
    { name: "Hanging & Creepers", pattern: /hanging|latta|wisteria/i },
    { name: "Sticks", pattern: /stick/i },
    { name: "Leaves & Patta", pattern: /patta|pata|leave|leaf|money plant|satter/i },
    { name: "Fillers & Pampas", pattern: /filler|pompas|gypsy|pops|poleen/i },
    { name: "Golden & Silver", pattern: /golden|silver/i },
    { name: "Loose Flowers", pattern: null },
  ],
  "Gift Boxes, Trays, Bags & Baskets": [
    { name: "Jar Hampers", pattern: /^\d+\s*(\+\s*\d+)?\s*jar|^\d+ khana|premium \d+ jar/i },
    { name: "Tin Jars", pattern: /tin jar/i },
    { name: "Potli Bags", pattern: /potli/i },
    { name: "Bags & Purses", pattern: /\bbag\b|purse|attachi/i },
    { name: "Trays & Platters", pattern: /tray|platter/i },
    { name: "Baskets & Tokri", pattern: /basket|tokri|balti|cane/i },
    { name: "Gift Boxes", pattern: /\bbox\b/i },
    { name: "Other Gifting", pattern: null },
  ],
  "Backdrops, Wall Panels & Cloths": [
    { name: "Table & Chair Covers", pattern: /table cover|chair cover|counter table/i },
    { name: "Ceiling Décor", pattern: /ceiling/i },
    { name: "Galaxy & Butta", pattern: /galaxy|galexy|butta/i },
    { name: "Wall Backdrops", pattern: /wall/i },
    { name: "Panels", pattern: /panel/i },
    { name: "Cloth & Fabric Rolls", pattern: /lycra|cloth|chindi|print|foil|net|mate|grass/i },
    { name: "Other Backdrop Décor", pattern: null },
  ],
  "Rajasthani & Haldi-Mehndi-Mayra Décor": [
    { name: "Chakri", pattern: /chakri/i },
    { name: "Lardi & Garlands", pattern: /lardi/i },
    { name: "Tassels & Pom Poms", pattern: /tassal|tussal|pom ?pom|churdi/i },
    { name: "Umbrellas", pattern: /umbrella/i },
    { name: "Jhumar & Hangings", pattern: /jhumar|ring with bell|dream catcher|pankh/i },
    { name: "Kites", pattern: /kite/i },
    { name: "Other Rajasthani", pattern: null },
  ],
  "Packing & Bouquet Accessories": [
    { name: "Ribbons, Bows & Lace", pattern: /ribbon|bow|lace/i },
    { name: "Tapes & Glue", pattern: /tape|glue/i },
    { name: "Cellophane & Nets", pattern: /cellophane|net/i },
    { name: "Papers & Sheets", pattern: /paper|sheet|tissue/i },
    { name: "Sprays & Moti", pattern: null },
  ],
  "Pots & Vases": [
    { name: "Railings & Fences", pattern: /railing|fence/i },
    { name: "Pillar & Layer Pots", pattern: /pillar|layer/i },
    { name: "Bottle Pots", pattern: /bottle|botal/i },
    { name: "Printed & Patterned", pattern: /printed|marble|lace|patta|moti|jali|net/i },
    { name: "Designer Pots", pattern: null },
  ],
  "SFX & Special Effects": [
    { name: "Pyro & Sparkular", pattern: /pyro|sparkular/i },
    { name: "CO2 & Confetti", pattern: /co2|confetti/i },
    { name: "Smoke, Ice & Bubbles", pattern: /dry ice|bubble|foam machine|fan wheel/i },
    { name: "Balloon & Photo Booth", pattern: /balloon|selfie booth/i },
  ],};

/** Turns a subcategory name into its URL slug, matching the migration. */
export function subcategorySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Which subcategory a product belongs in, or null if its category has none
 * (or nothing matched, which only happens if a catch-all rule is removed).
 *
 * Returns the NAME rather than an id: the caller resolves it against the
 * subcategories that actually exist for that category, so a shop that has
 * renamed or deleted one is never handed a dangling reference.
 */
export function classifyProduct(
  categoryName: string,
  productName: string,
): string | null {
  const rules = SUBCATEGORY_RULES[categoryName];
  if (!rules) return null;
  for (const rule of rules) {
    if (rule.pattern === null || rule.pattern.test(productName)) return rule.name;
  }
  return null;
}
