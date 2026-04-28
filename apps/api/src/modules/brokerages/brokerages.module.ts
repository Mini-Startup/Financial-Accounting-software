import { Module } from '@nestjs/common';
import { BrokeragesController } from './brokerages.controller';
import { BrokeragesService } from './brokerages.service';

@Module({
  controllers: [BrokeragesController],
  providers: [BrokeragesService],
  exports: [BrokeragesService],
})
export class BrokeragesModule {}
