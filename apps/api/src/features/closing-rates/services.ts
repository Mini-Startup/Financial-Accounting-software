import { NotFoundException } from '../../errors';
import { prisma, Prisma } from '../../database';

export class ClosingRatesService {
  async create(data: {
    exchangeId: string;
    scriptId: string;
    rateDate: string | Date;
    rate: number;
  }) {
    return prisma.closingRate.create({
      data: {
        exchangeId: data.exchangeId,
        scriptId: data.scriptId,
        rateDate: new Date(data.rateDate),
        rate: Number(data.rate),
      },
      include: {
        exchange: true,
        script: true,
      }
    });
  }

  async findAll(search?: string) {
    const where: Prisma.ClosingRateWhereInput = {};
    if (search) {
      where.OR = [
        {
          exchange: {
            code: { contains: search, mode: 'insensitive' }
          }
        },
        {
          script: {
            OR: [
              { shortName: { contains: search, mode: 'insensitive' } },
              { fullName: { contains: search, mode: 'insensitive' } }
            ]
          }
        }
      ];
    }
    return prisma.closingRate.findMany({
      where,
      orderBy: { rateDate: 'desc' },
      include: {
        exchange: true,
        script: true,
      }
    });
  }

  async findOne(id: string) {
    const closingRate = await prisma.closingRate.findUnique({
      where: { id },
      include: {
        exchange: true,
        script: true,
      }
    });
    if (!closingRate) throw new NotFoundException(`Closing rate ${id} not found`);
    return closingRate;
  }

  async update(id: string, data: {
    exchangeId?: string;
    scriptId?: string;
    rateDate?: string | Date;
    rate?: number;
  }) {
    await this.findOne(id);
    return prisma.closingRate.update({
      where: { id },
      data: {
        ...(data.exchangeId && { exchangeId: data.exchangeId }),
        ...(data.scriptId && { scriptId: data.scriptId }),
        ...(data.rateDate && { rateDate: new Date(data.rateDate) }),
        ...(data.rate !== undefined && { rate: Number(data.rate) }),
      },
      include: {
        exchange: true,
        script: true,
      }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return prisma.closingRate.delete({
      where: { id },
    });
  }
}

export const closingRatesService = new ClosingRatesService();
