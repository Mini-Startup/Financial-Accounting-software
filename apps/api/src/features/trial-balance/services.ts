import { prisma } from '../../database';

export interface TrialBalanceAccountRow {
  id: string;
  code: string;
  name: string;
  groupId: number;
  groupName: string;
  category: 'CLIENT' | 'BROKER' | 'ACCOUNT_MASTER';
  categoryLabel: string;
  openingBalance: number;
  openingType: 'Dr' | 'Cr' | 'Nil';
  periodDebit: number;
  periodCredit: number;
  netMovement: number;
  closingDebit: number;
  closingCredit: number;
  netClosingBalance: number;
  closingType: 'Dr' | 'Cr' | 'Nil';
}

export interface TrialBalanceCategorySummary {
  category: 'CLIENT' | 'BROKER' | 'ACCOUNT_MASTER';
  categoryLabel: string;
  accountCount: number;
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  netBalance: number;
}

export interface TrialBalanceGroupSummary {
  groupId: number;
  groupName: string;
  category: 'CLIENT' | 'BROKER' | 'ACCOUNT_MASTER';
  accountCount: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
  netBalance: number;
}

export interface TrialBalanceReport {
  asOfDate: string | null;
  fromDate: string | null;
  toDate: string | null;
  summary: {
    totalAccounts: number;
    activeAccounts: number;
    grandTotalOpeningDebit: number;
    grandTotalOpeningCredit: number;
    grandTotalPeriodDebit: number;
    grandTotalPeriodCredit: number;
    grandTotalClosingDebit: number;
    grandTotalClosingCredit: number;
    difference: number;
    isBalanced: boolean;
  };
  categories: TrialBalanceCategorySummary[];
  groups: TrialBalanceGroupSummary[];
  rows: TrialBalanceAccountRow[];
}

