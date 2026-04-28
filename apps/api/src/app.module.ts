import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './modules/accounts/accounts.module';
import { ScriptsModule } from './modules/scripts/scripts.module';
import { ExchangesModule } from './modules/exchanges/exchanges.module';
import { BrokeragesModule } from './modules/brokerages/brokerages.module';

@Module({
  imports: [AccountsModule, ScriptsModule, ExchangesModule, BrokeragesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
