CREATE INDEX "Transaction_householdId_date_idx" ON "Transaction"("householdId", "date");
CREATE INDEX "Transaction_householdId_shared_type_idx" ON "Transaction"("householdId", "shared", "type");
CREATE INDEX "Transaction_householdId_goalId_idx" ON "Transaction"("householdId", "goalId");
