import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from 'database';

function sanitizeScriptPayload(payload: any) {
  const numberFields = [
    'fldMargin', 'fldMultiplier', 'fldPrice', 'fldDivider', 
    'fldLotSize', 'fldTP'
  ];
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
export class ScriptsService {
  async create(data: Prisma.ScriptUncheckedCreateInput) {
    const payload = { ...data };
    sanitizeScriptPayload(payload);

    return prisma.script.create({
      data: payload as Prisma.ScriptUncheckedCreateInput,
    });
  }

  async findAll(search?: string) {
    const where: Prisma.ScriptWhereInput = {};

    if (search) {
      where.fldScriptName = {
        contains: search,
        mode: 'insensitive',
      };
    }

    return prisma.script.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const script = await prisma.script.findUnique({ where: { id } });
    if (!script) throw new NotFoundException(`Script ${id} not found`);
    return script;
  }

  async update(id: string, data: Prisma.ScriptUpdateInput) {
    const payload = { ...data };
    sanitizeScriptPayload(payload);
    
    return prisma.script.update({
      where: { id },
      data: payload as Prisma.ScriptUpdateInput,
    });
  }

  async remove(id: string) {
    return prisma.script.delete({
      where: { id },
    });
  }
}
