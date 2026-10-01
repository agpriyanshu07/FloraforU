-- Create the subcategories and file the existing catalogue into them.
--
-- This is data, not structure, and it runs on deploy so the shop does not have
-- to re-import 590 products by hand to get the new filters.
--
-- Every rule below is matched against the product NAME with a case-insensitive
-- POSIX regex, in the order written, and only ever fills a row that is still
-- unclassified -- so the first rule that matches a product wins, exactly like
-- the TypeScript classifier the admin and the CSV importer use. Re-running is
-- harmless: the inserts are guarded by ON CONFLICT and the updates by
-- "subcategoryId" IS NULL.
--
-- The patterns are the same ones as src/lib/subcategories.ts with one
-- deliberate difference: a word boundary is \y here and \b there. Postgres
-- reads \b as a backspace character, so the JS spelling matches nothing --
-- which is exactly how the first draft of this file left Gift Boxes, Light
-- Panels and Bulbs & Holders empty.
--
-- Categories are matched by name because that is what the catalogue import
-- created them with. A shop that has since renamed one simply gets no
-- subcategories for it, which is a no-op, not a broken page: a product with no
-- subcategory still lists under its category.
--
-- Only categories with enough stock to be worth splitting are here. Cooler &
-- Fan (4 products), Accessories (5), Sofa & Chair (8), Lamps & Diyas (9),
-- Mirror Décor (10) and Festive & Puja Items (1) stay flat on purpose.


