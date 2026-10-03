-- File the 26 products that sat under "All" with no subcategory, and add the
-- three subcategories they needed (Tape & Glue, Spray Paint & Moti, Table).
--
-- New subcategories come with a keyword rule (mirrored in
-- src/lib/subcategories.ts) so future imports file themselves. The rest are
-- moved by product slug into subcategories that already exist, because no
-- rule over the name could place them: "Elephant" is a mirror-work prop, and
-- "Ice Cream" is a tray design.
--
-- Every UPDATE is guarded by "subcategoryId" IS NULL, so anything the shop has
-- filed by hand since is left where it is, and running this twice is a no-op.

-- Packing & Bouquet Accessories

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'tape-and-glue', 'Tape & Glue', '', 3, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Packing & Bouquet Accessories'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'spray-paint-and-moti', 'Spray Paint & Moti', '', 4, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Packing & Bouquet Accessories'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'tape-and-glue' AND c."name" = 'Packing & Bouquet Accessories'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'tape|glue|dispenser';

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'spray-paint-and-moti' AND c."name" = 'Packing & Bouquet Accessories'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'spray|moti';

-- Sofa & Chair

INSERT INTO "Subcategory" ("id", "slug", "name", "description", "displayOrder", "categoryId", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), 'table', 'Table', '', 2, c."id", NOW(), NOW()
FROM "Category" c WHERE c."name" = 'Sofa & Chair'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'table' AND c."name" = 'Sofa & Chair'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."name" ~* 'table';

-- Backdrops, Wall Panels & Cloths

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'wall' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."slug" IN ('2-2-flower-box', 'iron-ring-stand');

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'hanging-cloths-and-backdrops' AND c."name" = 'Backdrops, Wall Panels & Cloths'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."slug" IN ('jari-kamal');

-- Gift Boxes, Trays, Bags & Baskets

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'dry-fruit-hamper-box' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."slug" IN ('wooden-lamp-triangle', 'wooden-triangle', 'daisy-triangle', 'turquoise-flower', '2-3-heritage');

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'trays' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."slug" IN ('ice-cream', 'hexagon-half-fiber', 'hexagon-half-liner');

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'fancy-box' AND c."name" = 'Gift Boxes, Trays, Bags & Baskets'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."slug" IN ('ribbon-digital-golden-set');

-- Mirror Décor

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'mirror-ball-n-more' AND c."name" = 'Mirror Décor'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."slug" IN ('elephant', 'hiran-deer', 'wooden-selfie-stand-with-mirror');

-- SFX & Special Effects

UPDATE "Product" p SET "subcategoryId" = s."id"
FROM "Subcategory" s JOIN "Category" c ON c."id" = s."categoryId"
WHERE s."slug" = 'machine' AND c."name" = 'SFX & Special Effects'
  AND p."categoryId" = c."id"
  AND p."subcategoryId" IS NULL
  AND p."slug" IN ('dry-ice-matka-with-stand');
