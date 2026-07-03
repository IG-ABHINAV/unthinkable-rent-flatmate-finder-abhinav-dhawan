-- AlterTable
ALTER TABLE "Interest" ADD COLUMN "message" TEXT,
ADD COLUMN "moveInDate" DATE,
ADD COLUMN "stayDuration" INTEGER,
ADD COLUMN "quickNotes" TEXT[] DEFAULT ARRAY[]::TEXT[];
