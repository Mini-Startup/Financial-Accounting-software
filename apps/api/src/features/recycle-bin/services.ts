import { prisma, Prisma } from '../../database';
import { NotFoundException, BadRequestException, ConflictException } from '../../errors';

export interface RecycleBinItem {
  id: string;
  entityType: 'trade' | 'account' | 'closingRate' | 'script' | 'voucher' | 'brokerage' | 'expiryDate' | 'group';
  entityLabel: string;
  primaryIdentifier: string;
  secondaryIdentifier?: string;
  details: Record<string, any>;
  deletedAt: string;
  createdAt?: string;
}

export interface RecycleBinFindParams {
  type?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export class RecycleBinService {
  async getCounts() {
    const [
      trades,
      accounts,
      closingRates,
      scripts,
      vouchers,
      brokerages,
      expiryDates,
      groups,
    ] = await Promise.all([
      prisma.trade.count({ where: { isDeleted: true } }),
      prisma.account.count({ where: { isDeleted: true } }),
      prisma.closingRate.count({ where: { isDeleted: true } }),
      prisma.script.count({ where: { isDeleted: true } }),
      prisma.voucher.count({ where: { isDeleted: true } }),
      prisma.brokerage.count({ where: { isDeleted: true } }),
      prisma.expiryDate.count({ where: { isDeleted: true } }),
      prisma.group.count({ where: { isDeleted: true } }),
    ]);

    const all = trades + accounts + closingRates + scripts + vouchers + brokerages + expiryDates + groups;

    return {
      all,
      trades,
      accounts,
      closingRates,
      scripts,
      vouchers,
      brokerages,
      expiryDates,
      groups,
    };
  }

  async findAll(params: RecycleBinFindParams = {}) {
    const { type = 'all', search, fromDate, toDate, limit = 200, offset = 0 } = params;
    const cleanSearch = search?.trim().toLowerCase();

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) {
      const d = new Date(fromDate);
      d.setHours(0, 0, 0, 0);
      dateFilter.gte = d;
    }
    if (toDate) {
      const d = new Date(toDate);
      d.setHours(23, 59, 59, 999);
      dateFilter.lte = d;
    }
    const hasDateFilter = Boolean(dateFilter.gte || dateFilter.lte);

    const items: RecycleBinItem[] = [];

    // 1. TRADES
    if (type === 'all' || type === 'trades' || type === 'trade') {
      const tradeWhere: Prisma.TradeWhereInput = { isDeleted: true };
      if (hasDateFilter) tradeWhere.deletedAt = dateFilter;
      if (cleanSearch) {
        tradeWhere.OR = [
          { tradeNumber: { contains: cleanSearch, mode: 'insensitive' } },
          { account: { name: { contains: cleanSearch, mode: 'insensitive' } } },
          { account: { code: { contains: cleanSearch, mode: 'insensitive' } } },
          { broker: { name: { contains: cleanSearch, mode: 'insensitive' } } },
          { script: { shortName: { contains: cleanSearch, mode: 'insensitive' } } },
          { script: { fullName: { contains: cleanSearch, mode: 'insensitive' } } },
        ];
      }

      const trades = await prisma.trade.findMany({
        where: tradeWhere,
        include: { account: true, broker: true, script: true },
        orderBy: { deletedAt: 'desc' },
        take: limit,
      });

      for (const t of trades) {
        const scriptDisplay = t.script?.shortName || t.securityName || 'SCRIPT';
        items.push({
          id: t.id,
          entityType: 'trade',
          entityLabel: 'Trade',
          primaryIdentifier: t.tradeNumber || `TRD-${t.id.slice(-6).toUpperCase()}`,
          secondaryIdentifier: `${t.transactionType} ${t.quantity} ${scriptDisplay} @ ₹${t.rate}`,
          details: {
            tradeDate: t.tradeDate,
            accountName: t.account?.name,
            accountCode: t.account?.code,
            brokerName: t.broker?.name,
            script: scriptDisplay,
            transactionType: t.transactionType,
            quantity: t.quantity,
            rate: t.rate,
            clientRate: t.clientRate,
            brokerRate: t.brokerRate,
            remarks: t.remarks,
          },
          deletedAt: t.deletedAt?.toISOString() || new Date().toISOString(),
          createdAt: t.createdAt?.toISOString(),
        });
      }
    }

    // 2. ACCOUNTS (Clients / Brokers)
    if (type === 'all' || type === 'accounts' || type === 'account') {
      const accountWhere: Prisma.AccountWhereInput = { isDeleted: true };
      if (hasDateFilter) accountWhere.deletedAt = dateFilter;
      if (cleanSearch) {
        accountWhere.OR = [
          { code: { contains: cleanSearch, mode: 'insensitive' } },
          { name: { contains: cleanSearch, mode: 'insensitive' } },
          { mobileNumber: { contains: cleanSearch, mode: 'insensitive' } },
          { email: { contains: cleanSearch, mode: 'insensitive' } },
        ];
      }

      const accounts = await prisma.account.findMany({
        where: accountWhere,
        include: { group: true },
        orderBy: { deletedAt: 'desc' },
        take: limit,
      });

      for (const a of accounts) {
        const isBroker = a.group?.name?.toLowerCase().includes('broker') || !a.isDirectClient;
        items.push({
          id: a.id,
          entityType: 'account',
          entityLabel: isBroker ? 'Broker Account' : 'Client Account',
          primaryIdentifier: a.code,
          secondaryIdentifier: a.name,
          details: {
            code: a.code,
            name: a.name,
            group: a.group?.name || 'Unassigned',
            mobileNumber: a.mobileNumber,
            email: a.email,
            isDirectClient: a.isDirectClient,
          },
          deletedAt: a.deletedAt?.toISOString() || new Date().toISOString(),
          createdAt: a.createdAt?.toISOString(),
        });
      }
    }

    // 3. CLOSING RATES
    if (type === 'all' || type === 'closingRates' || type === 'closingRate') {
      const crWhere: Prisma.ClosingRateWhereInput = { isDeleted: true };
      if (hasDateFilter) crWhere.deletedAt = dateFilter;
      if (cleanSearch) {
        crWhere.OR = [
          { script: { shortName: { contains: cleanSearch, mode: 'insensitive' } } },
          { script: { fullName: { contains: cleanSearch, mode: 'insensitive' } } },
          { exchange: { code: { contains: cleanSearch, mode: 'insensitive' } } },
        ];
      }

      const rates = await prisma.closingRate.findMany({
        where: crWhere,
        include: { script: true, exchange: true },
        orderBy: { deletedAt: 'desc' },
        take: limit,
      });

      for (const cr of rates) {
        const dateStr = cr.rateDate ? new Date(cr.rateDate).toISOString().slice(0, 10) : '';
        const scriptName = cr.script?.shortName || cr.script?.fullName || 'SCRIPT';
        items.push({
          id: cr.id,
          entityType: 'closingRate',
          entityLabel: 'Closing Rate',
          primaryIdentifier: `${scriptName} (${dateStr})`,
          secondaryIdentifier: `Closing: ₹${cr.rate?.toFixed(2)} [${cr.exchange?.code || 'NSE'}]`,
          details: {
            rateDate: cr.rateDate,
            script: scriptName,
            exchange: cr.exchange?.code,
            rate: cr.rate,
          },
          deletedAt: cr.deletedAt?.toISOString() || new Date().toISOString(),
          createdAt: cr.createdAt?.toISOString(),
        });
      }
    }

    // 4. SCRIPTS
    if (type === 'all' || type === 'scripts' || type === 'script') {
      const scWhere: Prisma.ScriptWhereInput = { isDeleted: true };
      if (hasDateFilter) scWhere.deletedAt = dateFilter;
      if (cleanSearch) {
        scWhere.OR = [
          { shortName: { contains: cleanSearch, mode: 'insensitive' } },
          { fullName: { contains: cleanSearch, mode: 'insensitive' } },
        ];
      }

      const scripts = await prisma.script.findMany({
        where: scWhere,
        include: { exchange: true },
        orderBy: { deletedAt: 'desc' },
        take: limit,
      });

      for (const s of scripts) {
        items.push({
          id: s.id,
          entityType: 'script',
          entityLabel: 'Script / Symbol',
          primaryIdentifier: s.shortName,
          secondaryIdentifier: s.fullName,
          details: {
            shortName: s.shortName,
            fullName: s.fullName,
            exchange: s.exchange?.code,
            lotSize: s.lotSize,
          },
          deletedAt: s.deletedAt?.toISOString() || new Date().toISOString(),
          createdAt: s.createdAt?.toISOString(),
        });
      }
    }

    // 5. VOUCHERS
    if (type === 'all' || type === 'vouchers' || type === 'voucher') {
      const vWhere: Prisma.VoucherWhereInput = { isDeleted: true };
      if (hasDateFilter) vWhere.deletedAt = dateFilter;
      if (cleanSearch) {
        vWhere.OR = [
          { voucherNumber: { contains: cleanSearch, mode: 'insensitive' } },
          { remarks: { contains: cleanSearch, mode: 'insensitive' } },
          { lines: { some: { account: { name: { contains: cleanSearch, mode: 'insensitive' } } } } },
        ];
      }

      const vouchers = await prisma.voucher.findMany({
        where: vWhere,
        include: { lines: { include: { account: true } } },
        orderBy: { deletedAt: 'desc' },
        take: limit,
      });

      for (const v of vouchers) {
        const totalAmount = v.lines?.reduce((sum, line) => sum + Math.abs(line.amount || 0), 0) || 0;
        const mainAccount = v.lines?.[0]?.account?.name || '';
        items.push({
          id: v.id,
          entityType: 'voucher',
          entityLabel: `Voucher (${v.type})`,
          primaryIdentifier: v.voucherNumber || `VCH-${v.id.slice(-6).toUpperCase()}`,
          secondaryIdentifier: v.remarks || (mainAccount ? `A/c: ${mainAccount} (₹${totalAmount.toFixed(2)})` : `₹${totalAmount.toFixed(2)}`),
          details: {
            voucherNumber: v.voucherNumber,
            type: v.type,
            date: v.date,
            remarks: v.remarks,
            lineCount: v.lines.length,
            totalAmount,
            accounts: v.lines.map((l) => l.account?.name).filter(Boolean),
          },
          deletedAt: v.deletedAt?.toISOString() || new Date().toISOString(),
          createdAt: v.createdAt?.toISOString(),
        });
      }
    }

    // 6. BROKERAGES
    if (type === 'all' || type === 'brokerages' || type === 'brokerage') {
      const brWhere: Prisma.BrokerageWhereInput = { isDeleted: true };
      if (hasDateFilter) brWhere.deletedAt = dateFilter;
      if (cleanSearch) {
        brWhere.OR = [
          { account: { name: { contains: cleanSearch, mode: 'insensitive' } } },
          { account: { code: { contains: cleanSearch, mode: 'insensitive' } } },
          { script: { shortName: { contains: cleanSearch, mode: 'insensitive' } } },
          { script: { fullName: { contains: cleanSearch, mode: 'insensitive' } } },
        ];
      }

      const brokerages = await prisma.brokerage.findMany({
        where: brWhere,
        include: { account: true, script: true },
        orderBy: { deletedAt: 'desc' },
        take: limit,
      });

      for (const b of brokerages) {
        items.push({
          id: b.id,
          entityType: 'brokerage',
          entityLabel: 'Brokerage Rule',
          primaryIdentifier: `${b.account?.code || 'Global'} - ${b.script?.shortName || 'All'}`,
          secondaryIdentifier: `${b.scope}: ₹${b.brokerage} (${b.account?.name || 'All Accounts'})`,
          details: {
            accountName: b.account?.name,
            accountCode: b.account?.code,
            script: b.script?.shortName,
            scope: b.scope,
            appliesTo: b.appliesTo,
            brokerage: b.brokerage,
            quantity: b.quantity,
          },
          deletedAt: b.deletedAt?.toISOString() || new Date().toISOString(),
          createdAt: b.createdAt?.toISOString(),
        });
      }
    }

    // 7. EXPIRY DATES
    if (type === 'all' || type === 'expiryDates' || type === 'expiryDate') {
      const edWhere: Prisma.ExpiryDateWhereInput = { isDeleted: true };
      if (hasDateFilter) edWhere.deletedAt = dateFilter;
      if (cleanSearch) {
        edWhere.date = { contains: cleanSearch, mode: 'insensitive' };
      }

      const expiryDates = await prisma.expiryDate.findMany({
        where: edWhere,
        orderBy: { deletedAt: 'desc' },
        take: limit,
      });

      for (const ed of expiryDates) {
        items.push({
          id: ed.id,
          entityType: 'expiryDate',
          entityLabel: 'Expiry Date',
          primaryIdentifier: ed.date,
          secondaryIdentifier: `Normalized: ${ed.normalizedDate ? new Date(ed.normalizedDate).toISOString().slice(0, 10) : ''}`,
          details: {
            date: ed.date,
            normalizedDate: ed.normalizedDate,
          },
          deletedAt: ed.deletedAt?.toISOString() || new Date().toISOString(),
          createdAt: ed.createdAt?.toISOString(),
        });
      }
    }

    // 8. GROUPS
    if (type === 'all' || type === 'groups' || type === 'group') {
      const grWhere: Prisma.GroupWhereInput = { isDeleted: true };
      if (hasDateFilter) grWhere.deletedAt = dateFilter;
      if (cleanSearch) {
        grWhere.name = { contains: cleanSearch, mode: 'insensitive' };
      }

      const groups = await prisma.group.findMany({
        where: grWhere,
        orderBy: { deletedAt: 'desc' },
        take: limit,
      });

      for (const g of groups) {
        items.push({
          id: String(g.id),
          entityType: 'group',
          entityLabel: 'Account Group',
          primaryIdentifier: g.name,
          secondaryIdentifier: `Display Order: ${g.displayOrder ?? 'None'}`,
          details: {
            name: g.name,
            displayOrder: g.displayOrder,
          },
          deletedAt: g.deletedAt?.toISOString() || new Date().toISOString(),
        });
      }
    }

    // Sort combined items by deletedAt descending
    items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

    // Apply pagination
    const paginatedItems = items.slice(offset, offset + limit);
    const counts = await this.getCounts();

    return {
      items: paginatedItems,
      totalCount: items.length,
      counts,
    };
  }

