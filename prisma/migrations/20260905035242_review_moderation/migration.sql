-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "contactHint" TEXT,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'approved',
ADD COLUMN     "submittedByCustomer" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "Review"("status");

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "Review"("productId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
