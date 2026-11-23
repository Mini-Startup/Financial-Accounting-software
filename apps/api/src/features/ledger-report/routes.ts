import { Router } from 'express';
import { ledgerReportService } from './services';
import { BadRequestException } from '../../errors';
import { requirePermission } from '../../middleware/auth';

const router = Router();

router.get('/', requirePermission('LEDGER', 'VIEW'), async (req, res, next) => {
  try {
    const { accountId, fromDate, toDate } = req.query;

    if (!accountId) {
      throw new BadRequestException('accountId is required.');
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const result = await ledgerReportService.generateLedgerReport(
      accountId as string,
      fromDate ? (fromDate as string) : undefined,
      toDate ? (toDate as string) : undefined
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
