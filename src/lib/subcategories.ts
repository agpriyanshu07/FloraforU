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
 * rule marked `catchAll` is the category's last resort and must be last. A
 * rule with a null pattern is never matched automatically at all.
 *
 * A category absent from this table has no subcategories, and that is a
 * decision rather than an omission: Cooler & Fan has four products and
 * Festive & Puja one, and splitting those helps nobody.
 */
export type SubcategoryRule = {
  name: string;
  /**
   * What files a product here automatically.
   *
   *   RegExp   — matched against the product name.
   *   null     — the subcategory exists but nothing is ever filed into it
   *              automatically. Used where the distinction is real but is not
   *              in the product name: the shop knows a pot is ceramic, the
   *              word "ceramic" appears nowhere in "Aura Pot 10 Inch". These
   *              are filed by hand in the admin.
   *   catchAll — everything in the category still unfiled. At most one per
   *              category, and it must be last.
   *
   * The distinction between `null` and `catchAll` matters: before they were
   * separated, a null pattern meant catch-all, and giving Pots & Vases five
   * by-material subcategories would have filed all 41 pots into whichever was
   * listed first.
   */
  pattern?: RegExp | null;
  catchAll?: true;
  /**
   * Where this chip sits on the category page, when that differs from where
   * the rule sits in this list.
   *
   * These are two different orderings and conflating them is destructive. The
   * list order is MATCH PRECEDENCE -- first rule that matches wins -- so it
   * has to run specific before general: "Trays" before "Dry Fruit Hamper Box",
   * or a Dry Fruit Tray is filed as a hamper. The shop's own site orders its
   * chips by what sells, which is a different sequence entirely, and simply
   * sorting this list into that order would put the Loose Flowers catch-all
   * first and swallow all 85 products in the category.
   *
   * So: list order decides what matches, `position` decides what is shown.
   * Omitted means "same as its place in the list".
   */
  position?: number;
};

