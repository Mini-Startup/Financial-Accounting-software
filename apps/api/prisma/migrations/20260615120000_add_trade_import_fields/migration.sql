-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "exchange_time" TEXT,
ADD COLUMN     "expiry" TEXT,
ADD COLUMN     "order_id" TEXT,
ADD COLUMN     "order_time" TEXT,
ADD COLUMN     "terminal" TEXT,
ADD COLUMN     "unique_trade_id" TEXT;
