import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './modules/accounts/accounts.module';
import { ScriptsModule } from './modules/scripts/scripts.module';

@Module({
  imports: [AccountsModule, ScriptsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
