-- Put the subcategory chips in the order the shop uses on its own site,
-- and move the products that a keyword rule filed under the wrong one.
--
-- GENERATED alongside the `position` field in src/lib/subcategories.ts. That
-- field exists because list order there is MATCH PRECEDENCE (specific before
-- general) while this is DISPLAY ORDER, and the two are different sequences.
-- Sorting the rules into display order would put the Loose Flowers catch-all
-- first and swallow all 85 products in that category.


-- Lights & Lighting Décor
UPDATE "Subcategory" s SET "displayOrder" = 1
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Lights & Lighting Décor' AND s."slug" = 'jhumar';
UPDATE "Subcategory" s SET "displayOrder" = 6
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Lights & Lighting Décor' AND s."slug" = 'light-panels';
UPDATE "Subcategory" s SET "displayOrder" = 4
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Lights & Lighting Décor' AND s."slug" = 'led-palco-and-strip-light';
UPDATE "Subcategory" s SET "displayOrder" = 0
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Lights & Lighting Décor' AND s."slug" = 'light-stand-and-hanging';
UPDATE "Subcategory" s SET "displayOrder" = 2
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Lights & Lighting Décor' AND s."slug" = 'imported-light-stand';
UPDATE "Subcategory" s SET "displayOrder" = 3
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Lights & Lighting Décor' AND s."slug" = 'imported-hanging-light';
UPDATE "Subcategory" s SET "displayOrder" = 5
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Lights & Lighting Décor' AND s."slug" = 'bulbs-and-holders';

-- Artificial Flowers & Greenery
UPDATE "Subcategory" s SET "displayOrder" = 2
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Artificial Flowers & Greenery' AND s."slug" = 'flower-bunch';
UPDATE "Subcategory" s SET "displayOrder" = 4
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Artificial Flowers & Greenery' AND s."slug" = 'ready-panel';
UPDATE "Subcategory" s SET "displayOrder" = 3
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Artificial Flowers & Greenery' AND s."slug" = 'hanging';
UPDATE "Subcategory" s SET "displayOrder" = 7
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Artificial Flowers & Greenery' AND s."slug" = 'golden-sticks';
UPDATE "Subcategory" s SET "displayOrder" = 6
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Artificial Flowers & Greenery' AND s."slug" = 'sticks';
UPDATE "Subcategory" s SET "displayOrder" = 1
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Artificial Flowers & Greenery' AND s."slug" = 'leaf';
UPDATE "Subcategory" s SET "displayOrder" = 5
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Artificial Flowers & Greenery' AND s."slug" = 'filler';
UPDATE "Subcategory" s SET "displayOrder" = 0
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Artificial Flowers & Greenery' AND s."slug" = 'loose-flowers';

-- Gift Boxes, Trays, Bags & Baskets
UPDATE "Subcategory" s SET "displayOrder" = 0
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Gift Boxes, Trays, Bags & Baskets' AND s."slug" = 'dry-fruit-box-2-jar';
UPDATE "Subcategory" s SET "displayOrder" = 1
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Gift Boxes, Trays, Bags & Baskets' AND s."slug" = 'dry-fruit-box-3-jar';
UPDATE "Subcategory" s SET "displayOrder" = 2
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Gift Boxes, Trays, Bags & Baskets' AND s."slug" = 'dry-fruit-box-4-jar';
UPDATE "Subcategory" s SET "displayOrder" = 3
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Gift Boxes, Trays, Bags & Baskets' AND s."slug" = 'dry-fruit-box-5-6-8-jar';
UPDATE "Subcategory" s SET "displayOrder" = 6
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Gift Boxes, Trays, Bags & Baskets' AND s."slug" = 'trays';
UPDATE "Subcategory" s SET "displayOrder" = 4
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Gift Boxes, Trays, Bags & Baskets' AND s."slug" = 'dry-fruit-hamper-box';
UPDATE "Subcategory" s SET "displayOrder" = 11
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Gift Boxes, Trays, Bags & Baskets' AND s."slug" = 'potly-grass-and-jar';
UPDATE "Subcategory" s SET "displayOrder" = 10
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Gift Boxes, Trays, Bags & Baskets' AND s."slug" = 'bags';
UPDATE "Subcategory" s SET "displayOrder" = 5
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Gift Boxes, Trays, Bags & Baskets' AND s."slug" = 'fancy-basket';
UPDATE "Subcategory" s SET "displayOrder" = 7
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Gift Boxes, Trays, Bags & Baskets' AND s."slug" = 'pine';
UPDATE "Subcategory" s SET "displayOrder" = 8
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Gift Boxes, Trays, Bags & Baskets' AND s."slug" = 'cane';
UPDATE "Subcategory" s SET "displayOrder" = 9
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Gift Boxes, Trays, Bags & Baskets' AND s."slug" = 'fancy-box';

