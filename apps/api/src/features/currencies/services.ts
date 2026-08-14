import { NotFoundException } from '../../errors';
import { prisma, Prisma } from '../../database';

export class CurrenciesService {
  async create(data: { code: string; name?: string; symbol?: string; isActive?: boolean }) {
    return prisma.currency.create({
      data: {
        code: data.code.toUpperCase().trim(),
        name: data.name?.trim() || null,
        symbol: data.symbol?.trim() || null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findAll(activeOnly?: boolean) {
    const where: Prisma.CurrencyWhereInput = {};

    if (activeOnly) {
      where.isActive = true;
    }

    return prisma.currency.findMany({
      where,
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const currency = await prisma.currency.findUnique({ where: { id } });
    if (!currency) throw new NotFoundException(`Currency ${id} not found`);
    return currency;
  }

  async update(id: string, data: { code?: string; name?: string; symbol?: string; isActive?: boolean }) {
    await this.findOne(id); // ensure exists
    return prisma.currency.update({
      where: { id },
      data: {
        ...(data.code !== undefined && { code: data.code.toUpperCase().trim() }),
        ...(data.name !== undefined && { name: data.name.trim() || null }),
        ...(data.symbol !== undefined && { symbol: data.symbol.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // ensure exists
    return prisma.currency.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const currenciesService = new CurrenciesService();
