import { Router } from 'express';
import { settlementService } from './services';
import { requirePermission } from '../../middleware/auth';

const router = Router();

router.get('/settlements', requirePermission('SETTLEMENT', 'VIEW'), async (_req, res, next) => {
  try {
    const result = await settlementService.listSettlements();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/settlements/:id', requirePermission('SETTLEMENT', 'VIEW'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await settlementService.getSettlement(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/preview', requirePermission('SETTLEMENT', 'PREVIEW'), async (req, res, next) => {
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

router.post('/execute', requirePermission('SETTLEMENT', 'EXECUTE'), async (req, res, next) => {
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

router.get('/', requirePermission('SETTLEMENT', 'VIEW'), async (req, res, next) => {
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

router.post('/adjust-trades', requirePermission('SETTLEMENT', 'EXECUTE'), async (req, res, next) => {
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

router.delete('/settlements/:id', requirePermission('SETTLEMENT', 'DELETE'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await settlementService.deleteSettlement(id);
    res.json(result);
  } catch (err: any) {
    if (err.message && (err.message.includes('Only the most recent') || err.message.includes('not found') || err.message.includes('Cannot delete'))) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

export default router;
