import { Controller, Get } from '@nestjs/common';
import { prisma } from 'database';

@Controller('groups')
export class GroupsController {
  @Get()
  async findAll() {
    return prisma.group.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
