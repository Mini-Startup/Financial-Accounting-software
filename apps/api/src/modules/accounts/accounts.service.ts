import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from 'database';

function sanitizePayload(payload: any) {
  if (payload.groupId !== undefined && payload.groupId !== null && payload.groupId !== "") {
    payload.groupId = Number(payload.groupId);
  }
  if (payload.isActive !== undefined && payload.isActive !== null) {
    payload.isActive = payload.isActive === true || payload.isActive === 'true';
  }
  return payload;
}

@Injectable()
export class AccountsService {
  async create(data: Prisma.AccountUncheckedCreateInput & { groupName?: string }) {
    const payload = { ...data };
    
    // Map groupName to groupId
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

  async findAll(groupName?: string, search?: string, excludeGroups?: string) {
    const where: Prisma.AccountWhereInput = {};

    if (groupName) {
      where.group = {
        name: {
          equals: groupName,
          mode: 'insensitive'
        }
      };
    }

    if (excludeGroups) {
      const excludedList = excludeGroups.split(',').map(g => g.trim());
      where.group = {
        name: {
          notIn: excludedList,
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
