import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '../../errors';
import { prisma, Prisma } from '../../database';
import { calculateTrade } from '../../utils/brokerage';
import type { BrokerageRule } from '../../utils/brokerage';

// ─── Helper: convert Prisma row → BrokerageRule ────

function toRule(row: any): BrokerageRule {
  return {
    type: row.type as 'AMOUNT' | 'PERCENT',
    baseAmount: row.baseAmount,
    flatFee: row.flatFee,
    tradingBuyPct: row.tradingBuyPct,
    tradingSellPct: row.tradingSellPct,
    tradingMinFee: row.tradingMinFee,
    deliveryBuyPct: row.deliveryBuyPct,
    deliverySellPct: row.deliverySellPct,
    deliveryMinFee: row.deliveryMinFee,
  };
}

// ─── Helper: sanitize numeric fields ───────────────

function sanitizePayload(payload: any) {
  const numberFields = [
    'baseAmount', 'flatFee',
    'tradingBuyPct', 'tradingSellPct', 'tradingMinFee',
    'deliveryBuyPct', 'deliverySellPct', 'deliveryMinFee',
  ];
  for (const field of numberFields) {
    if (payload[field] === '' || payload[field] === undefined) {
      payload[field] = null;
    } else if (payload[field] !== null) {
      payload[field] = Number(payload[field]);
    }
  }
  return payload;
}

export class BrokeragesService {
  /**
   * Create a brokerage rule with full validation.
   */
  async create(data: any) {
    // Validate scope + scriptId
    if (data.scope === 'SCRIPT' && !data.scriptId) {
      throw new BadRequestException('scriptId is required when scope is SCRIPT');
    }
    if (data.scope === 'DEFAULT') {
      data.scriptId = null;
    }

    // Validate type-specific required fields
    if (data.type === 'AMOUNT') {
      if (data.baseAmount == null || data.flatFee == null) {
        throw new BadRequestException('baseAmount and flatFee are required for AMOUNT type');
      }
    }

    const payload = sanitizePayload({ ...data });

    try {
      return await prisma.brokerage.create({
        data: payload as Prisma.BrokerageUncheckedCreateInput,
        include: { account: true, exchange: true, script: true },
      });
    } catch (err: any) {
      // Unique constraint violation
      if (err.code === 'P2002') {
        throw new ConflictException(
          'A brokerage rule with this exact combination (account + exchange + appliesTo + scope + script) already exists.',
        );
      }
      throw err;
    }
  }

  /**
   * List brokerage rules with optional filters.
   */
  async findAll(filters: {
    accountId?: string;
    exchangeId?: string;
    appliesTo?: string;
  }) {
    const where: Prisma.BrokerageWhereInput = {};

    if (filters.accountId) where.accountId = filters.accountId;
    if (filters.exchangeId) where.exchangeId = filters.exchangeId;
    if (filters.appliesTo) {
      where.appliesTo = filters.appliesTo as any;
    }

    return prisma.brokerage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { account: true, exchange: true, script: true },
    });
  }

  /**
   * Get single rule by id.
   */
  async findOne(id: string) {
    const rule = await prisma.brokerage.findUnique({
      where: { id },
      include: { account: true, exchange: true, script: true },
    });
    if (!rule) throw new NotFoundException(`Brokerage rule ${id} not found`);
    return rule;
  }

  /**
   * Update a brokerage rule.
   */
  async update(id: string, data: any) {
    await this.findOne(id); // ensure exists

    if (data.scope === 'SCRIPT' && !data.scriptId) {
      throw new BadRequestException('scriptId is required when scope is SCRIPT');
    }
    if (data.scope === 'DEFAULT') {
      data.scriptId = null;
    }

    const payload = sanitizePayload({ ...data });

    try {
      return await prisma.brokerage.update({
        where: { id },
        data: payload as Prisma.BrokerageUncheckedUpdateInput,
        include: { account: true, exchange: true, script: true },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException(
          'A brokerage rule with this exact combination already exists.',
        );
      }
      throw err;
    }
  }

  /**
   * Delete a brokerage rule.
   */
  async remove(id: string) {
    await this.findOne(id);
    return prisma.brokerage.delete({ where: { id } });
  }

  /**
   * Resolve the applicable brokerage rule.
   */
  async resolve(
    accountId: string,
    exchangeId: string,
    appliesTo: 'CLIENT' | 'BROKER',
    scriptId?: string,
  ) {
    const rows = await prisma.brokerage.findMany({
      where: {
        accountId,
        exchangeId,
        appliesTo,
        scriptId: scriptId ? { in: [scriptId] } : null,
      },
      include: { account: true, exchange: true, script: true },
    });

    let allRows = [...rows];
    if (scriptId) {
      const defaultRows = await prisma.brokerage.findMany({
        where: {
          accountId,
          exchangeId,
          appliesTo,
          scriptId: null,
        },
        include: { account: true, exchange: true, script: true },
      });
      allRows = [...rows, ...defaultRows];
    }

    if (allRows.length === 0) return null;

    // Prefer script-specific over default
    const scriptRow = allRows.find(r => r.scriptId !== null);
    return scriptRow || allRows[0];
  }

  /**
   * Full trade calculation endpoint.
   */
  async calculate(body: {
    clientAccountId: string;
    brokerAccountId: string;
    exchangeId: string;
    scriptId?: string;
    quantity: number;
    marketRate: number;
    segment: 'TRADING' | 'DELIVERY';
  }) {
    const clientRuleRow = await this.resolve(
      body.clientAccountId, body.exchangeId, 'CLIENT', body.scriptId,
    );
    const brokerRuleRow = await this.resolve(
      body.brokerAccountId, body.exchangeId, 'BROKER', body.scriptId,
    );

    if (!clientRuleRow) {
      throw new BadRequestException(
        'No brokerage rule configured for the selected client on this exchange.',
      );
    }
    if (!brokerRuleRow) {
      throw new BadRequestException(
        'No brokerage rule configured for the selected broker on this exchange.',
      );
    }

    const result = calculateTrade({
      quantity: body.quantity,
      marketRate: body.marketRate,
      segment: body.segment,
      clientRule: toRule(clientRuleRow),
      brokerRule: toRule(brokerRuleRow),
    });

    return {
      ...result,
      clientRuleId: clientRuleRow.id,
      brokerRuleId: brokerRuleRow.id,
      clientRuleScope: clientRuleRow.scope,
      brokerRuleScope: brokerRuleRow.scope,
    };
  }
}

export const brokeragesService = new BrokeragesService();
