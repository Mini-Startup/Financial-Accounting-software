import { NotFoundException, BadRequestException } from '../../errors';
import { prisma, Prisma } from '../../database';

export class ScriptsService {
  async create(data: {
    shortName: string;
    fullName: string;
    isin?: string | null;
    lotSize: number;
    exchangeId?: string | null;
    currencyId?: string | null;
    isActive?: boolean;
  }) {
    const sName = data.shortName.trim();
    const fName = data.fullName.trim();
    const exId = data.exchangeId || null;

    if (exId) {
      const existingScript = await prisma.script.findFirst({
        where: {
          exchangeId: exId,
          OR: [
            { shortName: { equals: sName, mode: 'insensitive' } },
            { fullName: { equals: fName, mode: 'insensitive' } },
          ],
        },
        include: { exchange: true },
      });

      if (existingScript) {
        const exName = existingScript.exchange?.code || 'this exchange';
        throw new BadRequestException(
          `A script with symbol '${sName}' or name '${fName}' already exists on ${exName}`
        );
      }
    }

    return prisma.script.create({
      data: {
        shortName: sName,
        fullName: fName,
        isin: data.isin?.trim() || null,
        lotSize: Number(data.lotSize),
        exchangeId: exId,
        currencyId: data.currencyId || null,
        isActive: data.isActive ?? true,
      },
      include: {
        exchange: true,
        currency: true,
      },
    });
  }

  async findAll(search?: string) {
    const where: Prisma.ScriptWhereInput = {};

    if (search) {
      where.fullName = {
        contains: search,
        mode: 'insensitive',
      };
    }

    return prisma.script.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        exchange: true,
        currency: true,
      },
    });
  }

  async findOne(id: string) {
    const script = await prisma.script.findUnique({
      where: { id },
      include: {
        exchange: true,
        currency: true,
      },
    });
    if (!script) throw new NotFoundException(`Script ${id} not found`);
    return script;
  }

  async update(
    id: string,
    data: {
      shortName?: string;
      fullName?: string;
      isin?: string | null;
      lotSize?: number;
      exchangeId?: string | null;
      currencyId?: string | null;
      isActive?: boolean;
    },
  ) {
    const existing = await this.findOne(id); // ensure exists

    const targetExchangeId = data.exchangeId !== undefined ? (data.exchangeId || null) : existing.exchangeId;
    const targetShortName = data.shortName !== undefined ? data.shortName.trim() : existing.shortName;
    const targetFullName = data.fullName !== undefined ? data.fullName.trim() : existing.fullName;

    if (targetExchangeId && (targetShortName || targetFullName)) {
      const duplicate = await prisma.script.findFirst({
        where: {
          id: { not: id },
          exchangeId: targetExchangeId,
          OR: [
            ...(targetShortName ? [{ shortName: { equals: targetShortName, mode: 'insensitive' as const } }] : []),
            ...(targetFullName ? [{ fullName: { equals: targetFullName, mode: 'insensitive' as const } }] : []),
          ],
        },
        include: { exchange: true },
      });

      if (duplicate) {
        const exName = duplicate.exchange?.code || 'this exchange';
        throw new BadRequestException(
          `A script with symbol '${targetShortName}' or name '${targetFullName}' already exists on ${exName}`
        );
      }
    }

    return prisma.script.update({
      where: { id },
      data: {
        ...(data.shortName !== undefined && { shortName: data.shortName.trim() }),
        ...(data.fullName !== undefined && { fullName: data.fullName.trim() }),
        ...(data.isin !== undefined && { isin: data.isin?.trim() || null }),
        ...(data.lotSize !== undefined && { lotSize: Number(data.lotSize) }),
        ...(data.exchangeId !== undefined && { exchangeId: data.exchangeId || null }),
        ...(data.currencyId !== undefined && { currencyId: data.currencyId || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        exchange: true,
        currency: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return prisma.script.delete({
      where: { id },
    });
  }
}

export const scriptsService = new ScriptsService();
