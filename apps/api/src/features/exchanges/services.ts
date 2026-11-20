import { NotFoundException, BadRequestException } from '../../errors';
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
    const where: Prisma.ExchangeWhereInput = {
      isDeleted: false,
    };

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
    if (!exchange || exchange.isDeleted) throw new NotFoundException(`Exchange ${id} not found`);
    return exchange;
  }

  async getImpact(id: string) {
    const exchange = await this.findOne(id);
    const activeScriptsCount = await prisma.script.count({
      where: { exchangeId: id, isDeleted: false },
    });
    const totalTradesCount = await prisma.trade.count({
      where: { exchangeId: id, isDeleted: false },
    });
    const openTradesCount = await prisma.trade.count({
      where: { exchangeId: id, settlementId: null, isDeleted: false },
    });

    return {
      exchange,
      activeScriptsCount,
      totalTradesCount,
      openTradesCount,
      canHardDelete: totalTradesCount === 0 && activeScriptsCount === 0,
      warning: `Deleting exchange ${exchange.code} will affect ${activeScriptsCount} configured scripts and ${totalTradesCount} historical trades. Any future trade files containing exchange code ${exchange.code} will fail validation.`,
    };
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
    const exchange = await this.findOne(id); // ensure exists

    const activeTradesCount = await prisma.trade.count({
      where: {
        exchangeId: id,
        isDeleted: false,
      },
    });
    if (activeTradesCount > 0) {
      throw new BadRequestException(
        `Cannot delete Exchange: ${activeTradesCount} active trades are currently linked to exchange '${exchange.code}'.`
      );
    }

    const activeScriptsCount = await prisma.script.count({
      where: {
        exchangeId: id,
        isDeleted: false,
      },
    });
    if (activeScriptsCount > 0) {
      throw new BadRequestException(
        `Cannot delete Exchange: ${activeScriptsCount} active scripts are currently configured under exchange '${exchange.code}'. Delete or reassign the scripts first.`
      );
    }

    return prisma.exchange.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}

export const exchangesService = new ExchangesService();