export const SUBCATEGORY_RULES: Record<string, SubcategoryRule[]> = {
  // Chip order from the shop's own Lights page: Light Stand & Hanging, Jhumar,
  // Imported Light Stand, Imported Hanging Light, LED/Palco/Strip.
  "Lights & Lighting Décor": [
    { name: "Jhumar", pattern: /chandelier|jhumar/i, position: 1 },
    // Before the stand rule: "Light Stand Panel" is a panel, and "light stand"
    // would otherwise claim it.
    { name: "Light Panels", pattern: /\bpanel\b/i, position: 6 },
    {
      name: "LED, Palco & Strip Light",
      pattern: /\bled\b|palco|strip|par light|cloth light|crock light/i,
      position: 4,
    },
    // `\b9\d{2}\b` is the shop's own catalogue-code series for one product
    // line: sets of ten pendant lights on cords, photographed on black with a
    // "MDF 9xx SET OF 10" caption. Hanging Light 903, Humming Hanging Bird
    // 915 and Rod Hanging Light 936 filed themselves here because the word
    // "hanging" happens to be in their names; Big Star 904, Cover Bird 914,
    // Candle Light 916 and Golden Jali 931 are the same product line and did
    // not. Matching the code files the line together instead of splitting it
    // on an accident of naming.
    {
      name: "Light Stand & Hanging",
      pattern:
        /light stand|candle stand|x stand|stand \(set|hanging|light tree|shell light|light bird|titli bird|sun light \d|\b9\d{2}\b/i,
      position: 0,
    },
    { name: "Imported Light Stand", pattern: null, position: 2 },
    { name: "Imported Hanging Light", pattern: null, position: 3 },
    // Not on the shop's own card. Their five names cover stands, hanging
    // lights and strips, and the catalogue also carries loose bulbs, a bulb
    // holder and two backlit panels -- five products with nowhere to go, which
    // would have stayed unfiled for good. Named plainly so they are obvious to
    // rename or delete in the admin; deleting a subcategory leaves its stock in
    // the category, so nothing is at risk either way.
    { name: "Bulbs & Holders", pattern: /\bbulbs?\b/i, position: 5 },
  ],
  "Artificial Flowers & Greenery": [
    { name: "Flower Bunch", pattern: /bunch/i, position: 2 },
    { name: "Ready Panel", pattern: /panel|ready/i, position: 4 },
    { name: "Hanging", pattern: /hanging|latta|wisteria/i, position: 3 },
    { name: "Golden Sticks", pattern: /(golden|silver).*stick|stick.*(golden|silver)/i, position: 7 },
    { name: "Sticks", pattern: /stick/i, position: 6 },
    { name: "Leaf", pattern: /patta|pata|leave|leaf|money plant|satter/i, position: 1 },
    { name: "Filler", pattern: /filler|pompas|gypsy|pops|poleen/i, position: 5 },
    { name: "Loose Flowers", catchAll: true, position: 0 },
  ],
  "Gift Boxes, Trays, Bags & Baskets": [
    { name: "Dry Fruit Box 2 Jar", pattern: /^2\s*jar/i },
    { name: "Dry Fruit Box 3 Jar", pattern: /^3\s*(\+\s*2\s*)?jar/i },
    { name: "Dry Fruit Box 4 Jar", pattern: /^4\s*jar|^4 khana/i },
    { name: "Dry Fruit Box 5, 6, 8 Jar", pattern: /^[568]\s*jar/i },
    // Before the hamper rule: six "Dry Fruit Tray (...)" products were being
    // filed as hampers because "dry fruit" matched first. They are trays.
    { name: "Trays", pattern: /tray|platter/i, position: 6 },
    { name: "Dry Fruit Hamper Box", pattern: /hamper|dry fruit|premium \d+ jar|meva/i, position: 4 },
    { name: "Potly, Grass & Jar", pattern: /potli|potly|tin jar|\bjar\b|grass/i, position: 11 },
    { name: "Bags", pattern: /\bbag\b|purse|attachi|balti/i, position: 10 },
    { name: "Fancy Basket", pattern: /basket|tokri/i, position: 5 },
    { name: "Pine", pattern: /pine/i, position: 7 },
    { name: "Cane", pattern: /cane/i, position: 8 },
    { name: "Fancy Box", pattern: /\bbox\b/i, position: 9 },
  ],
  "Backdrops, Wall Panels & Cloths": [
    { name: "Wall", pattern: /wall/i },
    { name: "Ceiling", pattern: /ceiling/i },
    { name: "Passage", pattern: /passage/i },
    { name: "Table - Chair Cover", pattern: /table cover|chair cover|counter table/i, position: 4 },
    { name: "Selfie Cloths", pattern: /selfie/i, position: 5 },
    { name: "Printed Cloth", pattern: /print/i, position: 7 },
    { name: "Hanging Cloths & Backdrops", pattern: /hanging|jhaler|chindi|daman|panel|butta/i, position: 6 },
    { name: "Plain Cloth", pattern: /lycra|velvet|roto|micro|galaxy|galexy|net|cloth|foil|mate|grass/i, position: 3 },
  ],
  "Rajasthani & Haldi-Mehndi-Mayra Décor": [
    { name: "Kite", pattern: /kite/i },
    { name: "Chakri", pattern: /chakri/i },
    { name: "Lardi", pattern: /lardi/i },
    { name: "Umbrella", pattern: /umbrella/i },
    { name: "Haldi Tub (Urli)", pattern: /urli|haldi tub|haldi top/i },
    { name: "Haldi / Mehndi Items", pattern: /haldi|mehendi|mehndi/i },
    { name: "Rajasthani Hangings", pattern: /jhumar|hanging|ring with bell|dream catcher|pankh|tassal|tussal|pom ?pom|churdi|lotus|rajni/i },
    { name: "Props", catchAll: true },
  ],
  "Packing & Bouquet Accessories": [
    { name: "Ribbon", pattern: /ribbon|bow|lace/i, position: 1 },
    { name: "Packing Net Mesh", pattern: /\bnet\b|mesh/i, position: 2 },
    { name: "Cellophane Tissue n Packing Paper", pattern: /cellophane|tissue|paper|sheet/i, position: 0 },
    // Not on the shop's own site; added for the tools and finishing supplies
    // that otherwise sat unfiled under "All".
    { name: "Tape & Glue", pattern: /tape|glue|dispenser/i, position: 3 },
    { name: "Spray Paint & Moti", pattern: /spray|moti/i, position: 4 },
  ],
  "Pots & Vases": [
    { name: "Plastic Flower Pot", pattern: null },
    { name: "China Pot", pattern: null },
    { name: "Ceramic Pot", pattern: null },
    { name: "Metal Pot", pattern: null },
    { name: "Urli", pattern: /urli/i },
  ],
  "SFX & Special Effects": [
    { name: "Machine", pattern: /machine|wheel|booth/i },
    { name: "Pyro", pattern: /pyro|sparkular/i },
    { name: "Paper & Jari Confetti", pattern: /confetti/i, position: 3 },
    { name: "Liquid & Powder", pattern: /co2|gun/i, position: 2 },
  ],  "Mirror Décor": [
    { name: "Entry Gate", pattern: /gate|entry/i, position: 2 },
    { name: "Mirror Ball n More", pattern: /ball/i, position: 0 },
    { name: "Mirror Stage", pattern: /stage|wall|pillar|table|hexagon/i, position: 1 },
  ],
  "Sofa & Chair": [
    // The shop's card reads "Divana"; every product spells it "Dewana"
    // ("Blue Dewana (Sagwan Wood)"). Both are matched so the stock files
    // itself, and the chip keeps the shop's spelling.
    { name: "Divana", pattern: /dewana|divana|diwan|sofa/i },
    { name: "Chair", pattern: /chair/i },
    { name: "Table", pattern: /table/i, position: 2 },
  ],
};

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
    if (rule.catchAll) return rule.name;
    if (rule.pattern && rule.pattern.test(productName)) return rule.name;
  }
  return null;
}
