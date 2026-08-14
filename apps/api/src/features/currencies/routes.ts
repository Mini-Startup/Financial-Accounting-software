import { Router } from 'express';
import { currenciesService } from './services';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const result = await currenciesService.create(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const activeOnly = req.query.active === 'true';
    const result = await currenciesService.findAll(activeOnly);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await currenciesService.findOne(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const result = await currenciesService.update(req.params.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await currenciesService.remove(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
