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

    if (!data.lines || data.lines.length < 2) {
      throw new BadRequestException('Voucher must contain at least two rows for double-entry.');
    }

    const totalSum = data.lines.reduce((sum, l) => sum + Number(l.amount || 0), 0);
    if (Math.abs(totalSum) > 0.001) {
      throw new BadRequestException(
        `Double entry must balance. Sum of amounts must be zero. (Current sum: ${totalSum.toFixed(2)})`
      );
    }

    // Verify all accounts exist in 1 single query
    const accountIds = data.lines.map((l) => l.accountId).filter(Boolean);
    if (accountIds.length !== data.lines.length) {
      throw new BadRequestException('All voucher lines must have an account selected.');
    }

    const uniqueAccountIds = Array.from(new Set(accountIds));
    const existingAccounts = await prisma.account.findMany({
      where: { id: { in: uniqueAccountIds } },
      select: { id: true },
    });

    if (existingAccounts.length !== uniqueAccountIds.length) {
      throw new BadRequestException('One or more selected accounts do not exist.');
    }

    const voucherDate = new Date(data.date);

    // Execute in transaction
    return prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.create({
        data: {
          type: data.type,
          date: voucherDate,
          remarks: data.remarks?.trim() || null,
        },
      });

      await tx.voucherLine.createMany({
        data: data.lines.map((l) => ({
          voucherId: voucher.id,
          accountId: l.accountId,
          amount: Number(l.amount),
        })),
      });

      // Post to Ledger table for each line
      for (const line of data.lines) {
        await tx.ledger.create({
          data: {
            accountId: line.accountId,
            date: voucherDate,
            amount: Number(Number(line.amount).toFixed(2)),
            entryType: 'VOUCHER',
            description: `Voucher: ${data.type}${data.remarks ? ` - ${data.remarks}` : ''}`,
            referenceId: voucher.id,
          },
        });
      }

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

    return prisma.$transaction(async (tx) => {
      // Remove ledger entries first
      await tx.ledger.deleteMany({
        where: {
          referenceId: id,
          entryType: 'VOUCHER',
        },
      });

      return tx.voucher.delete({
        where: { id },
      });
    });
  }
}

export const vouchersService = new VouchersService();
