import { Router } from 'express';
import { exchangesService } from './services';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const result = await exchangesService.create(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const activeOnly = req.query.active === 'true';
    const result = await exchangesService.findAll(activeOnly);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await exchangesService.findOne(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const result = await exchangesService.update(req.params.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await exchangesService.remove(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
