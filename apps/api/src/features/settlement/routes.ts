import { Router } from 'express';
import { settlementService } from './services';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const fromDate = req.query.fromDate as string;
    const toDate = req.query.toDate as string;

    if (!fromDate || !toDate) {
      res.status(400).json({ error: 'fromDate and toDate are required query parameters' });
      return;
    }

    const result = await settlementService.generateSummary(fromDate, toDate);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
