import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ScriptsService } from './scripts.service';
import { Prisma } from 'database';

@Controller('scripts')
export class ScriptsController {
  constructor(private readonly scriptsService: ScriptsService) {}

  @Post()
  create(@Body() createScriptDto: Prisma.ScriptUncheckedCreateInput) {
    return this.scriptsService.create(createScriptDto);
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
  update(@Param('id') id: string, @Body() updateScriptDto: Prisma.ScriptUpdateInput) {
    return this.scriptsService.update(id, updateScriptDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scriptsService.remove(id);
  }
}
