import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma, Prisma } from 'database';

@Injectable()
export class TradesService {
  async create(data: {
    tradeNumber: string;
    tradeDate: string | Date;
    tradeTime?: string | null;
    accountId: string;
    scriptId: string;
    exchangeId: string;
    transactionType: string;
    quantity: number;
    rate: number;
    remarks?: string | null;
    source: string;
  }) {
    await this.validateTradeData(data);

    return prisma.trade.create({
      data: {
        tradeNumber: data.tradeNumber.trim(),
        tradeDate: new Date(data.tradeDate),
        tradeTime: data.tradeTime?.trim() || null,
        accountId: data.accountId,
        scriptId: data.scriptId,
        exchangeId: data.exchangeId,
        transactionType: data.transactionType.toUpperCase(),
        quantity: Number(data.quantity),
        rate: Number(data.rate),
        remarks: data.remarks?.trim() || null,
        source: data.source || 'MANUAL',
      },
      include: {
        account: true,
        script: true,
        exchange: true,
      },
    });
  }

  async findAll() {
    return prisma.trade.findMany({
      orderBy: { tradeDate: 'desc' },
      include: {
        account: true,
        script: true,
        exchange: true,
      },
    });
  }

  async findOne(id: string) {
    const trade = await prisma.trade.findUnique({
      where: { id },
      include: {
        account: true,
        script: true,
        exchange: true,
      },
    });
    if (!trade) {
      throw new NotFoundException(`Trade with ID ${id} not found`);
    }
    return trade;
  }

  async update(id: string, data: Partial<{
    tradeNumber: string;
    tradeDate: string | Date;
    tradeTime?: string | null;
    accountId: string;
    scriptId: string;
    exchangeId: string;
    transactionType: string;
    quantity: number;
    rate: number;
    remarks?: string | null;
    source: string;
  }>) {
    const existing = await this.findOne(id);
    const updatedData = { ...existing, ...data };
    await this.validateTradeData(updatedData);

    return prisma.trade.update({
      where: { id },
      data: {
        ...(data.tradeNumber !== undefined && { tradeNumber: data.tradeNumber.trim() }),
        ...(data.tradeDate !== undefined && { tradeDate: new Date(data.tradeDate) }),
        ...(data.tradeTime !== undefined && { tradeTime: data.tradeTime?.trim() || null }),
        ...(data.accountId !== undefined && { accountId: data.accountId }),
        ...(data.scriptId !== undefined && { scriptId: data.scriptId }),
        ...(data.exchangeId !== undefined && { exchangeId: data.exchangeId }),
        ...(data.transactionType !== undefined && { transactionType: data.transactionType.toUpperCase() }),
        ...(data.quantity !== undefined && { quantity: Number(data.quantity) }),
        ...(data.rate !== undefined && { rate: Number(data.rate) }),
        ...(data.remarks !== undefined && { remarks: data.remarks?.trim() || null }),
        ...(data.source !== undefined && { source: data.source }),
      },
      include: {
        account: true,
        script: true,
        exchange: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return prisma.trade.delete({
      where: { id },
    });
  }

  private async validateTradeData(data: any) {
    if (!data.tradeNumber || String(data.tradeNumber).trim() === '') {
      throw new BadRequestException('Trade Number is required');
    }
    if (!data.tradeDate || isNaN(Date.parse(data.tradeDate))) {
      throw new BadRequestException('A valid Trade Date is required');
    }
    if (data.quantity == null || Number(data.quantity) <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }
    if (data.rate == null || Number(data.rate) <= 0) {
      throw new BadRequestException('Rate must be greater than zero');
    }
    if (!data.transactionType || !['BUY', 'SELL'].includes(data.transactionType.toUpperCase())) {
      throw new BadRequestException('Transaction Type must be BUY or SELL');
    }

    // Verify account exists
    const account = await prisma.account.findUnique({ where: { id: data.accountId } });
    if (!account) {
      throw new BadRequestException(`Client Account with ID ${data.accountId} does not exist`);
    }

    // Verify script exists
    const script = await prisma.script.findUnique({ where: { id: data.scriptId } });
    if (!script) {
      throw new BadRequestException(`Script with ID ${data.scriptId} does not exist`);
    }

    // Verify exchange exists
    const exchange = await prisma.exchange.findUnique({ where: { id: data.exchangeId } });
    if (!exchange) {
      throw new BadRequestException(`Exchange with ID ${data.exchangeId} does not exist`);
    }
  }
}
