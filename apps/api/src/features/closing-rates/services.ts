import { NotFoundException, BadRequestException } from '../../errors';
import { prisma, Prisma } from '../../database';
import { deriveSecurityName } from '../settlement/utils';
import { parseFlexibleDate } from '../Trade_FnO/services';

export interface ClosingRateQueryParams {
  search?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
  scriptId?: string;
  exchangeId?: string;
}

export class ClosingRatesService {
  async create(data: {
    exchangeId?: string;
    scriptId?: string | null;
    securityName?: string;
    rateDate: string | Date;
    rate: number;
    expiry?: string | null;
    delMonth?: string | null;
    callPut?: string | null;
    strikePrice?: number | null;
    bloombergCode?: string | null;
    currencyCode?: string | null;
  }) {
    let resolvedExchangeId = data.exchangeId;
    let resolvedSecurityName = data.securityName?.trim() || '';

    let script: any = null;
    if (data.scriptId) {
      script = await prisma.script.findUnique({
        where: { id: data.scriptId },
        include: { currency: true, exchange: true },
      });
      if (script && !resolvedExchangeId) {
        resolvedExchangeId = script.exchangeId;
      }
    }

    if (!resolvedExchangeId) {
      throw new BadRequestException('Exchange is required (or script with linked exchange)');
    }

    if (!resolvedSecurityName) {
      if (script) {
        resolvedSecurityName = deriveSecurityName(
          '',
          script.shortName,
          script.fullName,
          data.expiry,
          data.callPut,
          data.strikePrice
        );
      } else {
        throw new BadRequestException('Security Name is required when script is not selected');
      }
    }

    const rateDate = parseFlexibleDate(data.rateDate);
    const rateYear = rateDate.getFullYear();
    if (rateYear < 2000 || rateYear > 2099) {
      throw new BadRequestException('Rate Date year must be a valid 4-digit year (between 2000 and 2099)');
    }
    rateDate.setUTCHours(0, 0, 0, 0);

    if (data.expiry) {
      const expDate = parseFlexibleDate(data.expiry);
      const expYear = expDate.getFullYear();
      if (expYear < 2000 || expYear > 2099) {
        throw new BadRequestException('Expiry Date year must be a valid 4-digit year (between 2000 and 2099)');
      }
      const rDateUtc = Date.UTC(rateDate.getFullYear(), rateDate.getMonth(), rateDate.getDate());
      const eDateUtc = Date.UTC(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
      if (eDateUtc < rDateUtc) {
        throw new BadRequestException('Expiry date cannot be before rate date');
      }
    }

    const currencyCode = data.currencyCode || script?.currency?.code || null;

    return prisma.closingRate.create({
      data: {
        exchangeId: resolvedExchangeId,
        scriptId: data.scriptId || null,
        securityName: resolvedSecurityName,
        rateDate,
        rate: Number(data.rate),
        expiry: data.expiry || null,
        delMonth: data.delMonth || null,
        callPut: data.callPut || null,
        strikePrice: data.strikePrice ? Number(data.strikePrice) : null,
        bloombergCode: data.bloombergCode || null,
        currencyCode,
      },
      include: {
        exchange: true,
        script: {
          include: {
            currency: true,
          },
        },
      },
    });
  }

  async findAll(params?: string | ClosingRateQueryParams) {
    const where: Prisma.ClosingRateWhereInput = {};

    if (typeof params === 'string') {
      if (params) {
        where.OR = [
          { securityName: { contains: params, mode: 'insensitive' } },
          { exchange: { code: { contains: params, mode: 'insensitive' } } },
          { script: { shortName: { contains: params, mode: 'insensitive' } } },
          { script: { fullName: { contains: params, mode: 'insensitive' } } },
        ];
      }
    } else if (params) {
      if (params.search) {
        where.OR = [
          { securityName: { contains: params.search, mode: 'insensitive' } },
          { exchange: { code: { contains: params.search, mode: 'insensitive' } } },
          { script: { shortName: { contains: params.search, mode: 'insensitive' } } },
          { script: { fullName: { contains: params.search, mode: 'insensitive' } } },
        ];
      }

      if (params.date) {
        const d = parseFlexibleDate(params.date);
        const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
        const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
        where.rateDate = { gte: start, lte: end };
      } else if (params.fromDate || params.toDate) {
        const dateRange: { gte?: Date; lte?: Date } = {};
        if (params.fromDate) {
          const start = parseFlexibleDate(params.fromDate);
          start.setUTCHours(0, 0, 0, 0);
          dateRange.gte = start;
        }
        if (params.toDate) {
          const end = parseFlexibleDate(params.toDate);
          end.setUTCHours(23, 59, 59, 999);
          dateRange.lte = end;
        }
        where.rateDate = dateRange;
      }

      if (params.scriptId) {
        where.scriptId = params.scriptId;
      }

      if (params.exchangeId) {
        where.exchangeId = params.exchangeId;
      }
    }

    return prisma.closingRate.findMany({
      where,
      orderBy: { rateDate: 'desc' },
      include: {
        exchange: true,
        script: {
          include: {
            currency: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const closingRate = await prisma.closingRate.findUnique({
      where: { id },
      include: {
        exchange: true,
        script: {
          include: {
            currency: true,
          },
        },
      },
    });
    if (!closingRate) throw new NotFoundException(`Closing rate ${id} not found`);
    return closingRate;
  }

  async update(
    id: string,
    data: Partial<{
      exchangeId: string;
      scriptId?: string | null;
      securityName?: string;
      rateDate: string | Date;
      rate: number;
      expiry?: string | null;
      delMonth?: string | null;
      callPut?: string | null;
      strikePrice?: number | null;
      bloombergCode?: string | null;
      currencyCode?: string | null;
    }>
  ) {
    await this.findOne(id);
    return prisma.closingRate.update({
      where: { id },
      data: {
        ...(data.exchangeId && { exchangeId: data.exchangeId }),
        ...(data.scriptId !== undefined && { scriptId: data.scriptId || null }),
        ...(data.securityName && { securityName: data.securityName.trim() }),
        ...(data.rateDate && { rateDate: new Date(data.rateDate) }),
        ...(data.rate !== undefined && { rate: Number(data.rate) }),
        ...(data.expiry !== undefined && { expiry: data.expiry || null }),
        ...(data.delMonth !== undefined && { delMonth: data.delMonth || null }),
        ...(data.callPut !== undefined && { callPut: data.callPut || null }),
        ...(data.strikePrice !== undefined && { strikePrice: data.strikePrice ? Number(data.strikePrice) : null }),
        ...(data.bloombergCode !== undefined && { bloombergCode: data.bloombergCode || null }),
        ...(data.currencyCode !== undefined && { currencyCode: data.currencyCode || null }),
      },
      include: {
        exchange: true,
        script: {
          include: {
            currency: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return prisma.closingRate.delete({
      where: { id },
    });
  }

  async bulkUpsert(
    rates: Array<{
      exchangeId: string;
      scriptId?: string | null;
      securityName?: string | null;
      rateDate: string | Date;
      rate: number;
      expiry?: string | null;
      delMonth?: string | null;
      callPut?: string | null;
      strikePrice?: number | null;
      bloombergCode?: string | null;
      currencyCode?: string | null;
    }>
  ) {
    let imported = 0;

    const allScriptIds = Array.from(
      new Set(rates.filter((r) => r.scriptId).map((r) => r.scriptId!))
    );

    const scriptMap = new Map<string, string>();
    const scriptCurrencyMap = new Map<string, string>();

    if (allScriptIds.length > 0) {
      const fetchedScripts = await prisma.script.findMany({
        where: { id: { in: allScriptIds } },
        select: {
          id: true,
          fullName: true,
          shortName: true,
          currency: { select: { code: true } },
        },
      });
      for (const s of fetchedScripts) {
        scriptMap.set(s.id, s.fullName || s.shortName || '');
        if (s.currency?.code) {
          scriptCurrencyMap.set(s.id, s.currency.code);
        }
      }
    }

    for (const r of rates) {
      if (!r.exchangeId || r.rate == null) continue;

      const rateDate = new Date(r.rateDate);
      rateDate.setUTCHours(0, 0, 0, 0);

      let secName = (r.securityName || '').trim();
      if (!secName && r.scriptId) {
        secName = (scriptMap.get(r.scriptId) || '').trim();
      }

      if (!secName) continue; // Skip if no valid security name could be resolved

      const resolvedCurrencyCode =
        r.currencyCode || (r.scriptId ? scriptCurrencyMap.get(r.scriptId) : null) || null;

      await prisma.closingRate.upsert({
        where: {
          exchangeId_securityName_rateDate: {
            exchangeId: r.exchangeId,
            securityName: secName,
            rateDate,
          },
        },
        update: {
          rate: Number(r.rate),
          scriptId: r.scriptId || null,
          expiry: r.expiry || null,
          delMonth: r.delMonth || null,
          callPut: r.callPut || null,
          strikePrice: r.strikePrice ? Number(r.strikePrice) : null,
          bloombergCode: r.bloombergCode || null,
          currencyCode: resolvedCurrencyCode,
        },
        create: {
          exchangeId: r.exchangeId,
          scriptId: r.scriptId || null,
          securityName: secName,
          rateDate,
          rate: Number(r.rate),
          expiry: r.expiry || null,
          delMonth: r.delMonth || null,
          callPut: r.callPut || null,
          strikePrice: r.strikePrice ? Number(r.strikePrice) : null,
          bloombergCode: r.bloombergCode || null,
          currencyCode: resolvedCurrencyCode,
        },
      });
      imported++;
    }
    return { importedCount: imported };
  }

  async checkDuplicates(
    rates: Array<{
      exchangeId: string;
      scriptId?: string | null;
      securityName?: string | null;
      rateDate: string | Date;
      rate: number;
      expiry?: string | null;
      delMonth?: string | null;
      callPut?: string | null;
      strikePrice?: number | null;
      bloombergCode?: string | null;
      currencyCode?: string | null;
    }>
  ) {
    const allScriptIds = Array.from(
      new Set(rates.filter((r) => r.scriptId).map((r) => r.scriptId!))
    );

    const scriptMap = new Map<string, string>();
    const scriptCurrencyMap = new Map<string, string>();

    if (allScriptIds.length > 0) {
      const fetchedScripts = await prisma.script.findMany({
        where: { id: { in: allScriptIds } },
        select: {
          id: true,
          fullName: true,
          shortName: true,
          currency: { select: { code: true } },
        },
      });
      for (const s of fetchedScripts) {
        scriptMap.set(s.id, s.fullName || s.shortName || '');
        if (s.currency?.code) {
          scriptCurrencyMap.set(s.id, s.currency.code);
        }
      }
    }

    const newRates: any[] = [];
    const exactDuplicates: any[] = [];
    const conflicts: any[] = [];

    for (const r of rates) {
      if (!r.exchangeId || r.rate == null) continue;

      const rateDate = new Date(r.rateDate);
      rateDate.setUTCHours(0, 0, 0, 0);

      let secName = (r.securityName || '').trim();
      if (!secName && r.scriptId) {
        secName = (scriptMap.get(r.scriptId) || '').trim();
      }

      if (!secName) continue;

      const resolvedCurrencyCode =
        r.currencyCode || (r.scriptId ? scriptCurrencyMap.get(r.scriptId) : null) || null;

      const existing = await prisma.closingRate.findUnique({
        where: {
          exchangeId_securityName_rateDate: {
            exchangeId: r.exchangeId,
            securityName: secName,
            rateDate,
          },
        },
        include: {
          exchange: true,
          script: true,
        },
      });

      const rateObj = {
        ...r,
        securityName: secName,
        currencyCode: resolvedCurrencyCode,
        rateDate: rateDate.toISOString().split('T')[0],
      };

      if (!existing) {
        newRates.push(rateObj);
      } else {
        const diff = Math.abs(Number(existing.rate) - Number(r.rate));
        if (diff < 0.00001) {
          exactDuplicates.push({
            ...rateObj,
            existingRate: existing.rate,
            existingId: existing.id,
          });
        } else {
          conflicts.push({
            ...rateObj,
            existingRate: existing.rate,
            existingId: existing.id,
          });
        }
      }
    }

    return {
      newRates,
      exactDuplicates,
      conflicts,
      totalCount: rates.length,
    };
  }
}

export const closingRatesService = new ClosingRatesService();
