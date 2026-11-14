ALTER TABLE "Category" ADD COLUMN "id" TEXT DEFAULT gen_random_uuid()::text;

ALTER TABLE "Category" ALTER COLUMN "id" SET NOT NULL;

ALTER TABLE "Category" ADD CONSTRAINT "Category_pkey" PRIMARY KEY ("id");
