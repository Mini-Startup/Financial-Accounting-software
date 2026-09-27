import { NotFoundException, BadRequestException } from '../../errors';
import { prisma, Prisma } from '../../database';
import { brokeragesService } from '../brokerages/services';
import { calculateBrokerage, round } from '../../utils/brokerage';
import type { BrokerageRule } from '../../utils/brokerage';

import { parseFlexibleDate } from '../Trade_FnO/services';

export class TradesService {
  async create(data: {
    tradeNumber: string;
    tradeDate: string | Date;
    tradeTime?: string | null;
    accountId: string;
    brokerId?: string | null;
    scriptId: string;
    exchangeId?: string | null;
    transactionType: string;
    quantity: number;
    rate: number;
    remarks?: string | null;
    source?: string;
    expiry?: string | null;
    tradeType?: string | null;
  }) {
    const script = await prisma.script.findUnique({ where: { id: data.scriptId } });
    if (!script) {
      throw new BadRequestException(`Script with ID ${data.scriptId} does not exist`);
    }
    const exchangeId = data.exchangeId || script.exchangeId;
    if (!exchangeId) {
      throw new BadRequestException(`Script with ID ${data.scriptId} is not assigned to an exchange`);
    }

    await this.validateTradeData({ ...data, exchangeId });

    const calcs = await this.calculateBrokerageForTrade({
      accountId: data.accountId,
      brokerId: data.brokerId,
      exchangeId: exchangeId,
      scriptId: data.scriptId,
      quantity: Number(data.quantity),
      marketRate: Number(data.rate),
    });

    return prisma.trade.create({
      data: {
        tradeNumber: data.tradeNumber.trim(),
        tradeDate: parseFlexibleDate(data.tradeDate),
        tradeTime: data.tradeTime?.trim() || null,
        accountId: data.accountId,
        brokerId: data.brokerId || null,
        scriptId: data.scriptId,
        exchangeId: exchangeId,
        transactionType: data.transactionType.toUpperCase(),
        quantity: Number(data.quantity),
        rate: Number(data.rate),
        remarks: data.remarks?.trim() || null,
        source: data.source || 'MANUAL',
        expiry: data.expiry || null,
        tradeType: data.tradeType || 'INTERNAL',
        clientRate: calcs.clientRate,
        brokerRate: calcs.brokerRate,
        clientBrokerage: calcs.clientBrokerage,
        brokerBrokerage: calcs.brokerBrokerage,
        profitTotal: calcs.profitTotal,
      },
      include: {
        account: true,
        script: {
          include: {
            currency: true,
          },
        },
        exchange: true,
        broker: true,
      },
    });
  }

