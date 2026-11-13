-- CreateTable
CREATE TABLE "RecurringItem" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "category" TEXT NOT NULL,
    "categoryIcon" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'expense',
    "frequency" TEXT NOT NULL,
    "weekday" INTEGER,
    "dayOfMonth" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "lastPostedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringItem_householdId_idx" ON "RecurringItem"("householdId");

-- AddForeignKey
ALTER TABLE "RecurringItem" ADD CONSTRAINT "RecurringItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
