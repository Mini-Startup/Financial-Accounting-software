import { prisma } from '../../database';
import { BadRequestException, NotFoundException } from '../../errors';
import { VoucherType } from '@prisma/client';

export class VouchersService {
  async create(data: {
    type: VoucherType;
    date: string | Date;
    remarks?: string | null;
    lines: Array<{
      accountId: string;
      amount: number;
    }>;
  }) {
    if (!data.type || !Object.values(VoucherType).includes(data.type)) {
      throw new BadRequestException('Invalid voucher type. Must be PAYMENT, RECEIPT, JOURNAL, or CONTRA.');
    }

    if (!data.date || isNaN(Date.parse(data.date as string))) {
      throw new BadRequestException('A valid voucher date is required.');
    }

    if (!data.lines || data.lines.length !== 2) {
      throw new BadRequestException('Voucher must contain exactly two rows (double-entry).');
    }

    const [line1, line2] = data.lines;
    
    if (Number(line1.amount) + Number(line2.amount) !== 0) {
      throw new BadRequestException(`Double entry must balance. Sum of amounts must be zero. (Sum: ${Number(line1.amount) + Number(line2.amount)})`);
    }

    // Verify both accounts exist
    const account1 = await prisma.account.findUnique({ where: { id: line1.accountId } });
    if (!account1) {
      throw new BadRequestException(`Account ID ${line1.accountId} does not exist.`);
    }

    const account2 = await prisma.account.findUnique({ where: { id: line2.accountId } });
    if (!account2) {
      throw new BadRequestException(`Account ID ${line2.accountId} does not exist.`);
    }

    // Execute in transaction
    return prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.create({
        data: {
          type: data.type,
          date: new Date(data.date),
          remarks: data.remarks?.trim() || null,
        },
      });

      await tx.voucherLine.createMany({
        data: [
          {
            voucherId: voucher.id,
            accountId: line1.accountId,
            amount: Number(line1.amount),
          },
          {
            voucherId: voucher.id,
            accountId: line2.accountId,
            amount: Number(line2.amount),
          },
        ],
      });

      return tx.voucher.findUnique({
        where: { id: voucher.id },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      });
    });
  }

  async findAll() {
    return prisma.voucher.findMany({
      orderBy: { date: 'desc' },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const voucher = await prisma.voucher.findUnique({ where: { id } });
    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found.`);
    }
    return prisma.voucher.delete({
      where: { id },
    });
  }
}

export const vouchersService = new VouchersService();
