-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "envelope" JSONB,
ADD COLUMN     "publishedAt" TIMESTAMP(3);
