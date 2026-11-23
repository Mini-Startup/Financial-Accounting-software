import { Router } from 'express';
import { userService } from './services';
import { requirePermission } from '../../middleware/auth';
import { BadRequestException } from '../../errors';

const router = Router();

// Get current logged-in user profile & active permissions
router.get('/me', async (req, res, next) => {
  try {
    const rawUserId =
      (req.headers['x-user-id'] as string) ||
      (req.headers['authorization']?.replace(/^Bearer\s+/i, '') as string);

    if (!rawUserId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User identification header missing.' });
      return;
    }

    const profile = await userService.getCurrentUserProfile(rawUserId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// List all users in system (requires USER_MANAGEMENT:VIEW)
router.get('/', requirePermission('USER_MANAGEMENT', 'VIEW'), async (_req, res, next) => {
  try {
    const users = await userService.listUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// Update a user's assigned role (requires USER_MANAGEMENT:ASSIGN_ROLE)
router.put('/:id/role', requirePermission('USER_MANAGEMENT', 'ASSIGN_ROLE'), async (req, res, next) => {
  try {
    const { roleId } = req.body || {};
    if (!roleId) {
      throw new BadRequestException('roleId is required.');
    }

    const actor = req.user!;
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await userService.updateUserRole(userId, roleId, actor);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Pre-whitelist user by email (requires USER_MANAGEMENT:ASSIGN_ROLE)
router.post('/whitelist', requirePermission('USER_MANAGEMENT', 'ASSIGN_ROLE'), async (req, res, next) => {
  try {
    const { email, name, roleId } = req.body || {};
    if (!email) {
      throw new BadRequestException('email is required.');
    }
    const actor = req.user!;
    const result = await userService.whitelistUser({ email, name, roleId }, actor);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermission('USER_MANAGEMENT', 'ASSIGN_ROLE'), async (req, res, next) => {
  try {
    const { email, name, roleId } = req.body || {};
    if (!email) {
      throw new BadRequestException('email is required.');
    }
    const actor = req.user!;
    const result = await userService.whitelistUser({ email, name, roleId }, actor);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
