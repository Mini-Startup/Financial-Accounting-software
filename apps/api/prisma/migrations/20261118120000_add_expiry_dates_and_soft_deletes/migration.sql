-- AlterTable accounts: add is_deleted, deleted_at
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "accounts_is_deleted_idx" ON "accounts"("is_deleted");

-- AlterTable scripts: add is_deleted, deleted_at
ALTER TABLE "scripts" ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "scripts" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "scripts_is_deleted_idx" ON "scripts"("is_deleted");

-- AlterTable exchanges: add is_deleted, deleted_at
ALTER TABLE "exchanges" ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "exchanges" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "exchanges_is_deleted_idx" ON "exchanges"("is_deleted");

-- AlterTable trades: add is_deleted, deleted_at
ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "trades_is_deleted_idx" ON "trades"("is_deleted");
CREATE INDEX IF NOT EXISTS "trades_is_deleted_settlement_id_idx" ON "trades"("is_deleted", "settlement_id");

-- AlterTable brokerages: add is_deleted, deleted_at
ALTER TABLE "brokerages" ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "brokerages" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "brokerages_is_deleted_idx" ON "brokerages"("is_deleted");

-- CreateTable expiry_dates
CREATE TABLE IF NOT EXISTS "expiry_dates" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "normalized_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expiry_dates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex expiry_dates_date_key
CREATE UNIQUE INDEX IF NOT EXISTS "expiry_dates_date_key" ON "expiry_dates"("date");
CREATE INDEX IF NOT EXISTS "expiry_dates_normalized_date_idx" ON "expiry_dates"("normalized_date");
CREATE INDEX IF NOT EXISTS "expiry_dates_is_deleted_idx" ON "expiry_dates"("is_deleted");
