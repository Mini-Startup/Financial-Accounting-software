import { Router } from 'express';
import { settlementService } from './services';

const router = Router();

router.get('/settlements', async (_req, res, next) => {
  try {
    const result = await settlementService.listSettlements();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/settlements/:id', async (req, res, next) => {
  try {
    const result = await settlementService.getSettlement(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/preview', async (req, res, next) => {
  try {
    const { closingRateDate } = req.body || {};
    if (!closingRateDate) {
      res.status(400).json({ error: 'closingRateDate is required' });
      return;
    }
    const result = await settlementService.previewSettlement(closingRateDate);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/execute', async (req, res, next) => {
  try {
    const { closingRateDate } = req.body || {};
    if (!closingRateDate) {
      res.status(400).json({ error: 'closingRateDate is required' });
      return;
    }
    const result = await settlementService.executeSettlement(closingRateDate);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const dateParam = (req.query.date as string) || (req.query.toDate as string);
    const fromDate = (req.query.fromDate as string) || dateParam;
    const toDate = (req.query.toDate as string) || dateParam;
    const settlementId = req.query.settlementId as string | undefined;

    const result = await settlementService.generateSummary(fromDate, toDate, settlementId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/adjust-trades', async (req, res, next) => {
  try {
    const { reportDate, adjustments } = req.body || {};
    if (!reportDate) {
      res.status(400).json({ error: 'reportDate is required' });
      return;
    }
    const result = await settlementService.adjustTrades({ reportDate, adjustments: adjustments || [] });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/settlements/:id', async (req, res, next) => {
  try {
    const result = await settlementService.deleteSettlement(req.params.id);
    res.json(result);
  } catch (err: any) {
    if (err.message && (err.message.includes('Only the most recent') || err.message.includes('not found'))) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

export default router;
