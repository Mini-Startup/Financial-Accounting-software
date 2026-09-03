import { Router } from 'express';
import { trialBalanceService } from './services';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { toDate, fromDate, groupId, category } = req.query;

    const report = await trialBalanceService.generateTrialBalance({
      toDate: toDate ? String(toDate) : undefined,
      fromDate: fromDate ? String(fromDate) : undefined,
      groupId: groupId ? Number(groupId) : undefined,
      category: category ? String(category) : undefined,
    });

    res.json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
