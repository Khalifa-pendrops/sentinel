-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "actionCategory" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "actionTarget" TEXT,
ADD COLUMN     "integrationId" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "sourceIp" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "Event_organizationId_actionCategory_outcomeStatus_timestamp_idx" ON "Event"("organizationId", "actionCategory", "outcomeStatus", "timestamp");

-- CreateIndex
CREATE INDEX "Event_organizationId_actorId_timestamp_idx" ON "Event"("organizationId", "actorId", "timestamp");
