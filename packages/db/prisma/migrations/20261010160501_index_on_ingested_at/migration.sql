-- DropIndex
DROP INDEX "Event_organizationId_actionCategory_outcomeStatus_timestamp_idx";

-- DropIndex
DROP INDEX "Event_organizationId_actorId_timestamp_idx";

-- CreateIndex
CREATE INDEX "Event_organizationId_actionCategory_outcomeStatus_ingestedA_idx" ON "Event"("organizationId", "actionCategory", "outcomeStatus", "ingestedAt");

-- CreateIndex
CREATE INDEX "Event_organizationId_actorId_ingestedAt_idx" ON "Event"("organizationId", "actorId", "ingestedAt");
