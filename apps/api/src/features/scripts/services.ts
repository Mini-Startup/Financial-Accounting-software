import { NotFoundException } from '../../errors';
import { prisma, Prisma } from '../../database';

export class ScriptsService {
  async create(data: {
    shortName: string;
    fullName: string;
    isin?: string | null;
    lotSize: number;
    exchangeId?: string | null;
    currencyId?: string | null;
    isActive?: boolean;
    exchangeMappings?: Array<{ exchangeId: string; exchangeScriptCode: string }>;
  }) {
    const { exchangeMappings, ...scriptData } = data;

    return prisma.$transaction(async (tx) => {
      const script = await tx.script.create({
        data: {
          shortName: scriptData.shortName.trim(),
          fullName: scriptData.fullName.trim(),
          isin: scriptData.isin?.trim() || null,
          lotSize: Number(scriptData.lotSize),
          exchangeId: scriptData.exchangeId || null,
          currencyId: scriptData.currencyId || null,
          isActive: scriptData.isActive ?? true,
        },
      });

      if (exchangeMappings && exchangeMappings.length > 0) {
        await tx.scriptExchangeMapping.createMany({
          data: exchangeMappings.map((m) => ({
            scriptId: script.id,
            exchangeId: m.exchangeId,
            exchangeScriptCode: m.exchangeScriptCode.trim(),
          })),
        });
      }

      return tx.script.findUnique({
        where: { id: script.id },
        include: {
          exchange: true,
          currency: true,
          scriptExchangeMappings: {
            include: { exchange: true },
          },
        },
      });
    }, { maxWait: 10000, timeout: 30000 });
  }

  async findAll(search?: string) {
    const where: Prisma.ScriptWhereInput = {};

    if (search) {
      where.fullName = {
        contains: search,
        mode: 'insensitive',
      };
    }

    return prisma.script.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        exchange: true,
        currency: true,
        scriptExchangeMappings: {
          include: { exchange: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const script = await prisma.script.findUnique({
      where: { id },
      include: {
        exchange: true,
        currency: true,
        scriptExchangeMappings: {
          include: { exchange: true },
        },
      },
    });
    if (!script) throw new NotFoundException(`Script ${id} not found`);
    return script;
  }

  async update(
    id: string,
    data: {
      shortName?: string;
      fullName?: string;
      isin?: string | null;
      lotSize?: number;
      exchangeId?: string | null;
      currencyId?: string | null;
      isActive?: boolean;
      exchangeMappings?: Array<{ exchangeId: string; exchangeScriptCode: string }>;
    },
  ) {
    await this.findOne(id); // ensure exists

    const { exchangeMappings, ...scriptData } = data;

    return prisma.$transaction(async (tx) => {
      await tx.script.update({
        where: { id },
        data: {
          ...(scriptData.shortName !== undefined && { shortName: scriptData.shortName.trim() }),
          ...(scriptData.fullName !== undefined && { fullName: scriptData.fullName.trim() }),
          ...(scriptData.isin !== undefined && { isin: scriptData.isin?.trim() || null }),
          ...(scriptData.lotSize !== undefined && { lotSize: Number(scriptData.lotSize) }),
          ...(scriptData.exchangeId !== undefined && { exchangeId: scriptData.exchangeId || null }),
          ...(scriptData.currencyId !== undefined && { currencyId: scriptData.currencyId || null }),
          ...(scriptData.isActive !== undefined && { isActive: scriptData.isActive }),
        },
      });

      if (exchangeMappings !== undefined) {
        // Sync exchange mappings: clear existing and insert new
        await tx.scriptExchangeMapping.deleteMany({
          where: { scriptId: id },
        });

        if (exchangeMappings.length > 0) {
          await tx.scriptExchangeMapping.createMany({
            data: exchangeMappings.map((m) => ({
              scriptId: id,
              exchangeId: m.exchangeId,
              exchangeScriptCode: m.exchangeScriptCode.trim(),
            })),
          });
        }
      }

      return tx.script.findUnique({
        where: { id },
        include: {
          exchange: true,
          currency: true,
          scriptExchangeMappings: {
            include: { exchange: true },
          },
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return prisma.script.delete({
      where: { id },
    });
  }
}

export const scriptsService = new ScriptsService();
