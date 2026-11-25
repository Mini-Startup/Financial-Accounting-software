import { Router } from 'express';
import { recycleBinService } from './services';
import { requirePermission } from '../../middleware/auth';

const router = Router();

const canAccessRecycleBin = requirePermission([
  { feature: 'SETTINGS', action: 'VIEW' },
  { feature: 'TRADES', action: 'VIEW' },
  { feature: 'ACCOUNT_MASTER', action: 'VIEW' },
  { feature: 'VOUCHERS', action: 'VIEW' },
  { feature: 'CLOSING_RATES', action: 'VIEW' },
  { feature: 'SCRIPTS', action: 'VIEW' },
]);

const canRestoreItems = requirePermission([
  { feature: 'SETTINGS', action: 'EDIT' },
  { feature: 'TRADES', action: 'CREATE' },
  { feature: 'ACCOUNT_MASTER', action: 'CREATE' },
  { feature: 'VOUCHERS', action: 'CREATE' },
  { feature: 'CLOSING_RATES', action: 'CREATE' },
  { feature: 'SCRIPTS', action: 'CREATE' },
]);

// GET /recycle-bin - List deleted items with filtering & search
router.get('/', canAccessRecycleBin, async (req, res, next) => {
  try {
    const { type, search, fromDate, toDate, limit, offset } = req.query as {
      type?: string;
      search?: string;
      fromDate?: string;
      toDate?: string;
      limit?: string;
      offset?: string;
    };

    const result = await recycleBinService.findAll({
      type,
      search,
      fromDate,
      toDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /recycle-bin/counts - Quick summary counts
router.get('/counts', canAccessRecycleBin, async (_req, res, next) => {
  try {
    const counts = await recycleBinService.getCounts();
    res.json(counts);
  } catch (err) {
    next(err);
  }
});

// POST /recycle-bin/restore - Restore a single deleted item
router.post('/restore', canRestoreItems, async (req, res, next) => {
  try {
    const { entityType, id } = req.body || {};
    if (!entityType || !id) {
      res.status(400).json({ error: 'entityType and id are required' });
      return;
    }

    const restored = await recycleBinService.restoreItem(entityType, id);
    res.json({
      success: true,
      message: `${entityType} restored successfully`,
      data: restored,
    });
  } catch (err) {
    next(err);
  }
});

// POST /recycle-bin/restore-bulk - Restore multiple deleted items
router.post('/restore-bulk', canRestoreItems, async (req, res, next) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items array is required' });
      return;
    }

    const result = await recycleBinService.restoreBulk(items);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
