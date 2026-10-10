ALTER TABLE "UserMission" ADD COLUMN "joinedAt" DATETIME;
CREATE INDEX "UserMission_userId_completedAt_idx" ON "UserMission"("userId", "completedAt");
