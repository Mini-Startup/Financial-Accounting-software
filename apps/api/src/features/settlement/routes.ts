import { Router } from 'express';
import { settlementService } from './services';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const dateParam = (req.query.date as string) || (req.query.toDate as string);
    const fromDate = (req.query.fromDate as string) || dateParam;
    const toDate = (req.query.toDate as string) || dateParam;

    if (!fromDate || !toDate) {
      res.status(400).json({ error: 'date (or fromDate and toDate) is required' });
      return;
    }

    const result = await settlementService.generateSummary(fromDate, toDate);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/adjust-trades', async (req, res, next) => {
  try {
    const { reportDate, adjustments } = req.body || {};
    if (!reportDate || !Array.isArray(adjustments) || adjustments.length === 0) {
      res.status(400).json({ error: 'reportDate and adjustments array are required' });
      return;
    }
    const result = await settlementService.adjustTrades({ reportDate, adjustments });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
