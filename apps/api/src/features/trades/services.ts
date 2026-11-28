import { NotFoundException, BadRequestException } from '../../errors';
import { prisma, Prisma } from '../../database';
import { brokeragesService } from '../brokerages/services';
import { calculateTradeRates, round } from '../../utils/brokerage';
import { generateSecurityName } from './securityName';

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

    const tradeTypeUpper = (data.tradeType || 'REGULAR').toUpperCase();
    const isZeroBrokerage = ['CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT'].includes(tradeTypeUpper);

    let calcs: {
      clientRate: number;
      brokerRate: number;
      clientBrokerage: number;
      brokerBrokerage: number;
      profitTotal: number;
    };

    const resolvedLot = (data as any).marketLot ? Number((data as any).marketLot) : (script.lotSize || 1);

    if (isZeroBrokerage) {
      calcs = {
        clientRate: Number(data.rate),
        brokerRate: Number(data.rate),
        clientBrokerage: 0,
        brokerBrokerage: 0,
        profitTotal: 0,
      };
    } else {
      calcs = await this.calculateBrokerageForTrade({
        accountId: data.accountId,
        brokerId: data.brokerId,
        scriptId: data.scriptId,
        quantity: Number(data.quantity),
        marketRate: Number(data.rate),
        transactionType: data.transactionType,
        marketLot: resolvedLot,
        tradeType: data.tradeType,
      });
    }

    const canonicalSecName = generateSecurityName({
      scriptFullName: script.fullName,
      scriptShortName: script.shortName,
      expiry: data.expiry,
      callPut: (data as any).callPut,
      strikePrice: (data as any).strikePrice,
    });
    const genSecurityName = canonicalSecName || (data as any).securityName || script.fullName;

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
        securityName: genSecurityName || null,
        callPut: (data as any).callPut || null,
        strikePrice: (data as any).strikePrice ? Number((data as any).strikePrice) : null,
        marketLot: resolvedLot,
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

  async findAll(params?: {
    limit?: number | string;
    offset?: number | string;
    fromDate?: string;
    toDate?: string;
    accountId?: string;
    brokerId?: string;
    scriptId?: string;
    exchangeId?: string;
    tradeType?: string;
    settlementId?: string;
  }) {
    const where: Prisma.TradeWhereInput = {
      isDeleted: false,
    };

    if (params) {
      if (params.accountId) where.accountId = params.accountId;
      if (params.brokerId) where.brokerId = params.brokerId;
      if (params.scriptId) where.scriptId = params.scriptId;
      if (params.exchangeId) where.exchangeId = params.exchangeId;
      if (params.tradeType) where.tradeType = params.tradeType;
      if (params.settlementId) where.settlementId = params.settlementId;

      if (params.fromDate || params.toDate) {
        const dateFilter: Prisma.DateTimeFilter = {};
        if (params.fromDate) {
          const from = parseFlexibleDate(params.fromDate);
          from.setUTCHours(0, 0, 0, 0);
          dateFilter.gte = from;
        }
        if (params.toDate) {
          const to = parseFlexibleDate(params.toDate);
          to.setUTCHours(23, 59, 59, 999);
          dateFilter.lte = to;
        }
        where.tradeDate = dateFilter;
      }
    }

    const take = params?.limit ? Math.min(Math.max(parseInt(String(params.limit), 10), 1), 1000) : undefined;
    const skip = params?.offset ? Math.max(parseInt(String(params.offset), 10), 0) : undefined;

    return prisma.trade.findMany({
      where,
      orderBy: [{ tradeDate: 'desc' }, { createdAt: 'desc' }],
      take,
      skip,
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
        settlement: true,
      },
    });
    if (!trade || trade.isDeleted) {
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
      existing.settlementId != null ||
      (existing.source === 'SYSTEM' && ['CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT'].includes(existing.tradeType))
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

    const effectiveTradeType = (data.tradeType || existing.tradeType || 'REGULAR').toUpperCase();
    const isZeroBrokerage = ['CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT'].includes(effectiveTradeType);

    let calcs: {
      clientRate: number;
      brokerRate: number;
      clientBrokerage: number;
      brokerBrokerage: number;
      profitTotal: number;
    };

    const resolvedLot = (updatedData as any).marketLot ? Number((updatedData as any).marketLot) : (existing.marketLot || 1);

    if (isZeroBrokerage) {
      calcs = {
        clientRate: Number(updatedData.rate),
        brokerRate: Number(updatedData.rate),
        clientBrokerage: 0,
        brokerBrokerage: 0,
        profitTotal: 0,
      };
    } else {
      calcs = await this.calculateBrokerageForTrade({
        accountId: updatedData.accountId,
        brokerId: updatedData.brokerId,
        scriptId: updatedData.scriptId,
        quantity: Number(updatedData.quantity),
        marketRate: Number(updatedData.rate),
        transactionType: updatedData.transactionType,
        marketLot: resolvedLot,
        tradeType: effectiveTradeType,
      });
    }

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
      ...((data as any).callPut !== undefined && { callPut: (data as any).callPut || null }),
      ...((data as any).strikePrice !== undefined && { strikePrice: (data as any).strikePrice ? Number((data as any).strikePrice) : null }),
      ...((data as any).marketLot !== undefined && { marketLot: Number((data as any).marketLot) }),
      ...(data.tradeType && { tradeType: data.tradeType }),
      clientRate: calcs.clientRate,
      brokerRate: calcs.brokerRate,
      clientBrokerage: calcs.clientBrokerage,
      brokerBrokerage: calcs.brokerBrokerage,
      profitTotal: calcs.profitTotal,
    };

    const targetScript = data.scriptId ? await prisma.script.findUnique({ where: { id: data.scriptId } }) : existing.script;
    const targetExpiry = data.expiry !== undefined ? data.expiry : existing.expiry;
    const canonicalSecName = generateSecurityName({
      scriptFullName: targetScript?.fullName || existing.script?.fullName,
      scriptShortName: targetScript?.shortName || existing.script?.shortName,
      expiry: targetExpiry,
      callPut: (data as any).callPut !== undefined ? (data as any).callPut : (existing as any).callPut,
      strikePrice: (data as any).strikePrice !== undefined ? (data as any).strikePrice : (existing as any).strikePrice,
    });
    const genSecName = canonicalSecName || (data as any).securityName || targetScript?.fullName || existing.securityName;

    if (genSecName) {
      (updatePayload as any).securityName = genSecName;
    }

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
      existing.settlementId != null ||
      (existing.source === 'SYSTEM' && ['CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT'].includes(existing.tradeType))
    ) {
      const settlementMsg = (existing as any).settlement?.name
        ? `Cannot delete Trade: Trade is locked under Settlement '${(existing as any).settlement.name}'. You must delete or revert the settlement first.`
        : 'Cannot delete Trade: Trade is locked under a settlement. You must delete or revert the settlement first.';
      throw new BadRequestException(settlementMsg);
    }

    return prisma.trade.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  private async validateTradeData(data: any) {
    if (!data.tradeNumber || String(data.tradeNumber).trim() === '') {
      throw new BadRequestException('Trade Number is required');
    }
    const parseAndValidateCalendarDate = (rawVal: string | Date, label: string): Date => {
      if (rawVal instanceof Date) {
        if (isNaN(rawVal.getTime())) {
          throw new BadRequestException(`A valid ${label} is required`);
        }
        const yr = rawVal.getUTCFullYear();
        if (yr < 2000 || yr > 2099) {
          throw new BadRequestException(`${label} year must be a valid 4-digit year (between 2000 and 2099)`);
        }
        return rawVal;
      }

      const cleaned = String(rawVal).trim();
      if (!cleaned) {
        throw new BadRequestException(`A valid ${label} is required`);
      }

      let y: number | null = null;
      let m: number | null = null;
      let d: number | null = null;

      // 1. YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (with optional time/ISO suffix)
      const ymd = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);
      if (ymd) {
        y = parseInt(ymd[1], 10);
        m = parseInt(ymd[2], 10);
        d = parseInt(ymd[3], 10);
      } else {
        // 2. DD-MM-YYYY or DD-MM-YY (with optional time suffix)
        const dmy = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:[T\s].*)?$/);
        if (dmy) {
          d = parseInt(dmy[1], 10);
          m = parseInt(dmy[2], 10);
          y = parseInt(dmy[3], 10);
          if (y < 100) y += 2000;
        } else {
          // 3. DD-MMM-YY or DD-MMM-YYYY or DDMMMYY (e.g. 29-Dec-2026)
          const mmm = cleaned.match(/^(\d{1,2})[-/\s]?([A-Za-z]{3})[-/\s]?(\d{2}|\d{4})(?:[T\s].*)?$/);
          const monthMap: Record<string, number> = {
            JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
            JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
          };
          if (mmm && monthMap[mmm[2].toUpperCase()]) {
            d = parseInt(mmm[1], 10);
            m = monthMap[mmm[2].toUpperCase()];
            y = parseInt(mmm[3], 10);
            if (y < 100) y += 2000;
          }
        }
      }

      if (y !== null && m !== null && d !== null) {
        if (m < 1 || m > 12 || d < 1 || d > 31) {
          throw new BadRequestException(`Invalid ${label}: Month must be between 01-12 and Day must be between 01-31`);
        }
        const testD = new Date(Date.UTC(y, m - 1, d));
        if (testD.getUTCFullYear() !== y || testD.getUTCMonth() !== m - 1 || testD.getUTCDate() !== d) {
          throw new BadRequestException(`Invalid ${label}: Day ${d} is not valid for month ${m}`);
        }
        if (y < 2000 || y > 2099) {
          throw new BadRequestException(`${label} year must be a valid 4-digit year (between 2000 and 2099)`);
        }
        return testD;
      }

      const fallback = parseFlexibleDate(cleaned);
      if (isNaN(fallback.getTime())) {
        throw new BadRequestException(`A valid ${label} is required`);
      }
      const fallbackYear = fallback.getUTCFullYear();
      if (fallbackYear < 2000 || fallbackYear > 2099) {
        throw new BadRequestException(`${label} year must be a valid 4-digit year (between 2000 and 2099)`);
      }
      return fallback;
    };

    if (!data.tradeDate) {
      throw new BadRequestException('A valid Trade Date is required');
    }
    const tradeDateObj = parseAndValidateCalendarDate(data.tradeDate, 'Trade Date');

    if (data.expiry) {
      const expiryDateObj = parseAndValidateCalendarDate(data.expiry, 'Expiry Date');
      const tDateUtc = Date.UTC(tradeDateObj.getUTCFullYear(), tradeDateObj.getUTCMonth(), tradeDateObj.getUTCDate());
      const eDateUtc = Date.UTC(expiryDateObj.getUTCFullYear(), expiryDateObj.getUTCMonth(), expiryDateObj.getUTCDate());
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
    scriptId: string;
    quantity: number;
    marketRate: number;
    transactionType: string;
    marketLot?: number | null;
    brokerBrokerage?: number | null;
    tradeType?: string | null;
  }) {
    const { accountId, brokerId, scriptId, quantity, marketRate, transactionType, marketLot, brokerBrokerage, tradeType } = params;

    const side: 'BUY' | 'SELL' = transactionType.toUpperCase() === 'BUY' ? 'BUY' : 'SELL';

    const clientRuleRow = await brokeragesService.resolve(
      accountId,
      'CLIENT',
      scriptId,
      side,
    );

    const clientRule = clientRuleRow
      ? {
          quantity: clientRuleRow.quantity,
          brokerage: clientRuleRow.brokerage,
          direction: clientRuleRow.direction as any,
        }
      : null;

    let lot = marketLot;
    if (!lot) {
      const script = await prisma.script.findUnique({
        where: { id: scriptId },
        select: { lotSize: true },
      });
      lot = script?.lotSize || 1;
    }

    const result = calculateTradeRates({
      rate: marketRate,
      quantity,
      marketLot: lot,
      side,
      clientRule,
      brokerBrokerage: brokerBrokerage || 0,
      tradeType,
    });

    return {
      clientRate: result.clientRate,
      brokerRate: result.brokerRate,
      clientBrokerage: result.clientBrokerage,
      brokerBrokerage: result.brokerBrokerage,
      profitTotal: result.profitTotal,
    };
  }

  /**
   * Recalculates client brokerage, clientRate, and profitTotal for all OPEN POSITION trades
   * (unsettled regular/internal trades where settlementId is null).
   */
  async recalculateOpenPositionsBrokerage() {
    const openTrades = await prisma.trade.findMany({
      where: {
        isDeleted: false,
        settlementId: null,
        tradeType: {
          notIn: ['CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT'],
        },
      },
      include: {
        script: {
          select: { lotSize: true },
        },
      },
    });

    if (openTrades.length === 0) {
      return { totalProcessed: 0, updatedCount: 0 };
    }

    const updates: Array<{
      id: string;
      clientBrokerage: number;
      clientRate: number;
      profitTotal: number;
    }> = [];

    for (const t of openTrades) {
      const lot = t.marketLot && t.marketLot > 0 ? t.marketLot : (t.script?.lotSize || 1);
      const calc = await this.calculateBrokerageForTrade({
        accountId: t.accountId,
        brokerId: t.brokerId,
        scriptId: t.scriptId,
        quantity: t.quantity,
        marketRate: t.rate,
        transactionType: t.transactionType,
        marketLot: lot,
        brokerBrokerage: t.brokerBrokerage ?? 0,
        tradeType: t.tradeType,
      });

      const changed =
        Math.abs((t.clientBrokerage ?? 0) - calc.clientBrokerage) > 0.0001 ||
        Math.abs((t.clientRate ?? t.rate) - calc.clientRate) > 0.0001 ||
        Math.abs((t.profitTotal ?? 0) - calc.profitTotal) > 0.0001;

      if (changed) {
        updates.push({
          id: t.id,
          clientBrokerage: calc.clientBrokerage,
          clientRate: calc.clientRate,
          profitTotal: calc.profitTotal,
        });
      }
    }

    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.trade.update({
            where: { id: u.id },
            data: {
              clientBrokerage: u.clientBrokerage,
              clientRate: u.clientRate,
              profitTotal: u.profitTotal,
            },
          })
        )
      );
    }

    return {
      totalProcessed: openTrades.length,
      updatedCount: updates.length,
    };
  }
}

export const tradesService = new TradesService();
