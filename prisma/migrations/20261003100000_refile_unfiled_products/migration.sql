-- Re-file every product that is currently unfiled.
--
-- On the live site, 43 of the 85 products in Artificial Flowers & Greenery had
-- no subcategory: the category page showed two chips (Loose Flowers and
-- Sticks) where it should show seven, because a chip is only rendered when it
-- has stock in it. Other categories were affected the same way.
--
-- The cause is not in the classifier. Replaying the original classify
-- migration against the real 590-product catalogue and diffing it against the
-- TypeScript classifier gives 583 identical and 7 differences, and those 7 are
-- exactly the ones the previous migration fixed. Both agree; the production
-- rows simply lost their subcategoryId at some point after being filed, which
-- `onDelete: SetNull` and the importer can both do.
--
-- So rather than chase which one did it, this re-runs the whole classifier.
-- It is safe to run over a live catalogue and safe to run twice: every INSERT
-- is ON CONFLICT DO NOTHING and every UPDATE is guarded by
-- "subcategoryId" IS NULL, so it can only ever fill an empty slot. Nothing the
-- shop has filed by hand -- in the admin, or on the File by photo screen --
-- can be moved by it.
--
-- Pots & Vases stays unfiled on purpose: its subcategories are materials, and
-- no rule over a product name can tell a ceramic pot from a plastic one.

-- ====================================================================
-- Lights & Lighting Décor
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'jhumar', 'Jhumar', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Lights & Lighting Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'light-panels', 'Light Panels', '', 6, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Lights & Lighting Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'led-palco-and-strip-light', 'LED, Palco & Strip Light', '', 4, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Lights & Lighting Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'light-stand-and-hanging', 'Light Stand & Hanging', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Lights & Lighting Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'imported-light-stand', 'Imported Light Stand', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Lights & Lighting Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'imported-hanging-light', 'Imported Hanging Light', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Lights & Lighting Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'bulbs-and-holders', 'Bulbs & Holders', '', 5, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Lights & Lighting Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'jhumar' AND c."name" = 'Lights & Lighting Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'chandelier|jhumar';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'light-panels' AND c."name" = 'Lights & Lighting Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '\ypanel\y';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'led-palco-and-strip-light' AND c."name" = 'Lights & Lighting Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '\yled\y|palco|strip|par light|cloth light|crock light';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'light-stand-and-hanging' AND c."name" = 'Lights & Lighting Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'light stand|candle stand|x stand|stand \(set|hanging|light tree|shell light|light bird|titli bird|sun light \d|\y9\d{2}\y';

-- Imported Light Stand: filed by hand; nothing in a product name identifies it.

-- Imported Hanging Light: filed by hand; nothing in a product name identifies it.

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'bulbs-and-holders' AND c."name" = 'Lights & Lighting Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '\ybulbs?\y';

-- ====================================================================
-- Artificial Flowers & Greenery
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'flower-bunch', 'Flower Bunch', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'ready-panel', 'Ready Panel', '', 4, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'hanging', 'Hanging', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'golden-sticks', 'Golden Sticks', '', 7, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'sticks', 'Sticks', '', 6, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'leaf', 'Leaf', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'filler', 'Filler', '', 5, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'loose-flowers', 'Loose Flowers', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Artificial Flowers & Greenery'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'flower-bunch' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'bunch';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'ready-panel' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'panel|ready';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'hanging' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'hanging|latta|wisteria';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'golden-sticks' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '(golden|silver).*stick|stick.*(golden|silver)';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'sticks' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'stick';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'leaf' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'patta|pata|leave|leaf|money plant|satter';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'filler' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'filler|pompas|gypsy|pops|poleen';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'loose-flowers' AND c."name" = 'Artificial Flowers & Greenery'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL;

-- ====================================================================
-- Gift Boxes, Trays, Bags & Baskets
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'dry-fruit-box-2-jar', 'Dry Fruit Box 2 Jar', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'dry-fruit-box-3-jar', 'Dry Fruit Box 3 Jar', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'dry-fruit-box-4-jar', 'Dry Fruit Box 4 Jar', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'dry-fruit-box-5-6-8-jar', 'Dry Fruit Box 5, 6, 8 Jar', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'trays', 'Trays', '', 6, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'dry-fruit-hamper-box', 'Dry Fruit Hamper Box', '', 4, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'potly-grass-and-jar', 'Potly, Grass & Jar', '', 11, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'bags', 'Bags', '', 10, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'fancy-basket', 'Fancy Basket', '', 5, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'pine', 'Pine', '', 7, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'cane', 'Cane', '', 8, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'fancy-box', 'Fancy Box', '', 9, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'dry-fruit-box-2-jar' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '^2\s*jar';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'dry-fruit-box-3-jar' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '^3\s*(\+\s*2\s*)?jar';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'dry-fruit-box-4-jar' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '^4\s*jar|^4 khana';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'dry-fruit-box-5-6-8-jar' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '^[568]\s*jar';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'trays' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'tray|platter';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'dry-fruit-hamper-box' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'hamper|dry fruit|premium \d+ jar|meva';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'potly-grass-and-jar' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'potli|potly|tin jar|\yjar\y|grass';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'bags' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '\ybag\y|purse|attachi|balti';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'fancy-basket' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'basket|tokri';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'pine' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'pine';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'cane' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'cane';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'fancy-box' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '\ybox\y';

