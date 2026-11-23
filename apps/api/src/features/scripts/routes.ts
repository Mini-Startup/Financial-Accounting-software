import { Router } from 'express';
import { scriptsService } from './services';
import { requirePermission } from '../../middleware/auth';

const router = Router();

router.post('/', requirePermission('SCRIPTS', 'CREATE'), async (req, res, next) => {
  try {
    const result = await scriptsService.create(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.get('/', requirePermission('SCRIPTS', 'VIEW'), async (req, res, next) => {
  try {
    const result = await scriptsService.findAll(req.query.search as string | undefined);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', requirePermission('SCRIPTS', 'VIEW'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await scriptsService.findOne(id);
    res.json(result);
  } catch (err) { next(err); }
});

router.patch('/:id', requirePermission('SCRIPTS', 'EDIT'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await scriptsService.update(id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.put('/:id', requirePermission('SCRIPTS', 'EDIT'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await scriptsService.update(id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/:id', requirePermission('SCRIPTS', 'DELETE'), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await scriptsService.remove(id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
