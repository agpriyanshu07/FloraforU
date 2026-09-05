-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "discountLabel" TEXT,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'marigold',
ADD COLUMN     "urgentWithinHours" INTEGER NOT NULL DEFAULT 48;
