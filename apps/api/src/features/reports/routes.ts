import { Router, Request, Response, NextFunction } from 'express';
import { requirePermission } from '../../middleware/auth';
import { ReportsService, ensureReportPermissions } from './services';
import { GroupByDimension, TradeClassification } from './types';

const router = Router();

// Lazy auto-seed permission keys on first load
ensureReportPermissions().catch((err) => {
  console.warn('[ReportsRouter] ensureReportPermissions error:', err);
});

/**
 * GET /reports/net-position
 * Open positions exposure report grouped by Client, Broker, or Script.
 */
router.get(
  '/net-position',
  requirePermission('REPORTS', 'VIEW'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { groupBy, accountId, brokerId, scriptId, asOfDate } = req.query;

      const validGroupBy: GroupByDimension =
        groupBy === 'BROKER' || groupBy === 'SCRIPT' ? (groupBy as GroupByDimension) : 'CLIENT';

      const result = await ReportsService.getNetPosition({
        groupBy: validGroupBy,
        accountId: typeof accountId === 'string' ? accountId : undefined,
        brokerId: typeof brokerId === 'string' ? brokerId : undefined,
        scriptId: typeof scriptId === 'string' ? scriptId : undefined,
        asOfDate: typeof asOfDate === 'string' ? asOfDate : undefined,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /reports/settlement-detail
 * Exhaustive audit trail of all trades contributing to a settlement cycle.
 */
router.get(
  '/settlement-detail',
  requirePermission('REPORTS', 'VIEW'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { settlementId, fromDate, toDate, tradeType, clientId, brokerId } = req.query;

      const result = await ReportsService.getSettlementAudit({
        settlementId: typeof settlementId === 'string' ? settlementId : undefined,
        fromDate: typeof fromDate === 'string' ? fromDate : undefined,
        toDate: typeof toDate === 'string' ? toDate : undefined,
        tradeType: typeof tradeType === 'string' ? (tradeType as 'ALL' | TradeClassification) : undefined,
        clientId: typeof clientId === 'string' ? clientId : undefined,
        brokerId: typeof brokerId === 'string' ? brokerId : undefined,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /reports/settlement-summary
 * Executive double-entry clearing sheet with client, broker, and firm reconciliation.
 */
router.get(
  '/settlement-summary',
  requirePermission('REPORTS', 'VIEW'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { settlementId, fromDate, toDate } = req.query;

      const result = await ReportsService.getSettlementSummary({
        settlementId: typeof settlementId === 'string' ? settlementId : undefined,
        fromDate: typeof fromDate === 'string' ? fromDate : undefined,
        toDate: typeof toDate === 'string' ? toDate : undefined,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
