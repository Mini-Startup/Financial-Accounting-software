import { Controller, Get, Post, Body, Patch, Put, Param, Delete, Query } from '@nestjs/common';
import { ScriptsService } from './scripts.service';

@Controller('scripts')
export class ScriptsController {
  constructor(private readonly scriptsService: ScriptsService) {}

  @Post()
  create(@Body() body: any) {
    return this.scriptsService.create(body);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.scriptsService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scriptsService.findOne(id);
  }

  @Patch(':id')
  updatePatch(@Param('id') id: string, @Body() body: any) {
    return this.scriptsService.update(id, body);
  }

  @Put(':id')
  updatePut(@Param('id') id: string, @Body() body: any) {
    return this.scriptsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scriptsService.remove(id);
  }
}
