-- AlterTable accounts: add opening_balance
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "opening_balance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable trades: add trade_type and settlement_id
ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "trade_type" TEXT NOT NULL DEFAULT 'REGULAR';
ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "settlement_id" TEXT;

-- CreateIndex trades_settlement_id_idx
CREATE INDEX IF NOT EXISTS "trades_settlement_id_idx" ON "trades"("settlement_id");

-- DropTable script_exchange_mappings and expiry_dates
DROP TABLE IF EXISTS "script_exchange_mappings" CASCADE;
DROP TABLE IF EXISTS "expiry_dates" CASCADE;

-- CreateTable settlements
CREATE TABLE IF NOT EXISTS "settlements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "from_date" TIMESTAMP(3) NOT NULL,
    "to_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable ledger_entries
CREATE TABLE IF NOT EXISTS "ledger_entries" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "entry_type" TEXT NOT NULL,
    "description" TEXT,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex ledger_entries
CREATE INDEX IF NOT EXISTS "ledger_entries_account_id_idx" ON "ledger_entries"("account_id");
CREATE INDEX IF NOT EXISTS "ledger_entries_date_idx" ON "ledger_entries"("date");

-- AddForeignKey trades -> settlements
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trades_settlement_id_fkey'
    ) THEN
        ALTER TABLE "trades" ADD CONSTRAINT "trades_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey ledger_entries -> accounts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ledger_entries_account_id_fkey'
    ) THEN
        ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
