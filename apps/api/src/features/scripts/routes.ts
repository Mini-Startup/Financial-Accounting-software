import { Router } from 'express';
import { scriptsService } from './services';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const result = await scriptsService.create(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await scriptsService.findAll(req.query.search as string | undefined);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await scriptsService.findOne(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const result = await scriptsService.update(req.params.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await scriptsService.update(req.params.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await scriptsService.remove(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
