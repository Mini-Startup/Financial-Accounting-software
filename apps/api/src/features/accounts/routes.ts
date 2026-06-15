import { Router } from 'express';
import { accountsService } from './services';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const result = await accountsService.create(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const { group, search, excludeGroups } = req.query;
    const result = await accountsService.findAll(
      group as string | undefined,
      search as string | undefined,
      excludeGroups as string | undefined,
    );
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await accountsService.findOne(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const result = await accountsService.update(req.params.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await accountsService.remove(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
