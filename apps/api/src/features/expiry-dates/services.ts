import { NotFoundException } from '../../errors';
import { prisma, Prisma } from '../../database';
import { CreateExpiryDateInput, ExpiryDateFilter, UpdateExpiryDateInput } from './types';

export class ExpiryDatesService {
  async create(data: CreateExpiryDateInput) {
    const rawDate = data.date.trim();
    const normalizedDate = data.normalizedDate ? new Date(data.normalizedDate) : new Date(rawDate);

    return prisma.expiryDate.create({
      data: {
        date: rawDate,
        normalizedDate: isNaN(normalizedDate.getTime()) ? new Date() : normalizedDate,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findAll(filter?: ExpiryDateFilter) {
    const where: Prisma.ExpiryDateWhereInput = {};

    if (!filter?.includeDeleted) {
      where.isDeleted = false;
    }

    if (filter?.activeOnly) {
      where.isActive = true;
    }

    if (filter?.minDate) {
      const minDateObj = new Date(filter.minDate);
      if (!isNaN(minDateObj.getTime())) {
        where.normalizedDate = {
          gte: minDateObj,
        };
      }
    }

    return prisma.expiryDate.findMany({
      where,
      orderBy: { normalizedDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const record = await prisma.expiryDate.findUnique({ where: { id } });
    if (!record || record.isDeleted) {
      throw new NotFoundException(`ExpiryDate ${id} not found`);
    }
    return record;
  }

  async findByDate(date: string) {
    return prisma.expiryDate.findUnique({ where: { date: date.trim() } });
  }

  async update(id: string, data: UpdateExpiryDateInput) {
    await this.findOne(id);
    const updateData: Prisma.ExpiryDateUpdateInput = {};

    if (data.date !== undefined) {
      updateData.date = data.date.trim();
    }
    if (data.normalizedDate !== undefined) {
      const norm = new Date(data.normalizedDate);
      updateData.normalizedDate = isNaN(norm.getTime()) ? new Date() : norm;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    return prisma.expiryDate.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return prisma.expiryDate.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async upsertExpiry(dateStr: string, normalizedDate?: Date) {
    const trimmed = dateStr.trim();
    const finalNorm = normalizedDate && !isNaN(normalizedDate.getTime())
      ? normalizedDate
      : new Date(trimmed);

    return prisma.expiryDate.upsert({
      where: { date: trimmed },
      update: {
        normalizedDate: isNaN(finalNorm.getTime()) ? new Date() : finalNorm,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        date: trimmed,
        normalizedDate: isNaN(finalNorm.getTime()) ? new Date() : finalNorm,
        isActive: true,
      },
    });
  }
}

export const expiryDatesService = new ExpiryDatesService();
