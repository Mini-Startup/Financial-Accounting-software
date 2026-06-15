import { Module } from '@nestjs/common';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { TradeImportService } from './trade-import.service';

@Module({
  controllers: [TradesController],
  providers: [TradesService, TradeImportService],
  exports: [TradesService, TradeImportService],
})
export class TradesModule {}
