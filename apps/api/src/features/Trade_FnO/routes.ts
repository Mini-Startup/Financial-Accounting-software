import { Router } from 'express';
import { tradeImportService } from './services';

const router = Router();


router.post('/trade-import/preview', async (req, res, next) => {
  try {
    if (!req.body || !req.body.rows) {
      res.status(400).json({ statusCode: 400, message: 'Rows are required in body' });
      return;
    }
    const result = await tradeImportService.previewRows(req.body.rows);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/trade-import/confirm', async (req, res, next) => {
  try {
    if (!req.body || !req.body.rows) {
      res.status(400).json({ statusCode: 400, message: 'Rows are required in body' });
      return;
    }
    const result = await tradeImportService.confirmImport(req.body.rows);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
