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
    const result = await expiryDatesService.findAll();
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

router.put('/:id', async (req, res, next) => {
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
