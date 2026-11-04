-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "currency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMembership" (
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdMembership_pkey" PRIMARY KEY ("householdId","userId")
);

-- CreateTable
CREATE TABLE "InviteLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "InviteLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteLink_token_key" ON "InviteLink"("token");

-- AddForeignKey
ALTER TABLE "HouseholdMembership" ADD CONSTRAINT "HouseholdMembership_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMembership" ADD CONSTRAINT "HouseholdMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one personal Household per distinct user referenced anywhere in
-- the app tables, carrying over the currency from UserSettings when present.
-- householdId/addedById are then copied from the old userId values, so no
-- existing rows are dropped or lost.
CREATE TEMP TABLE "_user_household_map" (
    "userId" TEXT PRIMARY KEY,
    "householdId" TEXT NOT NULL
);

INSERT INTO "_user_household_map" ("userId", "householdId")
SELECT DISTINCT "userId", gen_random_uuid()::text
FROM (
    SELECT "id" AS "userId" FROM "User"
    UNION SELECT "userId" FROM "UserSettings"
    UNION SELECT "userId" FROM "Category"
    UNION SELECT "userId" FROM "Transaction"
    UNION SELECT "userId" FROM "MonthHistory"
    UNION SELECT "userId" FROM "YearHistory"
) "u";

INSERT INTO "Household" ("id", "currency", "createdAt", "updatedAt")
SELECT m."householdId", s."currency", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "_user_household_map" m
LEFT JOIN "UserSettings" s ON s."userId" = m."userId";

INSERT INTO "HouseholdMembership" ("householdId", "userId", "joinedAt")
SELECT m."householdId", m."userId", CURRENT_TIMESTAMP
FROM "_user_household_map" m
JOIN "User" u ON u."id" = m."userId";

-- AlterTable: Category re-scoped from userId to householdId
ALTER TABLE "Category" ADD COLUMN "householdId" TEXT;

UPDATE "Category" c
SET "householdId" = m."householdId"
FROM "_user_household_map" m
WHERE c."userId" = m."userId";

ALTER TABLE "Category" ALTER COLUMN "householdId" SET NOT NULL;

DROP INDEX "Category_name_userId_type_key";

ALTER TABLE "Category" DROP COLUMN "userId";

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_householdId_type_key" ON "Category"("name", "householdId", "type");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Transaction gains householdId and renames userId to addedById
ALTER TABLE "Transaction" ADD COLUMN "householdId" TEXT;

UPDATE "Transaction" t
SET "householdId" = m."householdId"
FROM "_user_household_map" m
WHERE t."userId" = m."userId";

ALTER TABLE "Transaction" ALTER COLUMN "householdId" SET NOT NULL;

ALTER TABLE "Transaction" RENAME COLUMN "userId" TO "addedById";

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: MonthHistory re-scoped from userId to householdId
ALTER TABLE "MonthHistory" DROP CONSTRAINT "MonthHistory_pkey";

ALTER TABLE "MonthHistory" ADD COLUMN "householdId" TEXT;

UPDATE "MonthHistory" h
SET "householdId" = m."householdId"
FROM "_user_household_map" m
WHERE h."userId" = m."userId";

ALTER TABLE "MonthHistory" ALTER COLUMN "householdId" SET NOT NULL;

ALTER TABLE "MonthHistory" DROP COLUMN "userId";

ALTER TABLE "MonthHistory" ADD CONSTRAINT "MonthHistory_pkey" PRIMARY KEY ("day", "month", "year", "householdId");

-- AddForeignKey
ALTER TABLE "MonthHistory" ADD CONSTRAINT "MonthHistory_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: YearHistory re-scoped from userId to householdId
ALTER TABLE "YearHistory" DROP CONSTRAINT "YearHistory_pkey";

ALTER TABLE "YearHistory" ADD COLUMN "householdId" TEXT;

UPDATE "YearHistory" h
SET "householdId" = m."householdId"
FROM "_user_household_map" m
WHERE h."userId" = m."userId";

ALTER TABLE "YearHistory" ALTER COLUMN "householdId" SET NOT NULL;

ALTER TABLE "YearHistory" DROP COLUMN "userId";

ALTER TABLE "YearHistory" ADD CONSTRAINT "YearHistory_pkey" PRIMARY KEY ("month", "year", "householdId");

-- AddForeignKey
ALTER TABLE "YearHistory" ADD CONSTRAINT "YearHistory_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable: currency now lives on Household (backfilled above)
DROP TABLE "UserSettings";
