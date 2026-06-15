import { NotFoundException } from '../../errors';
import { prisma, Prisma } from '../../database';

export class ExpiryDatesService {
  async create(data: {
    date: string | Date;
    isActive?: boolean;
  }) {
    return prisma.expiryDate.create({
      data: {
        date: new Date(data.date),
        isActive: data.isActive ?? true,
      },
    });
  }

  async findAll() {
    return prisma.expiryDate.findMany({
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string) {
    const expiryDate = await prisma.expiryDate.findUnique({
      where: { id },
    });
    if (!expiryDate) throw new NotFoundException(`Expiry date ${id} not found`);
    return expiryDate;
  }

  async update(id: string, data: {
    date?: string | Date;
    isActive?: boolean;
  }) {
    await this.findOne(id);
    return prisma.expiryDate.update({
      where: { id },
      data: {
        ...(data.date && { date: new Date(data.date) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return prisma.expiryDate.delete({
      where: { id },
    });
  }
}

export const expiryDatesService = new ExpiryDatesService();
