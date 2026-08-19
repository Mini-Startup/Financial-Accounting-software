import { prisma } from '../../database';
import { NotFoundException } from '../../errors';

export class LedgerReportService {
  async generateLedgerReport(accountId: string, fromDateStr?: string, toDateStr?: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { group: true },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found.`);
    }

    const baseOpeningBalance = Number(account.openingBalance) || 0;
    let openingBalance = baseOpeningBalance;
    const whereClause: any = { accountId };

    if (fromDateStr) {
      const fromDate = new Date(fromDateStr);
      fromDate.setUTCHours(0, 0, 0, 0);

      // Sum all prior ledger entries (date < fromDate)
      const priorLedgerSum = await prisma.ledger.aggregate({
        _sum: { amount: true },
        where: {
          accountId,
          date: { lt: fromDate },
        },
      });

      const priorEntriesAmount = priorLedgerSum._sum.amount || 0;
      openingBalance = baseOpeningBalance + priorEntriesAmount;

      whereClause.date = { ...(whereClause.date || {}), gte: fromDate };
    }

    if (toDateStr) {
      const toDate = new Date(toDateStr);
      toDate.setUTCHours(23, 59, 59, 999);
      whereClause.date = { ...(whereClause.date || {}), lte: toDate };
    }

    // Fetch Ledger Entries in Date Range (or all if not filtered)
    const ledgerEntries = await prisma.ledger.findMany({
      where: whereClause,
      orderBy: [
        { date: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Build Passbook Statement with Running Balance
    let runningBalance = openingBalance;
    let totalCredit = 0;
    let totalDebit = 0;

    const statement = ledgerEntries.map((entry) => {
      const amount = Number(entry.amount);
      const credit = amount > 0 ? amount : 0;
      const debit = amount < 0 ? Math.abs(amount) : 0;

      totalCredit += credit;
      totalDebit += debit;
      runningBalance += amount;

      return {
        id: entry.id,
        date: entry.date,
        particulars: entry.description || `${entry.entryType} Entry`,
        entryType: entry.entryType,
        type: entry.entryType,
        referenceId: entry.referenceId,
        amount,
        credit,
        debit,
        balance: Number(runningBalance.toFixed(2)),
        runningBalance: Number(runningBalance.toFixed(2)),
      };
    });

    const closingBalance = Number(runningBalance.toFixed(2));

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        group: account.group.name,
        openingBalance: baseOpeningBalance,
      },
      period: {
        fromDate: fromDateStr || null,
        toDate: toDateStr || null,
      },
      openingBalance: Number(openingBalance.toFixed(2)),
      closingBalance,
      totalCredit: Number(totalCredit.toFixed(2)),
      totalDebit: Number(totalDebit.toFixed(2)),
      netMovement: Number((totalCredit - totalDebit).toFixed(2)),
      statement,
      transactions: statement,
    };
  }
}

export const ledgerReportService = new LedgerReportService();
