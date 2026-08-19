import { NotFoundException, BadRequestException } from '../../errors';
import { prisma, Prisma } from '../../database';

async function sanitizeAndPrepareAccountData(rawData: any, isUpdate = false) {
  const data = { ...rawData };

  // Resolve groupName -> groupId if groupName is provided
  if (data.groupName) {
    const trimmedGroupName = String(data.groupName).trim();
    if (trimmedGroupName) {
      const group = await prisma.group.upsert({
        where: { name: trimmedGroupName },
        update: {},
        create: { name: trimmedGroupName },
      });
      data.groupId = group.id;
    }
  }

  const clean: any = {};

  if (data.code !== undefined && data.code !== null) {
    clean.code = String(data.code).trim();
  }
  if (data.name !== undefined && data.name !== null) {
    clean.name = String(data.name).trim();
  }
  if (data.groupId !== undefined && data.groupId !== null && data.groupId !== '') {
    clean.groupId = Number(data.groupId);
  }

  // Opening Balance normalization
  if (data.openingBalance !== undefined) {
    if (data.openingBalance === null || data.openingBalance === '' || isNaN(Number(data.openingBalance))) {
      clean.openingBalance = 0;
    } else {
      clean.openingBalance = Number(Number(data.openingBalance).toFixed(4));
    }
  } else if (!isUpdate) {
    clean.openingBalance = 0;
  }

  // Booleans
  if (data.isActive !== undefined) {
    clean.isActive = data.isActive === true || data.isActive === 'true';
  }
  if (data.isDirectClient !== undefined) {
    clean.isDirectClient = data.isDirectClient === true || data.isDirectClient === 'true';
  }

  // Direct client dealer code rule
  if (clean.isDirectClient) {
    clean.dealerCode = clean.code || (data.code ? String(data.code).trim() : null);
  } else if (data.dealerCode !== undefined) {
    clean.dealerCode = data.dealerCode ? String(data.dealerCode).trim() : null;
  }

  // Nullable string fields
  const stringFields = [
    'address',
    'mobileNumber',
    'officeNumber',
    'whatsappNumber',
    'email',
    'contactPersonName',
    'contactPersonMobile',
    'contactPersonEmail',
    'referenceName',
    'referenceMobile',
    'referenceEmail',
    'bankName',
    'bankBranch',
    'ifscCode',
    'micrCode',
    'bankAccountNumber',
    'upiId',
  ];

  for (const field of stringFields) {
    if (data[field] !== undefined) {
      clean[field] = data[field] ? String(data[field]).trim() : null;
    }
  }

  return clean;
}

export class AccountMastersService {
  async create(data: any) {
    const cleanData = await sanitizeAndPrepareAccountData(data, false);

    if (!cleanData.code) {
      throw new BadRequestException('Account Code is required');
    }
    if (!cleanData.name) {
      throw new BadRequestException('Account Name is required');
    }
    if (!cleanData.groupId) {
      throw new BadRequestException('Account Group is required');
    }

    return prisma.account.create({
      data: cleanData as Prisma.AccountUncheckedCreateInput,
      include: {
        group: true,
      },
    });
  }

  async findAll(groupName?: string, search?: string, excludeGroups?: string, directOnly?: boolean) {
    const where: Prisma.AccountWhereInput = {};

    if (groupName) {
      where.group = {
        name: {
          equals: groupName,
          mode: 'insensitive',
        },
      };
    }

    if (excludeGroups) {
      const excludedList = excludeGroups.split(',').map((g) => g.trim());
      where.group = {
        name: {
          notIn: excludedList,
          mode: 'insensitive',
        },
      };
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (directOnly) {
      where.isDirectClient = true;
    }

    return prisma.account.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        group: true,
      },
    });
  }

  async findOne(id: string) {
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        group: true,
      },
    });
    if (!account) throw new NotFoundException(`Account ${id} not found`);
    return account;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    const cleanData = await sanitizeAndPrepareAccountData(data, true);

    return prisma.account.update({
      where: { id },
      data: cleanData as Prisma.AccountUpdateInput,
      include: {
        group: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return prisma.account.delete({
      where: { id },
    });
  }
}

export const accountMastersService = new AccountMastersService();
