import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ExchangesService } from './exchanges.service';

@Controller('exchanges')
export class ExchangesController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Post()
  create(@Body() body: { code: string; name?: string; isActive?: boolean }) {
    return this.exchangesService.create(body);
  }

  @Get()
  findAll(@Query('active') active?: string) {
    const activeOnly = active === 'true';
    return this.exchangesService.findAll(activeOnly);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exchangesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { code?: string; name?: string; isActive?: boolean }) {
    return this.exchangesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.exchangesService.remove(id);
  }
}
