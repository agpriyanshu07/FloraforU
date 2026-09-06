/**
 * Seed catalogue for FloralforU.
 *
 * Structure, category coding and the deliberately messy `spec` lines mirror the
 * client's real 603-item PDF price list (code ranges: 2001-2015 flowers/dry
 * bunches, 2300s packing & craft, 1100s-1400s trays/baskets/hampers, 600s SFX
 * machines, 3100s pots, 3900s cloth backdrop walls).
 *
 * IMPORTANT — PRICES ARE PLACEHOLDERS. They are modelled on the supplied PDF,
 * which appears to be a supplier (giftnfloral/GNF) wholesale list rather than
 * FloralforU's retail sell price. The client must confirm stock and margin
 * per line before launch. Any "giftnfloral"/"GNF" watermark text found in the
 * source PDF has been stripped from every name and description here.
 */

export type SeedCategory = {
  slug: string;
  name: string;
  short: string;
  description: string;
};

export const CATEGORIES: SeedCategory[] = [
  {
    slug: "artificial-flowers-greenery",
    name: "Artificial Flowers & Greenery",
    short: "Flowers & Greenery",
    description:
      "Dry bunches, sola-wood and foam flowers, garlands and lardi, hanging flower strings and ready-made flower panels for stages, entries and mandaps.",
  },
  {
    slug: "backdrops-wall-panels-cloths",
    name: "Backdrops, Wall Panels & Cloths",
    short: "Backdrops & Cloths",
    description:
      "Lycra, velvet and galaxy backdrop walls, 3D panels, ceiling drapes and hanging cloths — the fastest way to change the whole look of a venue.",
  },
  {
    slug: "lights-lighting-decor",
    name: "Lights & Lighting Décor",
    short: "Lights",
    description:
      "Rope lights, fairy and pixel strings, strip lights, hanging light shades and stands for weddings, haldi functions and shop displays.",
  },
  {
    slug: "lamps-diyas",
    name: "Lamps & Diyas",
    short: "Lamps & Diyas",
    description:
      "Brass-finish floor lamps, hanging lanterns, LED and traditional diyas for puja, Diwali displays and warm entrance lighting.",
  },
  {
    slug: "pots-vases",
    name: "Pots & Vases",
    short: "Pots & Vases",
    description:
      "Botal pots, lace pots, moti pots, marble-finish planters and metal urlis — the base of almost every floral arrangement we supply.",
  },
  {
    slug: "sfx-special-effects",
    name: "SFX & Special Effects",
    short: "SFX",
    description:
      "Fog and smoke machines, bubble machines, cold pyro, confetti blasters, balloon machines and LED effects for entries and first dances.",
  },
  {
    slug: "rajasthani-haldi-mehndi-decor",
    name: "Rajasthani & Haldi-Mehndi-Mayra Décor",
    short: "Rajasthani Décor",
    description:
      "Mirror-work umbrellas, phad-painted props, camel and puppet cutouts, matkas and jhula frames for haldi, mehndi and mayra functions.",
  },
  {
    slug: "packing-bouquet-accessories",
    name: "Packing & Bouquet Accessories",
    short: "Packing",
    description:
      "Cellophane rolls, ribbons, floral tape, glue guns and sticks, wrapping paper, moti and pearl strings — everything the bouquet counter runs on.",
  },
  {
    slug: "gift-boxes-trays-bags-baskets",
    name: "Gift Boxes, Trays, Bags & Baskets",
    short: "Boxes & Trays",
    description:
      "Dry-fruit trays and bandej, cane baskets, potli pouches, printed paper bags and tin-jar hampers for wedding gifting and festive orders.",
  },
  {
    slug: "carpets-flooring",
    name: "Carpets & Flooring",
    short: "Carpets",
    description:
      "Durries, event carpets, artificial grass and agro net, plus tirpal sheeting for covering and protecting outdoor setups.",
  },
  {
    slug: "mirror-decor",
    name: "Mirror Décor",
    short: "Mirror Décor",
    description:
      "Framed and frameless decorative mirrors, mirror panels and selfie-point frames that make small venues read twice as large.",
  },
  {
    slug: "cooler-fan",
    name: "Cooler & Fan",
    short: "Cooler & Fan",
    description:
      "Guest-comfort equipment for summer functions — pedestal fans, mist fans and event coolers. Availability varies by season, please enquire.",
  },
  {
    slug: "sofa-chair",
    name: "Sofa & Chair",
    short: "Sofa & Chair",
    description:
      "Wedding sofas, carved chairs, ottomans and stools for stage seating and photo corners. Made to order in your choice of fabric.",
  },
  {
    slug: "ring-platter-varmala",
    name: "Ring Platter & Varmala Accessories",
    short: "Ring Platter",
    description:
      "Engagement ring platters, varmala trays, gota-work thalis and coconut/shagun holders for ring ceremonies and jaimala moments.",
  },
  {
    slug: "festive-puja-items",
    name: "Festive & Puja Items",
    short: "Festive & Puja",
    description:
      "Candles, torans, rangoli stickers, puja thali sets and festival-specific décor for Ganesh Puja, Navratri, Diwali and Chhath.",
  },
  {
    slug: "accessories",
    name: "Accessories",
    short: "Accessories",
    description:
      "Bells, floral sticks, butterflies, birds and the small decorative accents that finish an arrangement off.",
  },
];

