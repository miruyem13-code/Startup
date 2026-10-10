ALTER TABLE "Mission" ADD COLUMN "difficulty" TEXT NOT NULL DEFAULT 'EASY';
ALTER TABLE "Mission" ADD COLUMN "eligibility" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Mission" ADD COLUMN "sponsorId" TEXT REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "Sponsor" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#276749',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "startsAt" DATETIME NOT NULL,
  "endsAt" DATETIME NOT NULL,
  CONSTRAINT "Sponsor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Sponsor_organizationId_status_idx" ON "Sponsor"("organizationId", "status");
CREATE TABLE "MissionVisit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userMissionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  CONSTRAINT "MissionVisit_userMissionId_fkey" FOREIGN KEY ("userMissionId") REFERENCES "UserMission"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MissionVisit_userMissionId_key_key" ON "MissionVisit"("userMissionId", "key");