  async restoreItem(entityType: string, id: string) {
    switch (entityType) {
      case 'trade': {
        const trade = await prisma.trade.findUnique({ where: { id } });
        if (!trade) throw new NotFoundException('Trade not found');
        return prisma.trade.update({
          where: { id },
          data: { isDeleted: false, deletedAt: null },
        });
      }

      case 'account': {
        const account = await prisma.account.findUnique({ where: { id } });
        if (!account) throw new NotFoundException('Account not found');
        const conflict = await prisma.account.findFirst({
          where: { code: account.code, isDeleted: false },
        });
        if (conflict) {
          throw new ConflictException(`Cannot restore: An active account with code "${account.code}" already exists.`);
        }
        return prisma.account.update({
          where: { id },
          data: { isDeleted: false, deletedAt: null, isActive: true },
        });
      }

      case 'closingRate': {
        const cr = await prisma.closingRate.findUnique({ where: { id } });
        if (!cr) throw new NotFoundException('Closing Rate not found');
        return prisma.closingRate.update({
          where: { id },
          data: { isDeleted: false, deletedAt: null },
        });
      }

      case 'script': {
        const sc = await prisma.script.findUnique({ where: { id } });
        if (!sc) throw new NotFoundException('Script not found');
        const conflict = await prisma.script.findFirst({
          where: { shortName: sc.shortName, isDeleted: false },
        });
        if (conflict) {
          throw new ConflictException(`Cannot restore: An active script with symbol "${sc.shortName}" already exists.`);
        }
        return prisma.script.update({
          where: { id },
          data: { isDeleted: false, deletedAt: null, isActive: true },
        });
      }

      case 'voucher': {
        const v = await prisma.voucher.findUnique({ where: { id } });
        if (!v) throw new NotFoundException('Voucher not found');
        return prisma.$transaction(async (tx) => {
          const restored = await tx.voucher.update({
            where: { id },
            data: { isDeleted: false, deletedAt: null },
          });
          await tx.voucherLine.updateMany({
            where: { voucherId: id },
            data: { isDeleted: false, deletedAt: null },
          });
          await tx.ledger.updateMany({
            where: { referenceId: id, entryType: 'VOUCHER' },
            data: { isDeleted: false, deletedAt: null },
          });
          return restored;
        });
      }

      case 'brokerage': {
        const b = await prisma.brokerage.findUnique({ where: { id } });
        if (!b) throw new NotFoundException('Brokerage rule not found');
        return prisma.brokerage.update({
          where: { id },
          data: { isDeleted: false, deletedAt: null },
        });
      }

      case 'expiryDate': {
        const ed = await prisma.expiryDate.findUnique({ where: { id } });
        if (!ed) throw new NotFoundException('Expiry date not found');
        const conflict = await prisma.expiryDate.findFirst({
          where: { date: ed.date, isDeleted: false },
        });
        if (conflict) {
          throw new ConflictException(`Cannot restore: An active expiry date for "${ed.date}" already exists.`);
        }
        return prisma.expiryDate.update({
          where: { id },
          data: { isDeleted: false, deletedAt: null },
        });
      }

      case 'group': {
        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) throw new BadRequestException('Invalid group ID');
        const g = await prisma.group.findUnique({ where: { id: numericId } });
        if (!g) throw new NotFoundException('Group not found');
        const conflict = await prisma.group.findFirst({
          where: { name: g.name, isDeleted: false },
        });
        if (conflict) {
          throw new ConflictException(`Cannot restore: An active group with name "${g.name}" already exists.`);
        }
        return prisma.group.update({
          where: { id: numericId },
          data: { isDeleted: false, deletedAt: null },
        });
      }

      default:
        throw new BadRequestException(`Unknown entity type: ${entityType}`);
    }
  }

  async restoreBulk(items: Array<{ entityType: string; id: string }>) {
    if (!items || items.length === 0) {
      throw new BadRequestException('Items array is required for bulk restore.');
    }
    const results: Array<{ id: string; entityType: string; success: boolean }> = [];
    const errors: Array<{ id: string; entityType: string; error: string }> = [];

    for (const item of items) {
      try {
        await this.restoreItem(item.entityType, item.id);
        results.push({ id: item.id, entityType: item.entityType, success: true });
      } catch (err: any) {
        errors.push({ id: item.id, entityType: item.entityType, error: err.message });
      }
    }

    return {
      restoredCount: results.length,
      failedCount: errors.length,
      results,
      errors,
    };
  }
}

export const recycleBinService = new RecycleBinService();
