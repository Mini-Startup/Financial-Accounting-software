import { Router } from 'express';
import { tradesService } from './services';
import { requirePermission } from '../../middleware/auth';

const router = Router();

router.get('/trades', requirePermission('TRADES', 'VIEW'), async (req, res, next) => {
  try {
    const result = await tradesService.findAll(req.query as any);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/trades', requirePermission('TRADES', 'CREATE'), async (req, res, next) => {
  try {
    const result = await tradesService.create(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.put('/trades/:id', requirePermission('TRADES', 'EDIT'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await tradesService.update(id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/trades/:id', requirePermission('TRADES', 'DELETE'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await tradesService.remove(id);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
