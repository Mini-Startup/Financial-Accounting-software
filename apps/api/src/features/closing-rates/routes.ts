import { Router } from 'express';
import { closingRatesService } from './services';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const result = await closingRatesService.create(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await closingRatesService.findAll(req.query.search as string | undefined);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await closingRatesService.findOne(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const result = await closingRatesService.update(req.params.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await closingRatesService.update(req.params.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await closingRatesService.remove(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
