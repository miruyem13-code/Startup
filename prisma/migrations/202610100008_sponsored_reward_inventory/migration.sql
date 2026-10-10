ALTER TABLE "Reward" ADD COLUMN "sponsorId" TEXT REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Reward_sponsorId_idx" ON "Reward"("sponsorId");

-- Keep sponsor redemption attribution even if reward ownership later changes.
ALTER TABLE "RewardRedemption" ADD COLUMN "sponsorId" TEXT REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "RewardRedemption_sponsorId_createdAt_idx"
  ON "RewardRedemption"("sponsorId", "createdAt");