  async findAll() {
    return prisma.trade.findMany({
      orderBy: { tradeDate: 'desc' },
      include: {
        account: true,
        script: {
          include: {
            currency: true,
          },
        },
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
        script: {
          include: {
            currency: true,
          },
        },
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
    exchangeId?: string | null;
    transactionType: string;
    quantity: number;
    rate: number;
    remarks?: string | null;
    source: string;
    expiry?: string | null;
    tradeType?: string | null;
  }>) {
    const existing = await this.findOne(id);

    if (
      ['CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT'].includes(existing.tradeType) ||
      existing.settlementId
    ) {
      throw new BadRequestException('Settlement-generated trades cannot be edited');
    }

    let resolvedExchangeId = data.exchangeId || existing.exchangeId;
    if (data.scriptId && !data.exchangeId) {
      const script = await prisma.script.findUnique({ where: { id: data.scriptId } });
      if (script?.exchangeId) {
        resolvedExchangeId = script.exchangeId;
      }
    }
    const updatedData = { ...existing, ...data, exchangeId: resolvedExchangeId };
    await this.validateTradeData(updatedData);

    const calcs = await this.calculateBrokerageForTrade({
      accountId: updatedData.accountId,
      brokerId: updatedData.brokerId,
      exchangeId: updatedData.exchangeId,
      scriptId: updatedData.scriptId,
      quantity: Number(updatedData.quantity),
      marketRate: Number(updatedData.rate),
    });

    const updatePayload: Prisma.TradeUncheckedUpdateInput = {
      ...(data.tradeNumber && { tradeNumber: data.tradeNumber.trim() }),
      ...(data.tradeDate && { tradeDate: parseFlexibleDate(data.tradeDate) }),
      ...(data.tradeTime !== undefined && { tradeTime: data.tradeTime?.trim() || null }),
      ...(data.accountId && { accountId: data.accountId }),
      ...(data.brokerId !== undefined && { brokerId: data.brokerId || null }),
      ...(data.scriptId && { scriptId: data.scriptId }),
      ...(resolvedExchangeId && { exchangeId: resolvedExchangeId }),
      ...(data.transactionType && { transactionType: data.transactionType.toUpperCase() }),
      ...(data.quantity != null && { quantity: Number(data.quantity) }),
      ...(data.rate != null && { rate: Number(data.rate) }),
      ...(data.remarks !== undefined && { remarks: data.remarks?.trim() || null }),
      ...(data.source && { source: data.source }),
      ...(data.expiry !== undefined && { expiry: data.expiry || null }),
      ...(data.tradeType && { tradeType: data.tradeType }),
      clientRate: calcs.clientRate,
      brokerRate: calcs.brokerRate,
      clientBrokerage: calcs.clientBrokerage,
      brokerBrokerage: calcs.brokerBrokerage,
      profitTotal: calcs.profitTotal,
    };

    return prisma.trade.update({
      where: { id },
      data: updatePayload,
      include: {
        account: true,
        script: {
          include: {
            currency: true,
          },
        },
        exchange: true,
        broker: true,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    if (
      ['CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT'].includes(existing.tradeType) ||
      existing.settlementId
    ) {
      throw new BadRequestException('Settlement-generated trades cannot be deleted');
    }

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
    const tradeDateObj = parseFlexibleDate(data.tradeDate);
    const tradeYear = tradeDateObj.getFullYear();
    if (tradeYear < 2000 || tradeYear > 2099) {
      throw new BadRequestException('Trade Date year must be a valid 4-digit year (between 2000 and 2099)');
    }

    if (data.expiry) {
      const expiryDateObj = parseFlexibleDate(data.expiry);
      const expYear = expiryDateObj.getFullYear();
      if (expYear < 2000 || expYear > 2099) {
        throw new BadRequestException('Expiry Date year must be a valid 4-digit year (between 2000 and 2099)');
      }
      const tDateUtc = Date.UTC(tradeDateObj.getFullYear(), tradeDateObj.getMonth(), tradeDateObj.getDate());
      const eDateUtc = Date.UTC(expiryDateObj.getFullYear(), expiryDateObj.getMonth(), expiryDateObj.getDate());
      if (eDateUtc < tDateUtc) {
        throw new BadRequestException('Expiry date cannot be before the trade date');
      }
    }

    if (data.quantity == null || Number(data.quantity) <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }
    if (!Number.isInteger(Number(data.quantity))) {
      throw new BadRequestException('Quantity must be a whole number (no decimals allowed)');
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

    const exchangeId = data.exchangeId || script.exchangeId;
    if (!exchangeId) {
      throw new BadRequestException(`Script with ID ${data.scriptId} is not assigned to an exchange`);
    }

    // Verify exchange exists
    const exchange = await prisma.exchange.findUnique({ where: { id: exchangeId } });
    if (!exchange) {
      throw new BadRequestException(`Exchange with ID ${exchangeId} does not exist`);
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

    const clientRule = clientRuleRow ? toRule(clientRuleRow) : null;

    let brokerRuleRow: any = null;
    if (brokerId) {
      brokerRuleRow = await brokeragesService.resolve(
        brokerId,
        exchangeId,
        'BROKER',
        scriptId
      );
    }
    const brokerRule = brokerRuleRow ? toRule(brokerRuleRow) : null;

    const side: 'BUY' | 'SELL' = quantity >= 0 ? 'BUY' : 'SELL';
    const absQuantity = Math.abs(quantity);
    const tradeValue = round(absQuantity * marketRate);

    let clientBrokerage = 0;
    let clientRate = marketRate;
    if (clientRule) {
      if (clientRule.type !== 'AMOUNT') {
        clientBrokerage = calculateBrokerage(clientRule, tradeValue, side, 'TRADING');
        const clientPerUnit = absQuantity > 0 ? round(clientBrokerage / absQuantity) : 0;
        clientRate = side === 'BUY' ? round(marketRate + clientPerUnit) : round(marketRate - clientPerUnit);
      }
    }

    let brokerBrokerage = 0;
    let brokerRate = marketRate;
    if (brokerRule) {
      if (brokerRule.type !== 'AMOUNT') {
        brokerBrokerage = calculateBrokerage(brokerRule, tradeValue, side, 'TRADING');
        const brokerPerUnit = absQuantity > 0 ? round(brokerBrokerage / absQuantity) : 0;
        brokerRate = side === 'BUY' ? round(marketRate + brokerPerUnit) : round(marketRate - brokerPerUnit);
      }
    }

    const profit = side === 'BUY'
      ? round(clientRate - brokerRate)
      : round(brokerRate - clientRate);
    const profitTotal = round(profit * absQuantity);

    return {
      clientRate,
      brokerRate,
      clientBrokerage,
      brokerBrokerage,
      profitTotal,
    };
  }
}

export const tradesService = new TradesService();
