import { Router } from 'express';
import { groupsService } from './services';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const result = await groupsService.findAll();
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
