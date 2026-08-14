-- DropIndex
DROP INDEX IF EXISTS "closing_rates_exchange_id_script_id_rate_date_key";

-- AlterTable
ALTER TABLE "closing_rates" ALTER COLUMN "script_id" DROP NOT NULL;
ALTER TABLE "closing_rates" ADD COLUMN IF NOT EXISTS "security_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "closing_rates" ADD COLUMN IF NOT EXISTS "expiry" TEXT;
ALTER TABLE "closing_rates" ADD COLUMN IF NOT EXISTS "del_month" TEXT;
ALTER TABLE "closing_rates" ADD COLUMN IF NOT EXISTS "call_put" TEXT;
ALTER TABLE "closing_rates" ADD COLUMN IF NOT EXISTS "strike_price" DOUBLE PRECISION;
ALTER TABLE "closing_rates" ADD COLUMN IF NOT EXISTS "bloomberg_code" TEXT;
ALTER TABLE "closing_rates" ADD COLUMN IF NOT EXISTS "currency_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "closing_rates_exchange_id_security_name_rate_date_key" ON "closing_rates"("exchange_id", "security_name", "rate_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "closing_rates_security_name_idx" ON "closing_rates"("security_name");
