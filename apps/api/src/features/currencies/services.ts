import { NotFoundException } from '../../errors';
import { prisma, Prisma } from '../../database';

export class CurrenciesService {
  async create(data: { code: string; name?: string; symbol?: string }) {
    return prisma.currency.create({
      data: {
        code: data.code.toUpperCase().trim(),
        name: data.name?.trim() || null,
        symbol: data.symbol?.trim() || null,
      },
    });
  }

  async findAll() {
    return prisma.currency.findMany({
      where: {
        isDeleted: false,
      },
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const currency = await prisma.currency.findFirst({ where: { id, isDeleted: false } });
    if (!currency) throw new NotFoundException(`Currency ${id} not found`);
    return currency;
  }

  async update(id: string, data: { code?: string; name?: string; symbol?: string }) {
    await this.findOne(id); // ensure exists
    return prisma.currency.update({
      where: { id },
      data: {
        ...(data.code !== undefined && { code: data.code.toUpperCase().trim() }),
        ...(data.name !== undefined && { name: data.name.trim() || null }),
        ...(data.symbol !== undefined && { symbol: data.symbol.trim() || null }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // ensure exists
    return prisma.currency.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }
}

export const currenciesService = new CurrenciesService();
