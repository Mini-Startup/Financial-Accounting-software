import { Router } from 'express';
import { vouchersService } from './services';
import { requirePermission } from '../../middleware/auth';

const router = Router();

router.post('/', requirePermission('VOUCHERS', 'CREATE'), async (req, res, next) => {
  try {
    const result = await vouchersService.create(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/', requirePermission('VOUCHERS', 'VIEW'), async (req, res, next) => {
  try {
    const result = await vouchersService.findAll();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requirePermission('VOUCHERS', 'DELETE'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await vouchersService.remove(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
