-- AlterTable: Add exchange_id and currency_id to scripts table
ALTER TABLE "scripts" ADD COLUMN IF NOT EXISTS "exchange_id" TEXT;
ALTER TABLE "scripts" ADD COLUMN IF NOT EXISTS "currency_id" TEXT;

-- AlterTable: Add exch_order_id to trades table
ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "exch_order_id" TEXT;

-- AddForeignKey: scripts -> exchanges
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scripts_exchange_id_fkey'
  ) THEN
    ALTER TABLE "scripts" ADD CONSTRAINT "scripts_exchange_id_fkey" FOREIGN KEY ("exchange_id") REFERENCES "exchanges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: scripts -> currencies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scripts_currency_id_fkey'
  ) THEN
    ALTER TABLE "scripts" ADD CONSTRAINT "scripts_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
