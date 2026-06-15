-- Wipe existing data first to allow adding required columns without defaults
DELETE FROM "brokerages";
DELETE FROM "scripts";
DELETE FROM "accounts";

-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_group_id_fkey";

-- DropIndex
DROP INDEX "scripts_fldScriptName_idx";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "closing",
DROP COLUMN "credit",
DROP COLUMN "debit",
DROP COLUMN "default_credit",
DROP COLUMN "fldAOD",
DROP COLUMN "fldAddBook",
DROP COLUMN "fldBankAccNo",
DROP COLUMN "fldClientID",
DROP COLUMN "fldDPID",
DROP COLUMN "fldDematCharge",
DROP COLUMN "fldExposure",
DROP COLUMN "fldGroupBusiness",
DROP COLUMN "fldGroupFamily",
DROP COLUMN "fldL",
DROP COLUMN "fldMICR",
DROP COLUMN "fldMrgnAmt",
DROP COLUMN "fldPAN",
DROP COLUMN "fldPT",
DROP COLUMN "fldPhoneH",
DROP COLUMN "fldPhoneO2",
DROP COLUMN "fldPrintBill",
DROP COLUMN "fldReference",
DROP COLUMN "fldServiceTax",
DROP COLUMN "fldShare",
DROP COLUMN "fldStampDuty",
DROP COLUMN "fldTB",
DROP COLUMN "fldTeleDir",
DROP COLUMN "fldTranCharge",
DROP COLUMN "fldTurnOverTax",
DROP COLUMN "fldType",
DROP COLUMN "interest",
DROP COLUMN "opening",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "micr_code" TEXT,
ADD COLUMN     "reference_name" TEXT,
ALTER COLUMN "code" SET NOT NULL,
ALTER COLUMN "group_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "groups" DROP COLUMN "fldNo",
ADD COLUMN     "display_order" INTEGER;

-- AlterTable
ALTER TABLE "scripts" DROP COLUMN "fldDC",
DROP COLUMN "fldDivider",
DROP COLUMN "fldISIN",
DROP COLUMN "fldLotSize",
DROP COLUMN "fldMargin",
DROP COLUMN "fldMultiplier",
DROP COLUMN "fldPU",
DROP COLUMN "fldPrice",
DROP COLUMN "fldScriptACE",
DROP COLUMN "fldScriptACX",
DROP COLUMN "fldScriptASE",
DROP COLUMN "fldScriptBSE",
DROP COLUMN "fldScriptDGC",
DROP COLUMN "fldScriptICE",
DROP COLUMN "fldScriptMCX",
DROP COLUMN "fldScriptNCD",
DROP COLUMN "fldScriptNMC",
DROP COLUMN "fldScriptNSE",
DROP COLUMN "fldScriptName",
DROP COLUMN "fldScriptUCX",
DROP COLUMN "fldScriptUSE",
DROP COLUMN "fldShortScript",
DROP COLUMN "fldTP",
DROP COLUMN "fldType",
DROP COLUMN "fldUoQ",
ADD COLUMN     "full_name" TEXT NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isin" TEXT,
ADD COLUMN     "lot_size" INTEGER NOT NULL,
ADD COLUMN     "short_name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "script_exchange_mappings" (
    "id" TEXT NOT NULL,
    "script_id" TEXT NOT NULL,
    "exchange_id" TEXT NOT NULL,
    "exchange_script_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "script_exchange_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "trade_number" TEXT NOT NULL,
    "trade_date" TIMESTAMP(3) NOT NULL,
    "trade_time" TEXT,
    "account_id" TEXT NOT NULL,
    "script_id" TEXT NOT NULL,
    "exchange_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "script_exchange_mappings_script_id_exchange_id_key" ON "script_exchange_mappings"("script_id", "exchange_id");

-- CreateIndex
CREATE INDEX "trades_account_id_idx" ON "trades"("account_id");

-- CreateIndex
CREATE INDEX "trades_script_id_idx" ON "trades"("script_id");

-- CreateIndex
CREATE INDEX "trades_exchange_id_idx" ON "trades"("exchange_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_code_key" ON "accounts"("code");

-- CreateIndex
CREATE INDEX "scripts_full_name_idx" ON "scripts"("full_name");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_exchange_mappings" ADD CONSTRAINT "script_exchange_mappings_script_id_fkey" FOREIGN KEY ("script_id") REFERENCES "scripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_exchange_mappings" ADD CONSTRAINT "script_exchange_mappings_exchange_id_fkey" FOREIGN KEY ("exchange_id") REFERENCES "exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_script_id_fkey" FOREIGN KEY ("script_id") REFERENCES "scripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_exchange_id_fkey" FOREIGN KEY ("exchange_id") REFERENCES "exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "accounts_fldGroupNo_idx" RENAME TO "accounts_group_id_idx";

-- RenameIndex
ALTER INDEX "accounts_fldName_idx" RENAME TO "accounts_name_idx";

-- RenameIndex
ALTER INDEX "groups_fldGroupName_key" RENAME TO "groups_name_key";
