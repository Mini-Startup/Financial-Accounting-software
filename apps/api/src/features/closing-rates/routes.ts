import { Router } from 'express';
import { closingRatesService } from './services';
import { requirePermission } from '../../middleware/auth';

const router = Router();

router.post('/', requirePermission('CLOSING_RATES', 'CREATE'), async (req, res, next) => {
  try {
    const result = await closingRatesService.create(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.post('/bulk-import', requirePermission('CLOSING_RATES', 'IMPORT'), async (req, res, next) => {
  try {
    const { rates } = req.body || {};
    if (!Array.isArray(rates) || rates.length === 0) {
      res.status(400).json({ error: 'rates array is required' });
      return;
    }
    const result = await closingRatesService.bulkUpsert(rates);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/check-duplicates', requirePermission('CLOSING_RATES', 'IMPORT'), async (req, res, next) => {
  try {
    const { rates } = req.body || {};
    if (!Array.isArray(rates) || rates.length === 0) {
      res.status(400).json({ error: 'rates array is required' });
      return;
    }
    const result = await closingRatesService.checkDuplicates(rates);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/', requirePermission('CLOSING_RATES', 'VIEW'), async (req, res, next) => {
  try {
    const { search, date, fromDate, toDate, scriptId, exchangeId } = req.query as {
      search?: string;
      date?: string;
      fromDate?: string;
      toDate?: string;
      scriptId?: string;
      exchangeId?: string;
    };
    const result = await closingRatesService.findAll({ search, date, fromDate, toDate, scriptId, exchangeId });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', requirePermission('CLOSING_RATES', 'VIEW'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await closingRatesService.findOne(id);
    res.json(result);
  } catch (err) { next(err); }
});

router.patch('/:id', requirePermission('CLOSING_RATES', 'EDIT'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await closingRatesService.update(id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.put('/:id', requirePermission('CLOSING_RATES', 'EDIT'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await closingRatesService.update(id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/:id', requirePermission('CLOSING_RATES', 'DELETE'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await closingRatesService.remove(id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
