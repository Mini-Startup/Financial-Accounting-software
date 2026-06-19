import { prisma } from '../../database';
import { NotFoundException } from '../../errors';
import { settlementService } from '../settlement/services';

export class LedgerReportService {
  async generateLedgerReport(accountId: string, fromDateStr: string, toDateStr: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { group: true },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found.`);
    }

    const fromDate = new Date(fromDateStr);
    fromDate.setUTCHours(0, 0, 0, 0);

    const toDate = new Date(toDateStr);
    toDate.setUTCHours(23, 59, 59, 999);

    // ── 1. Calculate Opening Balance before fromDate ─────────────────
    let openingVoucherBalance = 0;
    let openingTradePnL = 0;

    // Sum voucher lines before fromDate
    const openingVoucherSum = await prisma.voucherLine.aggregate({
      _sum: { amount: true },
      where: {
        accountId,
        voucher: {
          date: { lt: fromDate },
        },
      },
    });
    openingVoucherBalance = openingVoucherSum._sum.amount || 0;

    // Sum trade realized P&L before fromDate
    const earliestTrade = await prisma.trade.findFirst({
      orderBy: { tradeDate: 'asc' },
    });

    if (earliestTrade) {
      const earliestTradeDate = new Date(earliestTrade.tradeDate);
      earliestTradeDate.setUTCHours(0, 0, 0, 0);

      // Only calculate if fromDate is after earliest trade date
      if (fromDate > earliestTradeDate) {
        const yesterday = new Date(fromDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const earliestDateStr = earliestTradeDate.toISOString().split('T')[0];

        try {
          const openingSummary = await settlementService.generateSummary(earliestDateStr, yesterdayStr);
          const myOpeningSummary = openingSummary.filter((item) => item.accountId === accountId);
          openingTradePnL = myOpeningSummary.reduce((sum, item) => sum + item.realizedPnL, 0);
        } catch (err) {
          console.error('Error calculating opening trade P&L:', err);
        }
      }
    }

    const openingBalance = openingVoucherBalance + openingTradePnL;

    // ── 2. Fetch Voucher Transactions in Range ───────────────────────
    const voucherLines = await prisma.voucherLine.findMany({
      where: {
        accountId,
        voucher: {
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
      },
      include: {
        voucher: true,
      },
    });

    const voucherTransactions = voucherLines.map((line) => ({
      date: line.voucher.date,
      particulars: `Voucher: ${line.voucher.type}${line.voucher.remarks ? ` - ${line.voucher.remarks}` : ''}`,
      type: line.voucher.type.toString(),
      amount: line.amount,
    }));

    // ── 3. Fetch Trade Settlement Transactions in Range ───────────────
    let tradeTransactions: Array<{
      date: Date;
      particulars: string;
      type: string;
      amount: number;
    }> = [];

    try {
      const rangeSummary = await settlementService.generateSummary(fromDateStr, toDateStr);
      const myRangeSummary = rangeSummary.filter((item) => item.accountId === accountId);

      tradeTransactions = myRangeSummary.map((item) => ({
        date: toDate, // Default trade settlement transaction to end of period
        particulars: `Trade Profit/Loss: ${item.scriptShortName} (${item.exchangeCode})${item.expiry ? ` Exp: ${item.expiry}` : ''}`,
        type: 'TRADE',
        amount: item.realizedPnL,
      }));
    } catch (err) {
      console.error('Error calculating range trade P&L:', err);
    }

    // ── 4. Combine, Sort and Calculate Running Balance ───────────────
    const allTransactions = [...voucherTransactions, ...tradeTransactions];
    
    // Sort chronologically
    allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = openingBalance;
    const ledgerRows = allTransactions.map((tx) => {
      running += tx.amount;
      return {
        ...tx,
        runningBalance: Number(running.toFixed(4)),
      };
    });

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        group: account.group.name,
      },
      openingBalance: Number(openingBalance.toFixed(4)),
      closingBalance: Number(running.toFixed(4)),
      transactions: ledgerRows,
    };
  }
}

export const ledgerReportService = new LedgerReportService();
