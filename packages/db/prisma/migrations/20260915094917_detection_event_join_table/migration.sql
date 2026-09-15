/*
  Warnings:

  - You are about to drop the column `eventId` on the `Detection` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Detection" DROP CONSTRAINT "Detection_eventId_fkey";

-- AlterTable
ALTER TABLE "Detection" DROP COLUMN "eventId";

-- CreateTable
CREATE TABLE "DetectionEvent" (
    "detectionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "DetectionEvent_pkey" PRIMARY KEY ("detectionId","eventId")
);

-- AddForeignKey
ALTER TABLE "DetectionEvent" ADD CONSTRAINT "DetectionEvent_detectionId_fkey" FOREIGN KEY ("detectionId") REFERENCES "Detection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectionEvent" ADD CONSTRAINT "DetectionEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
