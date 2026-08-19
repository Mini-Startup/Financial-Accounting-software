import { Router } from 'express';
import { ledgerReportService } from './services';
import { BadRequestException } from '../../errors';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { accountId, fromDate, toDate } = req.query;

    if (!accountId) {
      throw new BadRequestException('accountId is required.');
    }

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
