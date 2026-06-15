-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "broker_id" TEXT,
ADD COLUMN     "client_rate" DOUBLE PRECISION,
ADD COLUMN     "broker_rate" DOUBLE PRECISION,
ADD COLUMN     "client_brokerage" DOUBLE PRECISION,
ADD COLUMN     "broker_brokerage" DOUBLE PRECISION,
ADD COLUMN     "profit_total" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "trades_broker_id_idx" ON "trades"("broker_id");

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
