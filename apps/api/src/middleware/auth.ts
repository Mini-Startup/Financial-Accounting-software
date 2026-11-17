import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../database';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  roleId: string | null;
  roleName: string;
  isOwner: boolean;
  isAdmin: boolean;
  permissions: Set<string>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// In-memory cache for fast authorization lookups (30 second TTL)
interface CacheEntry {
  user: AuthUser;
  expiresAt: number;
}
const userCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

export function clearUserPermissionCache(userId?: string) {
  if (userId) {
    userCache.delete(userId);
  } else {
    userCache.clear();
  }
}

export async function resolveUser(userId: string): Promise<AuthUser | null> {
  const cached = userCache.get(userId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const roleName = user.role?.name || 'User';
  const isOwner = roleName.toLowerCase() === 'owner';
  const isAdmin = isOwner || roleName.toLowerCase() === 'admin';

  const permissions = new Set<string>();
  if (user.role?.permissions) {
    for (const rp of user.role.permissions) {
      if (rp.permission) {
        permissions.add(`${rp.permission.feature}:${rp.permission.action}`);
      }
    }
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.roleId,
    roleName,
    isOwner,
    isAdmin,
    permissions,
  };

  userCache.set(userId, { user: authUser, expiresAt: now + CACHE_TTL_MS });
  return authUser;
}

/**
 * Extracts authentication credentials (e.g. x-user-id header or dev fallback)
 * and attaches req.user if found.
 */
export async function authenticateUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawUserId =
      (req.headers['x-user-id'] as string) ||
      (req.headers['authorization']?.replace(/^Bearer\s+/i, '') as string);

    if (rawUserId) {
      const user = await resolveUser(rawUserId);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

export type PermissionCheck = { feature: string; action: string };

/**
 * Guard middleware requiring a specific feature and action permission.
 * Can also accept an array of permissions where ANY matching permission grants access.
 * Owner role automatically bypasses all permission checks.
 */
export function requirePermission(
  requirement: string | PermissionCheck[],
  action?: string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        const rawUserId =
          (req.headers['x-user-id'] as string) ||
          (req.headers['authorization']?.replace(/^Bearer\s+/i, '') as string);

        if (rawUserId) {
          const resolved = await resolveUser(rawUserId);
          if (resolved) {
            req.user = resolved;
          }
        }
      }

      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required. Please sign in to perform this action.',
        });
        return;
      }

      // Owner has unrestricted access to all features and functions
      if (user.isOwner) {
        next();
        return;
      }

      if (Array.isArray(requirement)) {
        const hasAny = requirement.some((p) =>
          user.permissions.has(`${p.feature}:${p.action}`)
        );
        if (!hasAny) {
          const requiredStr = requirement
            .map((p) => `${p.feature}:${p.action}`)
            .join(' or ');
          res.status(403).json({
            error: 'Forbidden',
            message: `You do not have permission (${requiredStr}) to perform this action.`,
          });
          return;
        }
      } else {
        const act = action || 'VIEW';
        const permKey = `${requirement}:${act}`;
        if (!user.permissions.has(permKey)) {
          res.status(403).json({
            error: 'Forbidden',
            message: `You do not have permission to perform '${act}' on '${requirement}'. Contact your application Owner.`,
          });
          return;
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Guard middleware restricting access exclusively to application Owners.
 */
export function requireOwner() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        const rawUserId =
          (req.headers['x-user-id'] as string) ||
          (req.headers['authorization']?.replace(/^Bearer\s+/i, '') as string);

        if (rawUserId) {
          const resolved = await resolveUser(rawUserId);
          if (resolved) req.user = resolved;
        }
      }

      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
        return;
      }

      if (!user.isOwner) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Only application Owners can perform this action.',
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
