import { NotFoundException } from '../../errors';
import { prisma, Prisma } from '../../database';

export class ExchangesService {
  async create(data: { code: string; name?: string; isActive?: boolean }) {
    return prisma.exchange.create({
      data: {
        code: data.code.toUpperCase().trim(),
        name: data.name?.trim() || null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findAll(activeOnly?: boolean) {
    const where: Prisma.ExchangeWhereInput = {};

    if (activeOnly) {
      where.isActive = true;
    }

    return prisma.exchange.findMany({
      where,
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const exchange = await prisma.exchange.findUnique({ where: { id } });
    if (!exchange) throw new NotFoundException(`Exchange ${id} not found`);
    return exchange;
  }

  async update(id: string, data: { code?: string; name?: string; isActive?: boolean }) {
    await this.findOne(id); // ensure exists
    return prisma.exchange.update({
      where: { id },
      data: {
        ...(data.code !== undefined && { code: data.code.toUpperCase().trim() }),
        ...(data.name !== undefined && { name: data.name.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // ensure exists
    return prisma.exchange.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const exchangesService = new ExchangesService();