export class TrialBalanceService {
  async generateTrialBalance(options?: {
    toDate?: string;
    fromDate?: string;
    groupId?: number;
    category?: string;
  }): Promise<TrialBalanceReport> {
    const { toDate: toDateStr, fromDate: fromDateStr, groupId, category } = options || {};

    // 1. Fetch all accounts with groups
    const accounts = await prisma.account.findMany({
      include: { group: true },
      orderBy: [
        { group: { name: 'asc' } },
        { code: 'asc' },
      ],
    });

    // 2. Fetch relevant ledger entries
    const ledgerWhere: any = {};
    if (toDateStr) {
      const toDate = new Date(toDateStr);
      toDate.setUTCHours(23, 59, 59, 999);
      ledgerWhere.date = { ...(ledgerWhere.date || {}), lte: toDate };
    }
    if (fromDateStr) {
      const fromDate = new Date(fromDateStr);
      fromDate.setUTCHours(0, 0, 0, 0);
      ledgerWhere.date = { ...(ledgerWhere.date || {}), gte: fromDate };
    }

    const ledgerEntries = await prisma.ledger.findMany({
      where: ledgerWhere,
      select: {
        accountId: true,
        amount: true,
        date: true,
      },
    });

    // 3. Aggregate ledger entries per account
    const ledgerMap = new Map<string, { totalDebit: number; totalCredit: number; netMovement: number }>();
    for (const entry of ledgerEntries) {
      const accId = entry.accountId;
      if (!ledgerMap.has(accId)) {
        ledgerMap.set(accId, { totalDebit: 0, totalCredit: 0, netMovement: 0 });
      }
      const stat = ledgerMap.get(accId)!;
      const amt = Number(entry.amount);
      if (amt > 0) {
        stat.totalCredit += amt;
      } else if (amt < 0) {
        stat.totalDebit += Math.abs(amt);
      }
      stat.netMovement += amt;
    }

    // 4. Build Account Rows
    const rows: TrialBalanceAccountRow[] = [];

    for (const account of accounts) {
      const gName = account.group?.name || 'Unassigned';
      let rowCategory: 'CLIENT' | 'BROKER' | 'ACCOUNT_MASTER' = 'ACCOUNT_MASTER';
      let categoryLabel = 'Other Account Masters';

      if (gName === 'Sundry Debtors') {
        rowCategory = 'CLIENT';
        categoryLabel = 'Clients (Sundry Debtors)';
      } else if (gName === 'Sundry Creditors') {
        rowCategory = 'BROKER';
        categoryLabel = 'Brokers (Sundry Creditors)';
      }

      // Filter by group or category if requested
      if (groupId && account.groupId !== groupId) continue;
      if (category && category !== 'ALL') {
        if (category.toUpperCase() === 'CLIENT' && rowCategory !== 'CLIENT') continue;
        if (category.toUpperCase() === 'BROKER' && rowCategory !== 'BROKER') continue;
        if (category.toUpperCase() === 'ACCOUNT_MASTER' && rowCategory !== 'ACCOUNT_MASTER') continue;
      }

      const stat = ledgerMap.get(account.id) || { totalDebit: 0, totalCredit: 0, netMovement: 0 };
      const openingBal = Number(account.openingBalance) || 0;
      const netClosingBalance = Number((openingBal + stat.netMovement).toFixed(2));

      const periodDebit = Number(stat.totalDebit.toFixed(2));
      const periodCredit = Number(stat.totalCredit.toFixed(2));

      const closingDebit = netClosingBalance < 0 ? Math.abs(netClosingBalance) : 0;
      const closingCredit = netClosingBalance > 0 ? netClosingBalance : 0;

      const openingType: 'Dr' | 'Cr' | 'Nil' = openingBal < 0 ? 'Dr' : openingBal > 0 ? 'Cr' : 'Nil';
      const closingType: 'Dr' | 'Cr' | 'Nil' = netClosingBalance < 0 ? 'Dr' : netClosingBalance > 0 ? 'Cr' : 'Nil';

      rows.push({
        id: account.id,
        code: account.code,
        name: account.name,
        groupId: account.groupId,
        groupName: gName,
        category: rowCategory,
        categoryLabel,
        openingBalance: openingBal,
        openingType,
        periodDebit,
        periodCredit,
        netMovement: Number(stat.netMovement.toFixed(2)),
        closingDebit: Number(closingDebit.toFixed(2)),
        closingCredit: Number(closingCredit.toFixed(2)),
        netClosingBalance,
        closingType,
      });
    }

    // 5. Category Summaries & Group Summaries
    const categoryMap = new Map<'CLIENT' | 'BROKER' | 'ACCOUNT_MASTER', TrialBalanceCategorySummary>([
      [
        'CLIENT',
        {
          category: 'CLIENT',
          categoryLabel: 'Clients (Sundry Debtors)',
          accountCount: 0,
          totalOpeningDebit: 0,
          totalOpeningCredit: 0,
          totalPeriodDebit: 0,
          totalPeriodCredit: 0,
          totalClosingDebit: 0,
          totalClosingCredit: 0,
          netBalance: 0,
        },
      ],
      [
        'BROKER',
        {
          category: 'BROKER',
          categoryLabel: 'Brokers (Sundry Creditors)',
          accountCount: 0,
          totalOpeningDebit: 0,
          totalOpeningCredit: 0,
          totalPeriodDebit: 0,
          totalPeriodCredit: 0,
          totalClosingDebit: 0,
          totalClosingCredit: 0,
          netBalance: 0,
        },
      ],
      [
        'ACCOUNT_MASTER',
        {
          category: 'ACCOUNT_MASTER',
          categoryLabel: 'Other Account Masters',
          accountCount: 0,
          totalOpeningDebit: 0,
          totalOpeningCredit: 0,
          totalPeriodDebit: 0,
          totalPeriodCredit: 0,
          totalClosingDebit: 0,
          totalClosingCredit: 0,
          netBalance: 0,
        },
      ],
    ]);

    const groupSummaryMap = new Map<number, TrialBalanceGroupSummary>();

    let grandTotalOpeningDebit = 0;
    let grandTotalOpeningCredit = 0;
    let grandTotalPeriodDebit = 0;
    let grandTotalPeriodCredit = 0;
    let grandTotalClosingDebit = 0;
    let grandTotalClosingCredit = 0;
    let activeAccounts = 0;

    for (const r of rows) {
      if (r.closingDebit > 0 || r.closingCredit > 0 || r.periodDebit > 0 || r.periodCredit > 0 || r.openingBalance !== 0) {
        activeAccounts++;
      }

      const opDr = r.openingBalance < 0 ? Math.abs(r.openingBalance) : 0;
      const opCr = r.openingBalance > 0 ? r.openingBalance : 0;

      grandTotalOpeningDebit += opDr;
      grandTotalOpeningCredit += opCr;
      grandTotalPeriodDebit += r.periodDebit;
      grandTotalPeriodCredit += r.periodCredit;
      grandTotalClosingDebit += r.closingDebit;
      grandTotalClosingCredit += r.closingCredit;

      // Category Summary
      const catSum = categoryMap.get(r.category);
      if (catSum) {
        catSum.accountCount++;
        catSum.totalOpeningDebit += opDr;
        catSum.totalOpeningCredit += opCr;
        catSum.totalPeriodDebit += r.periodDebit;
        catSum.totalPeriodCredit += r.periodCredit;
        catSum.totalClosingDebit += r.closingDebit;
        catSum.totalClosingCredit += r.closingCredit;
        catSum.netBalance += r.netClosingBalance;
      }

      // Group Summary
      if (!groupSummaryMap.has(r.groupId)) {
        groupSummaryMap.set(r.groupId, {
          groupId: r.groupId,
          groupName: r.groupName,
          category: r.category,
          accountCount: 0,
          totalClosingDebit: 0,
          totalClosingCredit: 0,
          netBalance: 0,
        });
      }
      const grpSum = groupSummaryMap.get(r.groupId)!;
      grpSum.accountCount++;
      grpSum.totalClosingDebit += r.closingDebit;
      grpSum.totalClosingCredit += r.closingCredit;
      grpSum.netBalance += r.netClosingBalance;
    }

    const difference = Number(Math.abs(grandTotalClosingDebit - grandTotalClosingCredit).toFixed(2));
    const isBalanced = difference < 0.01;

    return {
      asOfDate: toDateStr || new Date().toISOString().split('T')[0],
      fromDate: fromDateStr || null,
      toDate: toDateStr || null,
      summary: {
        totalAccounts: rows.length,
        activeAccounts,
        grandTotalOpeningDebit: Number(grandTotalOpeningDebit.toFixed(2)),
        grandTotalOpeningCredit: Number(grandTotalOpeningCredit.toFixed(2)),
        grandTotalPeriodDebit: Number(grandTotalPeriodDebit.toFixed(2)),
        grandTotalPeriodCredit: Number(grandTotalPeriodCredit.toFixed(2)),
        grandTotalClosingDebit: Number(grandTotalClosingDebit.toFixed(2)),
        grandTotalClosingCredit: Number(grandTotalClosingCredit.toFixed(2)),
        difference,
        isBalanced,
      },
      categories: Array.from(categoryMap.values()).map((c) => ({
        ...c,
        totalOpeningDebit: Number(c.totalOpeningDebit.toFixed(2)),
        totalOpeningCredit: Number(c.totalOpeningCredit.toFixed(2)),
        totalPeriodDebit: Number(c.totalPeriodDebit.toFixed(2)),
        totalPeriodCredit: Number(c.totalPeriodCredit.toFixed(2)),
        totalClosingDebit: Number(c.totalClosingDebit.toFixed(2)),
        totalClosingCredit: Number(c.totalClosingCredit.toFixed(2)),
        netBalance: Number(c.netBalance.toFixed(2)),
      })),
      groups: Array.from(groupSummaryMap.values()).map((g) => ({
        ...g,
        totalClosingDebit: Number(g.totalClosingDebit.toFixed(2)),
        totalClosingCredit: Number(g.totalClosingCredit.toFixed(2)),
        netBalance: Number(g.netBalance.toFixed(2)),
      })),
      rows,
    };
  }
}

export const trialBalanceService = new TrialBalanceService();
