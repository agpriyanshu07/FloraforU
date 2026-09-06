-- The percentage taken off every product in a campaign. Nullable: a campaign
-- can carry a slogan ("Buy 2 get 1") with no arithmetic behind it.
ALTER TABLE "Offer" ADD COLUMN "discountPercent" INTEGER;

-- Per-product override, for the item discounted harder than the rest of a sale.
ALTER TABLE "OfferProduct" ADD COLUMN "offerPrice" DOUBLE PRECISION;
