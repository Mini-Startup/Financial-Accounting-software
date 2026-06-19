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
    if (!fromDate) {
      throw new BadRequestException('fromDate is required.');
    }
    if (!toDate) {
      throw new BadRequestException('toDate is required.');
    }

    const result = await ledgerReportService.generateLedgerReport(
      accountId as string,
      fromDate as string,
      toDate as string
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
