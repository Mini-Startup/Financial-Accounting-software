import { Router } from 'express';
import { brokeragesService } from './services';

const router = Router();

/**
 * POST /brokerages/calculate
 */
router.post('/calculate', async (req, res, next) => {
  try {
    const result = await brokeragesService.calculate(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

/**
 * GET /brokerages/resolve
 */
router.get('/resolve', async (req, res, next) => {
  try {
    const { accountId, exchangeId, appliesTo, scriptId } = req.query;
    const result = await brokeragesService.resolve(
      accountId as string,
      exchangeId as string,
      appliesTo as 'CLIENT' | 'BROKER',
      scriptId as string | undefined,
    );
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const result = await brokeragesService.create(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const { accountId, exchangeId, appliesTo } = req.query;
    const result = await brokeragesService.findAll({
      accountId: accountId as string | undefined,
      exchangeId: exchangeId as string | undefined,
      appliesTo: appliesTo as string | undefined,
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await brokeragesService.findOne(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const result = await brokeragesService.update(req.params.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await brokeragesService.remove(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
