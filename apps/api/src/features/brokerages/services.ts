import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '../../errors';
import { prisma, Prisma } from '../../database';
import {
  calculateTradeRates,
  calculateClientBrokerage,
  calculateBrokerBrokerage,
  DirectionType,
} from '../../utils/brokerage';

export class BrokeragesService {
  /**
   * Create a brokerage rule with full validation.
   */
  async create(data: any) {
    if (!data.accountId) {
      throw new BadRequestException('accountId is required');
    }
    if (!data.appliesTo) {
      throw new BadRequestException('appliesTo is required');
    }

    // Validate scope + scriptId
    if (data.scope === 'SCRIPT') {
      if (!data.scriptId) {
        throw new BadRequestException('scriptId is required when scope is SCRIPT');
      }
    } else {
      data.scope = 'DEFAULT';
      data.scriptId = null;
    }

    const quantity = Number(data.quantity);
    const brokerage = Number(data.brokerage);

    if (isNaN(quantity) || quantity <= 0) {
      throw new BadRequestException('quantity must be a positive number');
    }
    if (isNaN(brokerage) || brokerage < 0) {
      throw new BadRequestException('brokerage must be a non-negative number');
    }

    const direction: DirectionType = data.direction || 'BOTH';

    try {
      return await prisma.brokerage.create({
        data: {
          accountId: data.accountId,
          appliesTo: data.appliesTo,
          scope: data.scope,
          scriptId: data.scriptId,
          direction,
          quantity,
          brokerage,
        },
        include: {
          account: true,
          script: {
            include: { exchange: true, currency: true },
          },
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException(
          'A brokerage rule with this exact combination (account + appliesTo + scope + script + direction) already exists.',
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
    appliesTo?: string;
    scriptId?: string;
  }) {
    const where: Prisma.BrokerageWhereInput = {};

    if (filters.accountId) where.accountId = filters.accountId;
    if (filters.appliesTo) where.appliesTo = filters.appliesTo as any;
    if (filters.scriptId) where.scriptId = filters.scriptId;

    return prisma.brokerage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        account: true,
        script: {
          include: { exchange: true, currency: true },
        },
      },
    });
  }

  /**
   * Get single rule by id.
   */
  async findOne(id: string) {
    const rule = await prisma.brokerage.findUnique({
      where: { id },
      include: {
        account: true,
        script: {
          include: { exchange: true, currency: true },
        },
      },
    });
    if (!rule) throw new NotFoundException(`Brokerage rule ${id} not found`);
    return rule;
  }

  /**
   * Update a brokerage rule.
   */
  async update(id: string, data: any) {
    await this.findOne(id);

    const updateData: Prisma.BrokerageUpdateInput = {};

    if (data.scope !== undefined) {
      if (data.scope === 'SCRIPT') {
        if (!data.scriptId) {
          throw new BadRequestException('scriptId is required when scope is SCRIPT');
        }
        updateData.scope = 'SCRIPT';
        updateData.script = { connect: { id: data.scriptId } };
      } else {
        updateData.scope = 'DEFAULT';
        updateData.script = { disconnect: true };
      }
    } else if (data.scriptId !== undefined) {
      updateData.script = data.scriptId ? { connect: { id: data.scriptId } } : { disconnect: true };
    }

    if (data.direction !== undefined) {
      updateData.direction = data.direction;
    }

    if (data.quantity !== undefined) {
      const q = Number(data.quantity);
      if (isNaN(q) || q <= 0) throw new BadRequestException('quantity must be a positive number');
      updateData.quantity = q;
    }

    if (data.brokerage !== undefined) {
      const b = Number(data.brokerage);
      if (isNaN(b) || b < 0) throw new BadRequestException('brokerage must be a non-negative number');
      updateData.brokerage = b;
    }

    if (data.appliesTo !== undefined) {
      updateData.appliesTo = data.appliesTo;
    }

    try {
      return await prisma.brokerage.update({
        where: { id },
        data: updateData,
        include: {
          account: true,
          script: {
            include: { exchange: true, currency: true },
          },
        },
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
   * Resolve the applicable brokerage rule for an account, script, and direction.
   * Priority:
   * 1. Script-specific + direction match
   * 2. Script-specific + BOTH
   * 3. Default (All scripts) + direction match
   * 4. Default (All scripts) + BOTH
   */
  async resolve(
    accountId: string,
    appliesTo: 'CLIENT' | 'BROKER',
    scriptId?: string | null,
    direction?: 'BUY' | 'SELL',
  ) {
    const rules = await prisma.brokerage.findMany({
      where: {
        accountId,
        appliesTo,
        OR: [
          ...(scriptId ? [{ scriptId }] : []),
          { scriptId: null },
        ],
      },
      include: {
        account: true,
        script: {
          include: { exchange: true },
        },
      },
    });

    if (rules.length === 0) return null;

    // 1. Script-specific + direction match
    if (scriptId && direction) {
      const match = rules.find(r => r.scriptId === scriptId && r.direction === direction);
      if (match) return match;
    }

    // 2. Script-specific + BOTH
    if (scriptId) {
      const match = rules.find(r => r.scriptId === scriptId && r.direction === 'BOTH');
      if (match) return match;
    }

    // 3. Default (All scripts) + direction match
    if (direction) {
      const match = rules.find(r => !r.scriptId && r.direction === direction);
      if (match) return match;
    }

    // 4. Default (All scripts) + BOTH
    const match = rules.find(r => !r.scriptId && r.direction === 'BOTH');
    return match || null;
  }

  /**
   * Full trade calculation endpoint.
   */
  async calculate(body: {
    clientAccountId: string;
    scriptId?: string;
    quantity: number;
    marketRate: number;
    marketLot?: number;
    side?: 'BUY' | 'SELL';
    brokerBrokerage?: number;
  }) {
    const side = body.side || (body.quantity >= 0 ? 'BUY' : 'SELL');
    const clientRuleRow = await this.resolve(
      body.clientAccountId,
      'CLIENT',
      body.scriptId,
      side,
    );

    const clientRule = clientRuleRow
      ? {
          quantity: clientRuleRow.quantity,
          brokerage: clientRuleRow.brokerage,
          direction: clientRuleRow.direction as DirectionType,
        }
      : null;

    const result = calculateTradeRates({
      rate: body.marketRate,
      quantity: body.quantity,
      marketLot: body.marketLot,
      side,
      clientRule,
      brokerBrokerage: body.brokerBrokerage,
    });

    return {
      ...result,
      clientRuleId: clientRuleRow?.id || null,
    };
  }

  /**
   * Bulk upsert brokerage rules (e.g. for All Scripts for a client).
   */
  async upsertBulk(rules: Array<{
    accountId: string;
    appliesTo: 'CLIENT' | 'BROKER';
    scope?: 'SCRIPT' | 'DEFAULT';
    scriptId?: string | null;
    direction?: DirectionType;
    quantity: number;
    brokerage: number;
  }>) {
    if (!Array.isArray(rules) || rules.length === 0) {
      throw new BadRequestException('rules array is required and must not be empty');
    }

    // Filter valid items
    const validRules = rules.filter((item) => {
      if (!item.accountId || !item.appliesTo || !item.scriptId) return false;
      const q = Number(item.quantity);
      const b = Number(item.brokerage);
      return !isNaN(q) && q > 0 && !isNaN(b) && b >= 0;
    });

    if (validRules.length === 0) {
      return { success: true, count: 0, saved: [] };
    }

    // Pre-fetch all existing brokerage rules for these accounts in 1 single query
    const accountIds = Array.from(new Set(validRules.map((r) => r.accountId)));
    const existingRules = await prisma.brokerage.findMany({
      where: {
        accountId: { in: accountIds },
        scope: 'SCRIPT',
      },
      select: {
        id: true,
        accountId: true,
        appliesTo: true,
        scriptId: true,
        direction: true,
      },
    });

    // O(1) lookup map
    const existingMap = new Map<string, string>();
    for (const er of existingRules) {
      const key = `${er.accountId}_${er.appliesTo}_${er.scriptId}_${er.direction}`;
      existingMap.set(key, er.id);
    }

    // Build batch operations
    const ops = validRules.map((item) => {
      const direction: DirectionType = item.direction || 'BOTH';
      const key = `${item.accountId}_${item.appliesTo}_${item.scriptId}_${direction}`;
      const existingId = existingMap.get(key);
      const q = Number(item.quantity);
      const b = Number(item.brokerage);

      if (existingId) {
        return prisma.brokerage.update({
          where: { id: existingId },
          data: {
            quantity: q,
            brokerage: b,
          },
        });
      }

      return prisma.brokerage.create({
        data: {
          accountId: item.accountId,
          appliesTo: item.appliesTo,
          scope: 'SCRIPT',
          scriptId: item.scriptId,
          direction,
          quantity: q,
          brokerage: b,
        },
      });
    });

    // Execute in a single round-trip transaction
    const saved = await prisma.$transaction(ops);

    return {
      success: true,
      count: saved.length,
      saved,
    };
  }

  /**
   * Bulk delete brokerage rules by an array of IDs.
   */
  async removeBulk(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids array is required and must not be empty');
    }
    const result = await prisma.brokerage.deleteMany({
      where: { id: { in: ids } },
    });
    return { success: true, count: result.count };
  }
}

export const brokeragesService = new BrokeragesService();
