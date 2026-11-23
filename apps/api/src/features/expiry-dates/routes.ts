import { Router } from 'express';
import { expiryDatesService } from './services';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const result = await expiryDatesService.create(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const activeOnly = req.query.activeOnly === 'true' || req.query.active === 'true';
    const minDate = req.query.minDate as string | undefined;
    const includeDeleted = req.query.includeDeleted === 'true';

    const result = await expiryDatesService.findAll({
      activeOnly,
      minDate,
      includeDeleted,
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await expiryDatesService.findOne(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const result = await expiryDatesService.update(req.params.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await expiryDatesService.remove(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
