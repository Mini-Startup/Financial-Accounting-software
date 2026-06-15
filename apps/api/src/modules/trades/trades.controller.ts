import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { TradesService } from './trades.service';
import { TradeImportService, NormalizedImportRow } from './trade-import.service';

@Controller()
export class TradesController {
  constructor(
    private readonly tradesService: TradesService,
    private readonly tradeImportService: TradeImportService,
  ) {}

  // ─────────────────────────────────────────────
  // Standard Trade Endpoints
  // ─────────────────────────────────────────────

  @Get('trades')
  async findAll() {
    return this.tradesService.findAll();
  }

  @Post('trades')
  async create(@Body() body: any) {
    return this.tradesService.create(body);
  }

  @Put('trades/:id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.tradesService.update(id, body);
  }

  @Delete('trades/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.tradesService.remove(id);
  }

  // ─────────────────────────────────────────────
  // Trade Import Flow Endpoints
  // ─────────────────────────────────────────────

  @Post('trade-import/upload')
  async uploadFile(@Body() body: { content: string }) {
    if (!body || !body.content) {
      throw new Error('Content is required in body');
    }
    return this.tradeImportService.parseFile(body.content);
  }

  @Post('trade-import/preview')
  @HttpCode(HttpStatus.OK)
  async previewRows(@Body() body: { rows: NormalizedImportRow[] }) {
    if (!body || !body.rows) {
      throw new Error('Rows are required in body');
    }
    return this.tradeImportService.previewRows(body.rows);
  }

  @Post('trade-import/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmImport(@Body() body: { rows: NormalizedImportRow[] }) {
    if (!body || !body.rows) {
      throw new Error('Rows are required in body');
    }
    return this.tradeImportService.confirmImport(body.rows);
  }
}
