import { Router } from 'express';
import { accountMastersService } from './services';
import { requirePermission } from '../../middleware/auth';

const router = Router();

const canViewAccounts = requirePermission([
  { feature: 'ACCOUNT_MASTER', action: 'VIEW' },
  { feature: 'BROKERS', action: 'VIEW' },
  { feature: 'CLIENTS', action: 'VIEW' },
]);

const canCreateAccounts = requirePermission([
  { feature: 'ACCOUNT_MASTER', action: 'CREATE' },
  { feature: 'BROKERS', action: 'CREATE' },
  { feature: 'CLIENTS', action: 'CREATE' },
]);

const canEditAccounts = requirePermission([
  { feature: 'ACCOUNT_MASTER', action: 'EDIT' },
  { feature: 'BROKERS', action: 'EDIT' },
  { feature: 'CLIENTS', action: 'EDIT' },
]);

const canDeleteAccounts = requirePermission([
  { feature: 'ACCOUNT_MASTER', action: 'DELETE' },
  { feature: 'BROKERS', action: 'DELETE' },
  { feature: 'CLIENTS', action: 'DELETE' },
]);

router.post('/', canCreateAccounts, async (req, res, next) => {
  try {
    const result = await accountMastersService.create(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.get('/', canViewAccounts, async (req, res, next) => {
  try {
    const { group, search, excludeGroups, directOnly } = req.query;
    const result = await accountMastersService.findAll(
      group as string | undefined,
      search as string | undefined,
      excludeGroups as string | undefined,
      directOnly === 'true'
    );
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', canViewAccounts, async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await accountMastersService.findOne(id);
    res.json(result);
  } catch (err) { next(err); }
});

router.patch('/:id', canEditAccounts, async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await accountMastersService.update(id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/:id', canDeleteAccounts, async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await accountMastersService.remove(id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
