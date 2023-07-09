-- AlterTable
ALTER TABLE "roundSummary" ADD COLUMN     "averageTipInToken" TEXT NOT NULL DEFAULT '0',
ADD COLUMN     "totalTippedInToken" TEXT NOT NULL DEFAULT '0';
