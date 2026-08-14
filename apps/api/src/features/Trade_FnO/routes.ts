import { Router } from 'express';
import { tradeImportService } from './services';
import fs from 'fs';
import path from 'path';

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
    const result = await tradeImportService.confirmImport(
      req.body.rows,
      req.body.brokerId,
      req.body.exchangeId
    );
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/trade-import/save-debug-sample', async (req, res, next) => {
  try {
    const { fileName, csvContent } = req.body || {};
    if (!csvContent) {
      res.status(400).json({ error: 'csvContent is required' });
      return;
    }

    const dir = path.join(process.cwd(), 'debug_samples');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const targetFile = path.join(dir, `sample_${Date.now()}_${fileName || 'debug'}.csv`);
    fs.writeFileSync(targetFile, csvContent, 'utf8');

    console.log(`[DEBUG SAMPLE CSV SAVED] => ${targetFile}`);
    res.json({ success: true, filePath: targetFile });
  } catch (err) {
    next(err);
  }
});

export default router;
