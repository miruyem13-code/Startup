-- Preserve one relationship per unordered user pair, preferring accepted connections.
ALTER TABLE "Friendship" ADD COLUMN "pairKey" TEXT;
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY CASE WHEN "requesterId" < "addresseeId"
      THEN "requesterId" ELSE "addresseeId" END,
      CASE WHEN "requesterId" < "addresseeId"
      THEN "addresseeId" ELSE "requesterId" END
    ORDER BY CASE WHEN "status" = 'ACCEPTED' THEN 0 ELSE 1 END,
      "createdAt" ASC, "id" ASC
  ) AS "rank"
  FROM "Friendship"
)
DELETE FROM "Friendship" WHERE "id" IN (SELECT "id" FROM ranked WHERE "rank" > 1);
UPDATE "Friendship" SET "pairKey" =
  CASE WHEN "requesterId" < "addresseeId"
    THEN CAST(length("requesterId") AS TEXT) || ':' || "requesterId" ||
         CAST(length("addresseeId") AS TEXT) || ':' || "addresseeId"
    ELSE CAST(length("addresseeId") AS TEXT) || ':' || "addresseeId" ||
         CAST(length("requesterId") AS TEXT) || ':' || "requesterId"
  END;
CREATE UNIQUE INDEX "Friendship_pairKey_key" ON "Friendship"("pairKey");

-- Null historical organization values are intentional: past membership cannot
-- be reconstructed safely, so only reservations made after deployment count.
ALTER TABLE "Rental" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Rental_organizationId_state_startedAt_endedAt_idx"
  ON "Rental"("organizationId", "state", "startedAt", "endedAt");
