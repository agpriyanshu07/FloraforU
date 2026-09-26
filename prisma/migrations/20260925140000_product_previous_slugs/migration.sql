-- A product's URL changes when it is renamed (the admin has always done this,
-- and the importer now does too). The old slug is kept so links already shared
-- on WhatsApp redirect instead of 404ing.
ALTER TABLE "Product" ADD COLUMN "previousSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "Product_previousSlugs_idx" ON "Product" USING GIN ("previousSlugs");
