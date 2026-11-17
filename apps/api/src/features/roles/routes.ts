import { Router } from 'express';
import { roleService } from './services';
import { requirePermission } from '../../middleware/auth';

const router = Router();

// List all roles with permissions and member counts
router.get('/', requirePermission('USER_MANAGEMENT', 'VIEW'), async (_req, res, next) => {
  try {
    const roles = await roleService.listRoles();
    res.json(roles);
  } catch (err) {
    next(err);
  }
});

// Get catalog of all permissions grouped by feature
router.get('/permissions', requirePermission('USER_MANAGEMENT', 'VIEW'), async (_req, res, next) => {
  try {
    const catalog = await roleService.getAllPermissions();
    res.json(catalog);
  } catch (err) {
    next(err);
  }
});

// Create a new custom role
router.post('/', requirePermission('USER_MANAGEMENT', 'MANAGE_ROLES'), async (req, res, next) => {
  try {
    const actor = req.user!;
    const created = await roleService.createRole(req.body, actor);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// Update role details and permission mappings
router.put('/:id', requirePermission('USER_MANAGEMENT', 'MANAGE_ROLES'), async (req, res, next) => {
  try {
    const actor = req.user!;
    const roleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await roleService.updateRole(roleId, req.body, actor);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete custom role
router.delete('/:id', requirePermission('USER_MANAGEMENT', 'MANAGE_ROLES'), async (req, res, next) => {
  try {
    const actor = req.user!;
    const roleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await roleService.deleteRole(roleId, actor);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
