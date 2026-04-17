import { Module } from '@nestjs/common';
import { ScriptsService } from './scripts.service';
import { ScriptsController } from './scripts.controller';

@Module({
  controllers: [ScriptsController],
  providers: [ScriptsService],
})
export class ScriptsModule {}
