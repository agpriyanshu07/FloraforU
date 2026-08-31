/**
 * Generates fixtures/sample-import.csv — the dataset used to prove the bulk
 * importer end-to-end, including its validation path. Deliberately contains
 * messy real-world spec lines, blank prices (Price on Enquiry) and six
 * malformed rows that must each be reported and skipped.
 */
import fs from "node:fs";

const rows: string[][] = [];
const q = (s: string) => `"${String(s).replace(/"/g, '""')}"`;

const cats = [
  "Artificial Flowers & Greenery",
  "Lights & Lighting Décor",
  "Pots & Vases",
  "SFX & Special Effects",
  "Packing & Bouquet Accessories",
  "Gift Boxes, Trays, Bags & Baskets",
  "Festive & Puja Items",
  "Mirror Décor",
];

const names = [
  "Rose Petal Pack", "Jasmine Lardi", "Foam Lily Bunch", "Hanging Ivy Trail", "Tuberose Stem",
  "Pixel Curtain Light", "Neon Flex Strip", "Disco Ball 12 inch", "Uplighter Par Can", "Fairy Net Light",
  "Ceramic Bud Vase", "Hammered Brass Pot", "Terracotta Planter", "Glass Bubble Bowl", "Fiber Cone Stand",
  "Snow Machine 1200W", "Sparkular Cold Fountain", "CO2 Jet Handheld", "Haze Machine", "Confetti Cannon 24 inch",
  "Jute Twine Roll", "Double Sided Tape", "Floral Foam Brick", "Kraft Ribbon Spool", "Butter Paper Sheet",
  "Wooden Gift Crate", "Velvet Ring Box", "Jute Hamper Basket", "Acrylic Dry Fruit Box", "Printed Tin Jar",
  "Brass Puja Bell", "Cotton Wick Pack", "Camphor Stand", "Kalash Set", "Chowki Wooden Stool",
  "Antique Wall Mirror", "Round Mirror Tray", "Mirror Strip Roll", "Hexagon Mirror Tile", "Mirror Mosaic Sheet",
];

const specs = [
  "Pack of 1 pc Size 1.5*3feet with 1 pipe n 2 bracket",
  "50 Mtr 5 FUNCTION ROPE",
  'Size 10", 12", 14" - set of 3',
  "Per mtr, width 60 inch, 20 shades",
  "Box of 24 pcs, warm flicker",
  "Bundle of 20 strings, 5 mtr each",
  "Per pc with 1 ltr solution + free nozzle",
  "Pack of 100 pcs, mixed colour, assorted size",
];

rows.push(["name", "category", "spec", "price", "code", "description", "availability", "image", "published"]);

names.forEach((n, i) => {
  const cat = cats[Math.floor(i / 5) % cats.length];
  const poa = i % 9 === 0; // roughly one in nine is Price on Enquiry (blank price)
  const price = poa ? "" : String(150 + ((i * 137) % 4200));
  const avail = i % 7 === 0 ? "limited" : i % 11 === 0 ? "made_to_order" : "in_stock";
  rows.push([n, cat, specs[i % specs.length], price, `IMP${7000 + i}`, "", avail, "", "yes"]);
});

// --- Deliberately malformed rows, to prove the validation path --------------
rows.push(["", cats[0], "Missing name row", "300", "IMP9001", "", "in_stock", "", "yes"]);
rows.push(["Ghost Category Item", "Chandeliers & Sconces", "Category does not exist", "500", "IMP9002", "", "in_stock", "", "yes"]);
rows.push(["Bad Price Item", cats[1], "Price is not a number", "four hundred", "IMP9003", "", "in_stock", "", "yes"]);
rows.push(["Bad Availability Item", cats[2], "Availability value is wrong", "250", "IMP9004", "", "sometimes", "", "yes"]);
rows.push(["Duplicate Code A", cats[3], "First use of the code", "600", "IMP9005", "", "in_stock", "", "yes"]);
rows.push(["Duplicate Code B", cats[3], "Same code again in one file", "700", "IMP9005", "", "in_stock", "", "yes"]);

fs.writeFileSync("fixtures/sample-import.csv", rows.map((r) => r.map(q).join(",")).join("\n") + "\n");
console.log(
  "rows (excl header):", rows.length - 1,
  "| distinct categories:", new Set(rows.slice(1).map((r) => r[1])).size,
);