-- ====================================================================
-- Backdrops, Wall Panels & Cloths
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'wall', 'Wall', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'ceiling', 'Ceiling', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'passage', 'Passage', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'table-chair-cover', 'Table - Chair Cover', '', 4, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'selfie-cloths', 'Selfie Cloths', '', 5, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'printed-cloth', 'Printed Cloth', '', 7, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'hanging-cloths-and-backdrops', 'Hanging Cloths & Backdrops', '', 6, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'plain-cloth', 'Plain Cloth', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Backdrops, Wall Panels & Cloths'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'wall' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'wall';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'ceiling' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'ceiling';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'passage' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'passage';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'table-chair-cover' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'table cover|chair cover|counter table';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'selfie-cloths' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'selfie';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'printed-cloth' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'print';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'hanging-cloths-and-backdrops' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'hanging|jhaler|chindi|daman|panel|butta';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'plain-cloth' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'lycra|velvet|roto|micro|galaxy|galexy|net|cloth|foil|mate|grass';

-- ====================================================================
-- Rajasthani & Haldi-Mehndi-Mayra Décor
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'kite', 'Kite', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'chakri', 'Chakri', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'lardi', 'Lardi', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'umbrella', 'Umbrella', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'haldi-tub-urli', 'Haldi Tub (Urli)', '', 4, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'haldi-mehndi-items', 'Haldi / Mehndi Items', '', 5, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'rajasthani-hangings', 'Rajasthani Hangings', '', 6, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'props', 'Props', '', 7, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'kite' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'kite';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'chakri' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'chakri';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'lardi' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'lardi';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'umbrella' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'umbrella';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'haldi-tub-urli' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'urli|haldi tub|haldi top';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'haldi-mehndi-items' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'haldi|mehendi|mehndi';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'rajasthani-hangings' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'jhumar|hanging|ring with bell|dream catcher|pankh|tassal|tussal|pom ?pom|churdi|lotus|rajni';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'props' AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL;

-- ====================================================================
-- Packing & Bouquet Accessories
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'ribbon', 'Ribbon', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Packing & Bouquet Accessories'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'packing-net-mesh', 'Packing Net Mesh', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Packing & Bouquet Accessories'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'cellophane-tissue-n-packing-paper', 'Cellophane Tissue n Packing Paper', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Packing & Bouquet Accessories'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'ribbon' AND c."name" = 'Packing & Bouquet Accessories'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'ribbon|bow|lace';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'packing-net-mesh' AND c."name" = 'Packing & Bouquet Accessories'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* '\ynet\y|mesh';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'cellophane-tissue-n-packing-paper' AND c."name" = 'Packing & Bouquet Accessories'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'cellophane|tissue|paper|sheet';

-- ====================================================================
-- Pots & Vases
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'plastic-flower-pot', 'Plastic Flower Pot', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Pots & Vases'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'china-pot', 'China Pot', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Pots & Vases'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'ceramic-pot', 'Ceramic Pot', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Pots & Vases'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'metal-pot', 'Metal Pot', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Pots & Vases'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'urli', 'Urli', '', 4, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Pots & Vases'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

-- Plastic Flower Pot: filed by hand; nothing in a product name identifies it.

-- China Pot: filed by hand; nothing in a product name identifies it.

-- Ceramic Pot: filed by hand; nothing in a product name identifies it.

-- Metal Pot: filed by hand; nothing in a product name identifies it.

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'urli' AND c."name" = 'Pots & Vases'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'urli';

-- ====================================================================
-- SFX & Special Effects
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'machine', 'Machine', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'SFX & Special Effects'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'pyro', 'Pyro', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'SFX & Special Effects'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'paper-and-jari-confetti', 'Paper & Jari Confetti', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'SFX & Special Effects'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'liquid-and-powder', 'Liquid & Powder', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'SFX & Special Effects'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'machine' AND c."name" = 'SFX & Special Effects'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'machine|wheel|booth';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'pyro' AND c."name" = 'SFX & Special Effects'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'pyro|sparkular';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'paper-and-jari-confetti' AND c."name" = 'SFX & Special Effects'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'confetti';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'liquid-and-powder' AND c."name" = 'SFX & Special Effects'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'co2|gun';

-- ====================================================================
-- Mirror Décor
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'entry-gate', 'Entry Gate', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Mirror Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'mirror-ball-n-more', 'Mirror Ball n More', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Mirror Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'mirror-stage', 'Mirror Stage', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Mirror Décor'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'entry-gate' AND c."name" = 'Mirror Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'gate|entry';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'mirror-ball-n-more' AND c."name" = 'Mirror Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'ball';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'mirror-stage' AND c."name" = 'Mirror Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'stage|wall|pillar|table|hexagon';

-- ====================================================================
-- Sofa & Chair
-- ====================================================================

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'divana', 'Divana', '', 0, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Sofa & Chair'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'chair', 'Chair', '', 1, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Sofa & Chair'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'divana' AND c."name" = 'Sofa & Chair'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'dewana|divana|diwan|sofa';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'chair' AND c."name" = 'Sofa & Chair'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'chair';
