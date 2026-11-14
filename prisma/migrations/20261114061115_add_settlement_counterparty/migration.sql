BEGIN;

ALTER TABLE "Transaction" ADD COLUMN "counterpartyId" TEXT;

CREATE FUNCTION public.resolve_settlement_counterparty_id(
  settlement_household_id TEXT,
  settlement_payer_id TEXT,
  settlement_description TEXT
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  WITH "currentMembers" AS (
    SELECT
      membership."householdId",
      member."id" AS "memberId",
      member."name"
    FROM public."HouseholdMembership" AS membership
    JOIN public."User" AS member ON member."id" = membership."userId"
    WHERE membership."householdId" = settlement_household_id
  ),
  "membersWithUniqueNames" AS (
    SELECT
      "householdId",
      "name",
      MIN("memberId") AS "memberId"
    FROM "currentMembers"
    GROUP BY "householdId", "name"
    HAVING COUNT(*) = 1
  )
  SELECT "memberId"
  FROM "membersWithUniqueNames"
  WHERE
    settlement_description = CONCAT('Settlement with ', "name")
    AND "memberId" <> settlement_payer_id;
$$;

UPDATE "Transaction" AS settlement
SET "counterpartyId" = public.resolve_settlement_counterparty_id(
  settlement."householdId",
  settlement."addedById",
  settlement."description"
)
WHERE
  settlement."category" = 'Settlement'
  AND settlement."shared" = FALSE
  AND settlement."type" = 'expense'
  AND settlement."counterpartyId" IS NULL;

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_counterpartyId_fkey"
  FOREIGN KEY ("counterpartyId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- The previous app can write between migration and deploy, so resolve only an
-- exact, unique current member and never the payer.
CREATE FUNCTION public.set_settlement_counterparty_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF
    NEW."counterpartyId" IS NULL
    AND NEW."category" = 'Settlement'
    AND NEW."shared" = FALSE
    AND NEW."type" = 'expense'
  THEN
    NEW."counterpartyId" := public.resolve_settlement_counterparty_id(
      NEW."householdId",
      NEW."addedById",
      NEW."description"
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "Transaction_set_settlement_counterparty_id"
BEFORE INSERT ON "Transaction"
FOR EACH ROW
EXECUTE FUNCTION public.set_settlement_counterparty_id();

COMMIT;
