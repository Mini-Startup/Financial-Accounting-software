import { NotFoundException, BadRequestException } from '../../errors';
import { prisma, Prisma } from '../../database';
import { brokeragesService } from '../brokerages/services';
import { calculateTrade } from '../../utils/brokerage';
import type { BrokerageRule } from '../../utils/brokerage';

export class TradesService {
  async create(data: {
    tradeNumber: string;
    tradeDate: string | Date;
    tradeTime?: string | null;
    accountId: string;
    brokerId?: string | null;
    scriptId: string;
    exchangeId: string;
    transactionType: string;
    quantity: number;
    rate: number;
    remarks?: string | null;
    source: string;
  }) {
    await this.validateTradeData(data);

    const calcs = await this.calculateBrokerageForTrade({
      accountId: data.accountId,
      brokerId: data.brokerId,
      exchangeId: data.exchangeId,
      scriptId: data.scriptId,
      quantity: Number(data.quantity),
      marketRate: Number(data.rate),
    });

    return prisma.trade.create({
      data: {
        tradeNumber: data.tradeNumber.trim(),
        tradeDate: new Date(data.tradeDate),
        tradeTime: data.tradeTime?.trim() || null,
        accountId: data.accountId,
        brokerId: data.brokerId || null,
        scriptId: data.scriptId,
        exchangeId: data.exchangeId,
        transactionType: data.transactionType.toUpperCase(),
        quantity: Number(data.quantity),
        rate: Number(data.rate),
        remarks: data.remarks?.trim() || null,
        source: data.source || 'MANUAL',
        clientRate: calcs.clientRate,
        brokerRate: calcs.brokerRate,
        clientBrokerage: calcs.clientBrokerage,
        brokerBrokerage: calcs.brokerBrokerage,
        profitTotal: calcs.profitTotal,
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
        broker: true,
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
        broker: true,
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
    brokerId?: string | null;
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

    const calcs = await this.calculateBrokerageForTrade({
      accountId: updatedData.accountId,
      brokerId: updatedData.brokerId,
      exchangeId: updatedData.exchangeId,
      scriptId: updatedData.scriptId,
      quantity: Number(updatedData.quantity),
      marketRate: Number(updatedData.rate),
    });

    return prisma.trade.update({
      where: { id },
      data: {
        ...(data.tradeNumber !== undefined && { tradeNumber: data.tradeNumber.trim() }),
        ...(data.tradeDate !== undefined && { tradeDate: new Date(data.tradeDate) }),
        ...(data.tradeTime !== undefined && { tradeTime: data.tradeTime?.trim() || null }),
        ...(data.accountId !== undefined && { accountId: data.accountId }),
        ...(data.brokerId !== undefined && { brokerId: data.brokerId || null }),
        ...(data.scriptId !== undefined && { scriptId: data.scriptId }),
        ...(data.exchangeId !== undefined && { exchangeId: data.exchangeId }),
        ...(data.transactionType !== undefined && { transactionType: data.transactionType.toUpperCase() }),
        ...(data.quantity !== undefined && { quantity: Number(data.quantity) }),
        ...(data.rate !== undefined && { rate: Number(data.rate) }),
        ...(data.remarks !== undefined && { remarks: data.remarks?.trim() || null }),
        ...(data.source !== undefined && { source: data.source }),
        clientRate: calcs.clientRate,
        brokerRate: calcs.brokerRate,
        clientBrokerage: calcs.clientBrokerage,
        brokerBrokerage: calcs.brokerBrokerage,
        profitTotal: calcs.profitTotal,
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

    // Verify broker exists
    if (data.brokerId) {
      const broker = await prisma.account.findUnique({ where: { id: data.brokerId } });
      if (!broker) {
        throw new BadRequestException(`Broker Account with ID ${data.brokerId} does not exist`);
      }
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

  private async calculateBrokerageForTrade(params: {
    accountId: string;
    brokerId?: string | null;
    exchangeId: string;
    scriptId: string;
    quantity: number;
    marketRate: number;
  }) {
    const { accountId, brokerId, exchangeId, scriptId, quantity, marketRate } = params;

    const clientRuleRow = await brokeragesService.resolve(
      accountId,
      exchangeId,
      'CLIENT',
      scriptId
    );

    if (!clientRuleRow) {
      throw new BadRequestException(
        'No brokerage rule configured for the selected client on this exchange.'
      );
    }

    const toRule = (row: any): BrokerageRule => ({
      type: row.type as 'AMOUNT' | 'PERCENT',
      baseAmount: row.baseAmount,
      flatFee: row.flatFee,
      tradingBuyPct: row.tradingBuyPct,
      tradingSellPct: row.tradingSellPct,
      tradingMinFee: row.tradingMinFee,
      deliveryBuyPct: row.deliveryBuyPct,
      deliverySellPct: row.deliverySellPct,
      deliveryMinFee: row.deliveryMinFee,
    });

    const clientRule = toRule(clientRuleRow);

    let brokerRuleRow: any = null;
    if (brokerId) {
      brokerRuleRow = await brokeragesService.resolve(
        brokerId,
        exchangeId,
        'BROKER',
        scriptId
      );
    }

    const brokerFallbackMode = Boolean(clientRule && !brokerRuleRow);

    if (brokerFallbackMode || !brokerId) {
      const marketRounded = Number(marketRate.toFixed(4));
      return {
        clientRate: marketRounded,
        brokerRate: marketRounded,
        clientBrokerage: 0,
        brokerBrokerage: 0,
        profitTotal: 0,
      };
    }

    const brokerRule = toRule(brokerRuleRow);

    const calc = calculateTrade({
      quantity,
      marketRate,
      segment: 'TRADING',
      clientRule,
      brokerRule,
    });

    return {
      clientRate: calc.clientRate,
      brokerRate: calc.brokerRate,
      clientBrokerage: calc.clientBrokerage,
      brokerBrokerage: calc.brokerBrokerage,
      profitTotal: calc.totalProfit,
    };
  }
}

export const tradesService = new TradesService();
