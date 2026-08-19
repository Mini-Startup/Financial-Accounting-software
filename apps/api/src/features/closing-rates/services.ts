import { NotFoundException } from '../../errors';
import { prisma, Prisma } from '../../database';

export class ClosingRatesService {
  async create(data: {
    exchangeId: string;
    scriptId?: string | null;
    securityName: string;
    rateDate: string | Date;
    rate: number;
    expiry?: string | null;
    delMonth?: string | null;
    callPut?: string | null;
    strikePrice?: number | null;
    bloombergCode?: string | null;
    currencyCode?: string | null;
  }) {
    const rateDate = new Date(data.rateDate);
    rateDate.setUTCHours(0, 0, 0, 0);

    return prisma.closingRate.create({
      data: {
        exchangeId: data.exchangeId,
        scriptId: data.scriptId || null,
        securityName: data.securityName.trim(),
        rateDate,
        rate: Number(data.rate),
        expiry: data.expiry || null,
        delMonth: data.delMonth || null,
        callPut: data.callPut || null,
        strikePrice: data.strikePrice ? Number(data.strikePrice) : null,
        bloombergCode: data.bloombergCode || null,
        currencyCode: data.currencyCode || null,
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

  async findAll(search?: string) {
    const where: Prisma.ClosingRateWhereInput = {};
    if (search) {
      where.OR = [
        { securityName: { contains: search, mode: 'insensitive' } },
        { exchange: { code: { contains: search, mode: 'insensitive' } } },
        { script: { shortName: { contains: search, mode: 'insensitive' } } },
        { script: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
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
