import { Router } from 'express';
import { tradesService } from './services';

const router = Router();

router.get('/trades', async (_req, res, next) => {
  try {
    const result = await tradesService.findAll();
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/trades', async (req, res, next) => {
  try {
    const result = await tradesService.create(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.put('/trades/:id', async (req, res, next) => {
  try {
    const result = await tradesService.update(req.params.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/trades/:id', async (req, res, next) => {
  try {
    await tradesService.remove(req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