-- Backdrops, Wall Panels & Cloths
UPDATE "Subcategory" s SET "displayOrder" = 0
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Backdrops, Wall Panels & Cloths' AND s."slug" = 'wall';
UPDATE "Subcategory" s SET "displayOrder" = 1
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Backdrops, Wall Panels & Cloths' AND s."slug" = 'ceiling';
UPDATE "Subcategory" s SET "displayOrder" = 2
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Backdrops, Wall Panels & Cloths' AND s."slug" = 'passage';
UPDATE "Subcategory" s SET "displayOrder" = 4
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Backdrops, Wall Panels & Cloths' AND s."slug" = 'table-chair-cover';
UPDATE "Subcategory" s SET "displayOrder" = 5
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Backdrops, Wall Panels & Cloths' AND s."slug" = 'selfie-cloths';
UPDATE "Subcategory" s SET "displayOrder" = 7
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Backdrops, Wall Panels & Cloths' AND s."slug" = 'printed-cloth';
UPDATE "Subcategory" s SET "displayOrder" = 6
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Backdrops, Wall Panels & Cloths' AND s."slug" = 'hanging-cloths-and-backdrops';
UPDATE "Subcategory" s SET "displayOrder" = 3
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Backdrops, Wall Panels & Cloths' AND s."slug" = 'plain-cloth';

-- Rajasthani & Haldi-Mehndi-Mayra Décor
UPDATE "Subcategory" s SET "displayOrder" = 0
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor' AND s."slug" = 'kite';
UPDATE "Subcategory" s SET "displayOrder" = 1
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor' AND s."slug" = 'chakri';
UPDATE "Subcategory" s SET "displayOrder" = 2
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor' AND s."slug" = 'lardi';
UPDATE "Subcategory" s SET "displayOrder" = 3
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor' AND s."slug" = 'umbrella';
UPDATE "Subcategory" s SET "displayOrder" = 4
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor' AND s."slug" = 'haldi-tub-urli';
UPDATE "Subcategory" s SET "displayOrder" = 5
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor' AND s."slug" = 'haldi-mehndi-items';
UPDATE "Subcategory" s SET "displayOrder" = 6
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor' AND s."slug" = 'rajasthani-hangings';
UPDATE "Subcategory" s SET "displayOrder" = 7
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Rajasthani & Haldi-Mehndi-Mayra Décor' AND s."slug" = 'props';

-- Packing & Bouquet Accessories
UPDATE "Subcategory" s SET "displayOrder" = 1
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Packing & Bouquet Accessories' AND s."slug" = 'ribbon';
UPDATE "Subcategory" s SET "displayOrder" = 2
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Packing & Bouquet Accessories' AND s."slug" = 'packing-net-mesh';
UPDATE "Subcategory" s SET "displayOrder" = 0
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Packing & Bouquet Accessories' AND s."slug" = 'cellophane-tissue-n-packing-paper';

-- Pots & Vases
UPDATE "Subcategory" s SET "displayOrder" = 0
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Pots & Vases' AND s."slug" = 'plastic-flower-pot';
UPDATE "Subcategory" s SET "displayOrder" = 1
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Pots & Vases' AND s."slug" = 'china-pot';
UPDATE "Subcategory" s SET "displayOrder" = 2
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Pots & Vases' AND s."slug" = 'ceramic-pot';
UPDATE "Subcategory" s SET "displayOrder" = 3
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Pots & Vases' AND s."slug" = 'metal-pot';
UPDATE "Subcategory" s SET "displayOrder" = 4
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Pots & Vases' AND s."slug" = 'urli';

-- SFX & Special Effects
UPDATE "Subcategory" s SET "displayOrder" = 0
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'SFX & Special Effects' AND s."slug" = 'machine';
UPDATE "Subcategory" s SET "displayOrder" = 1
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'SFX & Special Effects' AND s."slug" = 'pyro';
UPDATE "Subcategory" s SET "displayOrder" = 3
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'SFX & Special Effects' AND s."slug" = 'paper-and-jari-confetti';
UPDATE "Subcategory" s SET "displayOrder" = 2
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'SFX & Special Effects' AND s."slug" = 'liquid-and-powder';

-- Mirror Décor
UPDATE "Subcategory" s SET "displayOrder" = 2
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Mirror Décor' AND s."slug" = 'entry-gate';
UPDATE "Subcategory" s SET "displayOrder" = 0
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Mirror Décor' AND s."slug" = 'mirror-ball-n-more';
UPDATE "Subcategory" s SET "displayOrder" = 1
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Mirror Décor' AND s."slug" = 'mirror-stage';

-- Sofa & Chair
UPDATE "Subcategory" s SET "displayOrder" = 0
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Sofa & Chair' AND s."slug" = 'divana';
UPDATE "Subcategory" s SET "displayOrder" = 1
FROM "Category" c WHERE c."id" = s."categoryId" AND c."name" = 'Sofa & Chair' AND s."slug" = 'chair';

-- A Dry Fruit Tray is a tray. Six of them were filed as hampers because the
-- words "dry fruit" were matched before the word "tray".
UPDATE "Product" p SET "subcategoryId" = t."id"
FROM "Subcategory" t
JOIN "Category" c ON c."id" = t."categoryId"
JOIN "Subcategory" h ON h."categoryId" = c."id" AND h."slug" = 'dry-fruit-hamper-box'
WHERE c."name" = 'Gift Boxes, Trays, Bags & Baskets' AND t."slug" = 'trays'
  AND p."subcategoryId" = h."id" AND p."name" ~* 'tray|platter';

-- "Light Stand Panel" is a panel; "light stand" claimed it first.
UPDATE "Product" p SET "subcategoryId" = t."id"
FROM "Subcategory" t
JOIN "Category" c ON c."id" = t."categoryId"
WHERE c."name" = 'Lights & Lighting Décor' AND t."slug" = 'light-panels'
  AND p."categoryId" = c."id" AND p."name" ~* '\ypanel\y';
