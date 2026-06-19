import { Router } from 'express';
import { vouchersService } from './services';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const result = await vouchersService.create(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await vouchersService.findAll();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await vouchersService.remove(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