-- ====================================================================
-- Lights & Lighting Décor
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'chandeliers-and-jhumar', 'Chandeliers & Jhumar', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Lights & Lighting Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'light-panels', 'Light Panels', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Lights & Lighting Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'light-stands', 'Light Stands', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Lights & Lighting Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'hanging-lights', 'Hanging Lights', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Lights & Lighting Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'led-and-par-lights', 'LED & Par Lights', '', 4, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Lights & Lighting Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'bulbs-and-holders', 'Bulbs & Holders', '', 5, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Lights & Lighting Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'decorative-lights', 'Decorative Lights', '', 6, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Lights & Lighting Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'chandeliers-and-jhumar' AND c."name" = 'Lights & Lighting Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'chandelier';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'light-panels' AND c."name" = 'Lights & Lighting Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '\ypanel\y';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'light-stands' AND c."name" = 'Lights & Lighting Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'light stand|candle stand|x stand|stand \(set';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'hanging-lights' AND c."name" = 'Lights & Lighting Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'hanging';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'led-and-par-lights' AND c."name" = 'Lights & Lighting Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '\yled\y|par light';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'bulbs-and-holders' AND c."name" = 'Lights & Lighting Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '\ybulb\y';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'decorative-lights' AND c."name" = 'Lights & Lighting Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL;

-- ====================================================================
-- Artificial Flowers & Greenery
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'flower-bunches', 'Flower Bunches', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'hanging-and-creepers', 'Hanging & Creepers', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'sticks', 'Sticks', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'leaves-and-patta', 'Leaves & Patta', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'fillers-and-pampas', 'Fillers & Pampas', '', 4, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'golden-and-silver', 'Golden & Silver', '', 5, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'loose-flowers', 'Loose Flowers', '', 6, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'flower-bunches' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'bunch';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'hanging-and-creepers' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'hanging|latta|wisteria';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'sticks' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'stick';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'leaves-and-patta' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'patta|pata|leave|leaf|money plant|satter';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'fillers-and-pampas' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'filler|pompas|gypsy|pops|poleen';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'golden-and-silver' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'golden|silver';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'loose-flowers' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL;

-- ====================================================================
-- Gift Boxes, Trays, Bags & Baskets
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'jar-hampers', 'Jar Hampers', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'tin-jars', 'Tin Jars', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'potli-bags', 'Potli Bags', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'bags-and-purses', 'Bags & Purses', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'trays-and-platters', 'Trays & Platters', '', 4, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'baskets-and-tokri', 'Baskets & Tokri', '', 5, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'gift-boxes', 'Gift Boxes', '', 6, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'other-gifting', 'Other Gifting', '', 7, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'jar-hampers' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '^\d+\s*(\+\s*\d+)?\s*jar|^\d+ khana|premium \d+ jar';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'tin-jars' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'tin jar';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'potli-bags' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'potli';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'bags-and-purses' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '\ybag\y|purse|attachi';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'trays-and-platters' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'tray|platter';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'baskets-and-tokri' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'basket|tokri|balti|cane';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'gift-boxes' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '\ybox\y';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'other-gifting' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL;

-- ====================================================================
-- Backdrops, Wall Panels & Cloths
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'table-and-chair-covers', 'Table & Chair Covers', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'ceiling-d-cor', 'Ceiling Décor', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'galaxy-and-butta', 'Galaxy & Butta', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'wall-backdrops', 'Wall Backdrops', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'panels', 'Panels', '', 4, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'cloth-and-fabric-rolls', 'Cloth & Fabric Rolls', '', 5, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'other-backdrop-d-cor', 'Other Backdrop Décor', '', 6, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'table-and-chair-covers' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'table cover|chair cover|counter table';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'ceiling-d-cor' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'ceiling';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'galaxy-and-butta' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'galaxy|galexy|butta';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'wall-backdrops' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'wall';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'panels' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'panel';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'cloth-and-fabric-rolls' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'lycra|cloth|chindi|print|foil|net|mate|grass';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'other-backdrop-d-cor' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL;

-- ====================================================================
-- Rajasthani & Haldi-Mehndi-Mayra Décor
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'chakri', 'Chakri', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'lardi-and-garlands', 'Lardi & Garlands', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'tassels-and-pom-poms', 'Tassels & Pom Poms', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'umbrellas', 'Umbrellas', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'jhumar-and-hangings', 'Jhumar & Hangings', '', 4, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'kites', 'Kites', '', 5, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'other-rajasthani', 'Other Rajasthani', '', 6, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'chakri' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'chakri';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'lardi-and-garlands' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'lardi';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'tassels-and-pom-poms' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'tassal|tussal|pom ?pom|churdi';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'umbrellas' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'umbrella';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'jhumar-and-hangings' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'jhumar|ring with bell|dream catcher|pankh';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'kites' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'kite';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'other-rajasthani' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL;

-- ====================================================================
-- Packing & Bouquet Accessories
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'ribbons-bows-and-lace', 'Ribbons, Bows & Lace', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Packing & Bouquet Accessories'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'tapes-and-glue', 'Tapes & Glue', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Packing & Bouquet Accessories'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'cellophane-and-nets', 'Cellophane & Nets', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Packing & Bouquet Accessories'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'papers-and-sheets', 'Papers & Sheets', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Packing & Bouquet Accessories'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'sprays-and-moti', 'Sprays & Moti', '', 4, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Packing & Bouquet Accessories'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'ribbons-bows-and-lace' AND c."name" = 'Packing & Bouquet Accessories'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'ribbon|bow|lace';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'tapes-and-glue' AND c."name" = 'Packing & Bouquet Accessories'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'tape|glue';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'cellophane-and-nets' AND c."name" = 'Packing & Bouquet Accessories'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'cellophane|net';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'papers-and-sheets' AND c."name" = 'Packing & Bouquet Accessories'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'paper|sheet|tissue';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'sprays-and-moti' AND c."name" = 'Packing & Bouquet Accessories'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL;

-- ====================================================================
-- Pots & Vases
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'railings-and-fences', 'Railings & Fences', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Pots & Vases'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'pillar-and-layer-pots', 'Pillar & Layer Pots', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Pots & Vases'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'bottle-pots', 'Bottle Pots', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Pots & Vases'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'printed-and-patterned', 'Printed & Patterned', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Pots & Vases'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'designer-pots', 'Designer Pots', '', 4, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Pots & Vases'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'railings-and-fences' AND c."name" = 'Pots & Vases'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'railing|fence';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'pillar-and-layer-pots' AND c."name" = 'Pots & Vases'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'pillar|layer';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'bottle-pots' AND c."name" = 'Pots & Vases'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'bottle|botal';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'printed-and-patterned' AND c."name" = 'Pots & Vases'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'printed|marble|lace|patta|moti|jali|net';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'designer-pots' AND c."name" = 'Pots & Vases'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL;

-- ====================================================================
-- SFX & Special Effects
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'pyro-and-sparkular', 'Pyro & Sparkular', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'SFX & Special Effects'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'co2-and-confetti', 'CO2 & Confetti', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'SFX & Special Effects'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'smoke-ice-and-bubbles', 'Smoke, Ice & Bubbles', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'SFX & Special Effects'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'balloon-and-photo-booth', 'Balloon & Photo Booth', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'SFX & Special Effects'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'pyro-and-sparkular' AND c."name" = 'SFX & Special Effects'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'pyro|sparkular';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'co2-and-confetti' AND c."name" = 'SFX & Special Effects'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'co2|confetti';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'smoke-ice-and-bubbles' AND c."name" = 'SFX & Special Effects'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'dry ice|bubble|foam machine|fan wheel';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'balloon-and-photo-booth' AND c."name" = 'SFX & Special Effects'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'balloon|selfie booth';
