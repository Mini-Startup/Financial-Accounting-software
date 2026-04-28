import {
  Controller,
  Get, Post, Patch, Delete,
  Body, Param, Query,
} from '@nestjs/common';
import { BrokeragesService } from './brokerages.service';

@Controller('brokerages')
export class BrokeragesController {
  constructor(private readonly brokeragesService: BrokeragesService) {}

  /**
   * POST /brokerages/calculate
   * MUST be defined BEFORE :id routes, or NestJS matches "calculate" as an id.
   */
  @Post('calculate')
  calculate(@Body() body: {
    clientAccountId: string;
    brokerAccountId: string;
    exchangeId: string;
    scriptId?: string;
    quantity: number;
    marketRate: number;
    segment: 'TRADING' | 'DELIVERY';
  }) {
    return this.brokeragesService.calculate(body);
  }

  /**
   * GET /brokerages/resolve?accountId=X&exchangeId=Y&appliesTo=CLIENT&scriptId=Z
   */
  @Get('resolve')
  resolve(
    @Query('accountId') accountId: string,
    @Query('exchangeId') exchangeId: string,
    @Query('appliesTo') appliesTo: 'CLIENT' | 'BROKER',
    @Query('scriptId') scriptId?: string,
  ) {
    return this.brokeragesService.resolve(accountId, exchangeId, appliesTo, scriptId);
  }

  @Post()
  create(@Body() body: any) {
    return this.brokeragesService.create(body);
  }

  @Get()
  findAll(
    @Query('accountId') accountId?: string,
    @Query('exchangeId') exchangeId?: string,
    @Query('appliesTo') appliesTo?: string,
  ) {
    return this.brokeragesService.findAll({ accountId, exchangeId, appliesTo });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.brokeragesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.brokeragesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.brokeragesService.remove(id);
  }
}
