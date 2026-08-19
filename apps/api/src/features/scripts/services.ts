import { NotFoundException } from '../../errors';
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
    return prisma.script.create({
      data: {
        shortName: data.shortName.trim(),
        fullName: data.fullName.trim(),
        isin: data.isin?.trim() || null,
        lotSize: Number(data.lotSize),
        exchangeId: data.exchangeId || null,
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
    await this.findOne(id); // ensure exists

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
