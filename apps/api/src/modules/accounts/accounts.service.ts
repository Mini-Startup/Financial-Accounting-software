import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from 'database';

function sanitizePayload(payload: any) {
  const numberFields = ['openingBalance', 'closingBalance', 'multiplier', 'divider', 'tickPrice', 'lotSize'];
  for (const field of numberFields) {
    if (payload[field] === "") {
      payload[field] = null;
    } else if (payload[field] !== undefined && payload[field] !== null) {
      payload[field] = Number(payload[field]);
    }
  }
  return payload;
}

@Injectable()
export class AccountsService {
  async create(data: Prisma.AccountUncheckedCreateInput & { groupName?: string }) {
    const payload = { ...data };
    if (payload.groupName) {
      const group = await prisma.group.upsert({
        where: { name: payload.groupName },
        update: {},
        create: { name: payload.groupName }
      });
      payload.groupId = group.id;
      delete payload.groupName;
    }
    
    sanitizePayload(payload);

    return prisma.account.create({
      data: payload as Prisma.AccountUncheckedCreateInput,
    });
  }

  async findAll(groupName?: string, search?: string) {
    const where: Prisma.AccountWhereInput = {};

    if (groupName) {
      where.group = {
        name: {
          equals: groupName,
          mode: 'insensitive'
        }
      };
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    return prisma.account.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        group: true
      }
    });
  }

  async findOne(id: string) {
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        group: true
      }
    });
    if (!account) throw new NotFoundException(`Account ${id} not found`);
    return account;
  }

  async update(id: string, data: Prisma.AccountUpdateInput) {
    const payload = { ...data };
    sanitizePayload(payload);
    return prisma.account.update({
      where: { id },
      data: payload as Prisma.AccountUpdateInput,
    });
  }

  async remove(id: string) {
    return prisma.account.delete({
      where: { id },
    });
  }
}
