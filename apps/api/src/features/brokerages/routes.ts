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
    const { accountId, appliesTo, scriptId, direction } = req.query;
    const result = await brokeragesService.resolve(
      accountId as string,
      appliesTo as 'CLIENT' | 'BROKER',
      scriptId as string | undefined,
      direction as 'BUY' | 'SELL' | undefined,
    );
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/bulk', async (req, res, next) => {
  try {
    const rules = Array.isArray(req.body) ? req.body : req.body.rules;
    const result = await brokeragesService.upsertBulk(rules);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/bulk-delete', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body) ? req.body : req.body.ids;
    const result = await brokeragesService.removeBulk(ids);
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
    const { accountId, appliesTo, scriptId } = req.query;
    const result = await brokeragesService.findAll({
      accountId: accountId as string | undefined,
      appliesTo: appliesTo as string | undefined,
      scriptId: scriptId as string | undefined,
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
