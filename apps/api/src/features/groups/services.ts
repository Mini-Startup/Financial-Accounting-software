import { prisma } from '../../database';

export class GroupsService {
  async findAll() {
    return prisma.group.findMany({
      orderBy: { name: 'asc' },
    });
  }
}

export const groupsService = new GroupsService();