export type SeedProduct = {
  category: string;
  code: string;
  name: string;
  spec: string;
  price: number | null;
  poa?: boolean;
  availability?: string;
  description?: string;
  isNew?: boolean;
  /** Seeds a second photo, so the card gallery's arrows have something to do. */
  multiPhoto?: boolean;
};

export const PRODUCTS: SeedProduct[] = [
  // --- Artificial Flowers & Greenery (2001-2099) ---
  { category: "artificial-flowers-greenery", code: "2001", name: "Dry Flower Bunch (Assorted)", spec: "Pack of 12 bunches, height approx 20 inch", price: 480, isNew: true, multiPhoto: true, description: "Mixed dry bunch in natural and dyed shades. Popular for vase fillers and side arrangements." },
  { category: "artificial-flowers-greenery", code: "2002", name: "Sola Wood Rose Bunch", spec: "Pack of 10 stems | 5 colours available", price: 350 },
  { category: "artificial-flowers-greenery", code: "2003", name: "Foam Rose Garland (Lardi)", spec: "5 feet per lardi, pack of 6", price: 620 },
  { category: "artificial-flowers-greenery", code: "2004", name: "Marigold Lardi (Genda Phool)", spec: "8 feet, pack of 12 pcs, orange / yellow", price: 540, isNew: true },
  { category: "artificial-flowers-greenery", code: "2005", name: "Hanging Wisteria String", spec: "Length 3.5 ft | pack of 24 strings", price: 900 },
  { category: "artificial-flowers-greenery", code: "2006", name: "Artificial Green Leaf Mat", spec: "Size 2*2 feet, per pc, UV treated", price: 165 },
  { category: "artificial-flowers-greenery", code: "2007", name: "Rose Flower Wall Panel", spec: "Size 1.5*3feet with 1 pipe n 2 bracket, pack of 1 pc", price: 1250 },
  { category: "artificial-flowers-greenery", code: "2008", name: "Baby Breath Filler Bunch", spec: "Pack of 20 | white / pastel pink", price: 400 },
  { category: "artificial-flowers-greenery", code: "2009", name: "Orchid Stem (Long)", spec: "36 inch per stem, minimum 10 pcs", price: 95 },
  { category: "artificial-flowers-greenery", code: "2010", name: "Palm Leaf Bunch", spec: "Pack of 6 bunch, 5 leaf per bunch", price: 300 },
  { category: "artificial-flowers-greenery", code: "2011", name: "Premium Silk Peony Bunch", spec: "Pack of 5 stems | imported silk", price: null, poa: true, availability: "limited" },

  // --- Backdrops (3900s) ---
  { category: "backdrops-wall-panels-cloths", code: "3901", name: "Lycra Backdrop Cloth", spec: "Per mtr, width 60 inch, 20 shades", price: 220 },
  { category: "backdrops-wall-panels-cloths", code: "3902", name: "Galaxy Cloth Wall", spec: "8*10 feet ready panel with pocket stitch", price: 2400, isNew: true },
  { category: "backdrops-wall-panels-cloths", code: "3903", name: "Velvet Backdrop Panel", spec: "Size 4*8 feet | maroon, bottle green, royal blue", price: 1850 },
  { category: "backdrops-wall-panels-cloths", code: "3904", name: "3D Arch Backdrop Frame", spec: "Set of 3 arches (7ft, 6ft, 5ft), metal, knock-down", price: 5600, availability: "made_to_order" },
  { category: "backdrops-wall-panels-cloths", code: "3905", name: "Ceiling Drape Cloth", spec: "50 mtr roll, width 45 inch", price: 3200 },
  { category: "backdrops-wall-panels-cloths", code: "3906", name: "Sequin Shimmer Wall", spec: "Per sq feet, rose gold / silver", price: 140 },
  { category: "backdrops-wall-panels-cloths", code: "3907", name: "Printed Photo Booth Backdrop", spec: "Custom print, 6*8 feet, flex or cloth", price: null, poa: true, availability: "made_to_order" },

  // --- Lights ---
  { category: "lights-lighting-decor", code: "4101", name: "LED Rope Light", spec: "50 Mtr 5 FUNCTION ROPE", price: 750, isNew: true },
  { category: "lights-lighting-decor", code: "4102", name: "Fairy String Light (Warm White)", spec: "10 mtr, pack of 10 pcs, copper wire", price: 320 },
  { category: "lights-lighting-decor", code: "4103", name: "Pixel Light String", spec: "Per 12 mtr string with controller", price: 1100 },
  { category: "lights-lighting-decor", code: "4104", name: "Cluster Hanging Light Shade", spec: "Set of 5 shades with 2 mtr wire", price: 1450 },
  { category: "lights-lighting-decor", code: "4105", name: "Aluminium Light Stand", spec: "Height adjustable 6-10 feet, per pc", price: 2200 },
  { category: "lights-lighting-decor", code: "4106", name: "Waterproof Strip Light", spec: "5 mtr reel, 12V, with adapter", price: 480 },
  { category: "lights-lighting-decor", code: "4107", name: "Vintage Bulb Festoon", spec: "10 mtr with 20 holders (bulb separate)", price: 890 },

  // --- Lamps & Diyas ---
  { category: "lamps-diyas", code: "4301", name: "Golden Floor Lamp", spec: 'Size 14", 18", 22" — set of 3', price: 1800 },
  { category: "lamps-diyas", code: "4302", name: "Hanging Moroccan Lantern", spec: "Pack of 6, mixed size, metal + glass", price: 1350, isNew: true },
  { category: "lamps-diyas", code: "4303", name: "Brass Finish Samai (Deep Stand)", spec: "Height 24 inch, per pc", price: 950 },
  { category: "lamps-diyas", code: "4304", name: "LED Diya (Rechargeable)", spec: "Box of 24 pcs, warm flicker", price: 560 },
  { category: "lamps-diyas", code: "4305", name: "Terracotta Diya Set", spec: "Pack of 100 pcs, plain, 2 inch", price: 240 },
  { category: "lamps-diyas", code: "4306", name: "Hanging Jhoomar Lamp", spec: "24 inch diameter, mirror + bead work", price: null, poa: true },

  // --- Pots & Vases (3100s) ---
  { category: "pots-vases", code: "3101", name: "Botal Pot (Bottle Vase)", spec: "Height 16 inch, per pc, matte finish", price: 420 },
  { category: "pots-vases", code: "3102", name: "Lace Pot", spec: 'Size 10", 12", 14" — set of 3', price: 980, isNew: true, multiPhoto: true },
  { category: "pots-vases", code: "3103", name: "Moti Pot (Pearl Finish)", spec: "Per pc, height 12 inch, ivory", price: 380 },
  { category: "pots-vases", code: "3104", name: "Marble Finish Planter", spec: "Set of 2, 14 inch + 10 inch", price: 1250 },
  { category: "pots-vases", code: "3105", name: "Metal Urli Bowl", spec: "18 inch diameter, antique gold", price: 1650 },
  { category: "pots-vases", code: "3106", name: "Glass Cylinder Vase", spec: "Pack of 6, height 12 inch, clear", price: 720 },
  { category: "pots-vases", code: "3107", name: "Fiber Pillar Stand", spec: "Set of 3, heights 3ft/2.5ft/2ft, white", price: 2100, availability: "limited" },

  // --- SFX (600s) ---
  { category: "sfx-special-effects", code: "601", name: "Fog Machine 1500W", spec: "With wired remote, 1 ltr tank", price: 6500, isNew: true, description: "Workhorse fog machine for entries and first dances. Fog liquid sold separately." },
  { category: "sfx-special-effects", code: "602", name: "Bubble Machine (Double Wheel)", spec: "Per pc with 1 ltr bubble solution", price: 3800 },
  { category: "sfx-special-effects", code: "603", name: "8 Channel Payro Remote Machine", spec: "8 channel cold pyro controller, remote operated", price: 12500, availability: "limited" },
  { category: "sfx-special-effects", code: "604", name: "Cold Pyro Powder", spec: "Pack of 10 sachets, 20 sec burn", price: 900 },
  { category: "sfx-special-effects", code: "605", name: "Confetti Blaster (Handheld)", spec: "Pack of 12 pcs, 12 inch, metallic", price: 640 },
  { category: "sfx-special-effects", code: "606", name: "Balloon Blower Machine", spec: "Twin nozzle, 680W, per pc", price: 4200 },
  { category: "sfx-special-effects", code: "607", name: "Low Fog (Dry Ice Effect) Machine", spec: "3000W with trolley", price: null, poa: true, availability: "made_to_order" },
  { category: "sfx-special-effects", code: "608", name: "Fog Liquid (Water Based)", spec: "5 ltr can", price: 1150 },

  // --- Rajasthani ---
  { category: "rajasthani-haldi-mehndi-decor", code: "5201", name: "Mirror Work Umbrella", spec: "Pack of 6, 30 inch diameter", price: 1800 },
  { category: "rajasthani-haldi-mehndi-decor", code: "5202", name: "Phad Painted Backdrop Cloth", spec: "6*8 feet, hand painted", price: 3400, availability: "made_to_order" },
  { category: "rajasthani-haldi-mehndi-decor", code: "5203", name: "Puppet (Kathputli) Pair", spec: "Pack of 10 pairs, 18 inch", price: 950, isNew: true },
  { category: "rajasthani-haldi-mehndi-decor", code: "5204", name: "Decorative Matka Set", spec: "Set of 5, painted, 10-14 inch", price: 1450 },
  { category: "rajasthani-haldi-mehndi-decor", code: "5205", name: "Haldi Jhula Frame", spec: "Metal swing frame 5*3 feet, knock-down", price: 7800, availability: "made_to_order" },
  { category: "rajasthani-haldi-mehndi-decor", code: "5206", name: "Camel Cutout (Foam Board)", spec: "Height 5 feet, per pc, printed both side", price: 2200 },

  // --- Packing (2300s) ---
  { category: "packing-bouquet-accessories", code: "2301", name: "Cellophane Roll (Printed)", spec: "50 mtr roll, width 24 inch", price: 480 },
  { category: "packing-bouquet-accessories", code: "2302", name: "Satin Ribbon Assorted", spec: "Pack of 12 rolls, 1 inch * 20 mtr", price: 360 },
  { category: "packing-bouquet-accessories", code: "2303", name: "Hot Glue Gun (60W)", spec: "Per pc with 2 sticks", price: 240 },
  { category: "packing-bouquet-accessories", code: "2304", name: "Glue Stick", spec: "1 kg pack, 11mm transparent", price: 320 },
  { category: "packing-bouquet-accessories", code: "2305", name: "Floral Tape", spec: "Pack of 12 rolls, green / brown", price: 180 },
  { category: "packing-bouquet-accessories", code: "2306", name: "Moti String (Pearl Lardi)", spec: "Bundle of 20 strings, 5 mtr each", price: 420, isNew: true },
  { category: "packing-bouquet-accessories", code: "2307", name: "Brown Kraft Wrapping Sheet", spec: "Pack of 100 sheets, 20*30 inch", price: 550 },
  { category: "packing-bouquet-accessories", code: "2308", name: "Bouquet Cone Sleeve", spec: "Pack of 50, printed, medium", price: 390 },

  // --- Boxes & Trays (1100s-1400s) ---
  { category: "gift-boxes-trays-bags-baskets", code: "1101", name: "Dry Fruit Tray (Bandej)", spec: "Set of 4, velvet base, gold border", price: 1450, isNew: true },
  { category: "gift-boxes-trays-bags-baskets", code: "1102", name: "Cane Basket (Round)", spec: 'Set of 3, 12", 14", 16"', price: 980 },
  { category: "gift-boxes-trays-bags-baskets", code: "1203", name: "Potli Pouch (Brocade)", spec: "Pack of 25 pcs, assorted colour", price: 620 },
  { category: "gift-boxes-trays-bags-baskets", code: "1304", name: "Printed Paper Bag", spec: "Pack of 100, 10*12*4 inch", price: 850 },
  { category: "gift-boxes-trays-bags-baskets", code: "1405", name: "Tin Jar Hamper Set", spec: "Set of 6 jars in a wooden crate", price: 1750 },
  { category: "gift-boxes-trays-bags-baskets", code: "1406", name: "Acrylic Gift Box (Clear)", spec: "Pack of 12, 6*6*6 inch", price: 1100 },
  { category: "gift-boxes-trays-bags-baskets", code: "1407", name: "Wedding Card Tray", spec: "Per pc, 18*12 inch, mirror work", price: null, poa: true },

  // --- Carpets ---
  { category: "carpets-flooring", code: "6101", name: "Event Carpet (Red)", spec: "Per running mtr, width 6 feet", price: 260 },
  { category: "carpets-flooring", code: "6102", name: "Cotton Durrie", spec: "Size 6*9 feet, per pc, handloom", price: 1400 },
  { category: "carpets-flooring", code: "6103", name: "Artificial Grass Mat", spec: "Per sq feet, 25mm pile", price: 55 },
  { category: "carpets-flooring", code: "6104", name: "Agro Shade Net", spec: "Roll of 50 mtr, width 10 feet, 75%", price: 3600 },
  { category: "carpets-flooring", code: "6105", name: "Tirpal Sheet (Waterproof)", spec: "Size 15*18 feet, blue, per pc", price: 1250, availability: "limited" },

  // --- Mirror ---
  { category: "mirror-decor", code: "7101", name: "Arch Selfie Mirror Frame", spec: "Height 6 feet, gold metal frame", price: 6800, isNew: true },
  { category: "mirror-decor", code: "7102", name: "Decorative Wall Mirror Set", spec: "Set of 5, assorted shape, 12-18 inch", price: 2400 },
  { category: "mirror-decor", code: "7103", name: "Mirror Acrylic Panel", spec: "Sheet 4*8 feet, 2mm, silver", price: 1900 },
  { category: "mirror-decor", code: "7104", name: "Mirror Mosaic Tile", spec: "Pack of 500 pcs, 1 inch square", price: 380 },

  // --- Cooler & Fan ---
  { category: "cooler-fan", code: "8101", name: "Pedestal Fan (Heavy Duty)", spec: "24 inch, per pc, event grade", price: null, poa: true, availability: "limited" },
  { category: "cooler-fan", code: "8102", name: "Mist Fan", spec: "Per pc with 40 ltr tank", price: null, poa: true, availability: "made_to_order" },
  { category: "cooler-fan", code: "8103", name: "Event Cooler (Rental)", spec: "Per unit per day, delivery extra", price: null, poa: true, availability: "made_to_order" },

  // --- Sofa & Chair ---
  { category: "sofa-chair", code: "8201", name: "Wedding Stage Sofa", spec: "3 seater, carved frame, velvet upholstery", price: null, poa: true, availability: "made_to_order" },
  { category: "sofa-chair", code: "8202", name: "Carved Accent Chair", spec: "Pair, gold finish, your choice of fabric", price: null, poa: true, availability: "made_to_order" },
  { category: "sofa-chair", code: "8203", name: "Round Ottoman Stool", spec: "Set of 4, 18 inch diameter", price: 4800, availability: "limited" },

  // --- Ring Platter ---
  { category: "ring-platter-varmala", code: "9101", name: "Engagement Ring Platter", spec: "Per pc, 12 inch, gota + pearl work", price: 850, isNew: true },
  { category: "ring-platter-varmala", code: "9102", name: "Varmala Tray (Pair)", spec: "Set of 2, 16 inch, velvet base", price: 1200 },
  { category: "ring-platter-varmala", code: "9103", name: "Shagun Coconut Holder", spec: "Pack of 6, brass finish", price: 660 },
  { category: "ring-platter-varmala", code: "9104", name: "Gota Work Thali Set", spec: "Set of 5, assorted size", price: 1450 },

  // --- Festive ---
  { category: "festive-puja-items", code: "2401", name: "Pillar Candle Set", spec: "Set of 6, 3-8 inch, unscented", price: 540 },
  { category: "festive-puja-items", code: "2402", name: "Door Toran (Bandhanwar)", spec: "Pack of 12, 32 inch, mixed design", price: 960, isNew: true },
  { category: "festive-puja-items", code: "2403", name: "Rangoli Sticker Set", spec: "Pack of 20 sheets, 24 inch round", price: 400 },
  { category: "festive-puja-items", code: "2404", name: "Puja Thali Complete Set", spec: "Per set, 9 items, steel + gota", price: 780 },
  { category: "festive-puja-items", code: "2405", name: "Ganesh Idol (Eco Clay)", spec: "Height 9 inch, per pc, painted", price: 450, availability: "limited" },
  { category: "festive-puja-items", code: "2406", name: "Floating Candle", spec: "Pack of 50 pcs, 2 inch", price: 350 },

  // --- Accessories ---
  { category: "accessories", code: "2501", name: "Titli (Butterfly) Clips", spec: "Pack of 100 pcs, mixed colour", price: 280 },
  { category: "accessories", code: "2502", name: "Decorative Bird Set", spec: "Pack of 12, feather finish, 5 inch", price: 420 },
  { category: "accessories", code: "2503", name: "Brass Bell String", spec: "Pack of 10 strings, 3 feet each", price: 520 },
  { category: "accessories", code: "2504", name: "Floral Wire Stick", spec: "Bundle of 500 pcs, 12 inch, green", price: 190 },
  { category: "accessories", code: "2505", name: "Feather Plume", spec: "Pack of 24, 24 inch, dyed ostrich", price: 1300, availability: "limited" },
];
