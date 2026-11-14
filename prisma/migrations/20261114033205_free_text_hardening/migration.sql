ALTER TABLE "Transaction"
  ALTER COLUMN "description" SET DATA TYPE VARCHAR(200);

UPDATE "Category" SET "icon" = '📁' WHERE "icon" = '';
