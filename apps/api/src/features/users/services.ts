import { prisma } from '../../database';
import { BadRequestException, NotFoundException, ForbiddenException } from '../../errors';
import { clearUserPermissionCache, type AuthUser } from '../../middleware/auth';

export class UserService {
  async listUsers() {
    return prisma.user.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            isSystem: true,
          },
        },
      },
    });
  }

  async getCurrentUserProfile(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
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
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const roleName = user.role?.name || 'User';
    const isOwner = roleName.toLowerCase() === 'owner';
    const isAdmin = isOwner || roleName.toLowerCase() === 'admin';

    const permissions = (user.role?.permissions || [])
      .filter((rp) => rp.permission)
      .map((rp) => ({
        feature: rp.permission.feature,
        action: rp.permission.action,
        key: `${rp.permission.feature}:${rp.permission.action}`,
      }));

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: {
        id: user.role?.id || null,
        name: roleName,
        isOwner,
        isAdmin,
      },
      permissions,
    };
  }

  async updateUserRole(targetUserId: string, newRoleId: string, actor: AuthUser) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID ${targetUserId} not found.`);
    }

    const newRole = await prisma.role.findUnique({
      where: { id: newRoleId },
    });

    if (!newRole) {
      throw new NotFoundException(`Role with ID ${newRoleId} not found.`);
    }

    const targetIsOwner = targetUser.role?.name.toLowerCase() === 'owner';
    const targetIsAdmin = targetUser.role?.name.toLowerCase() === 'admin';
    const assigningOwner = newRole.name.toLowerCase() === 'owner';
    const assigningAdmin = newRole.name.toLowerCase() === 'admin';

    // ── Hierarchy Enforcement ──
    // 1. Only an Owner can assign the Owner or Admin role
    if ((assigningOwner || assigningAdmin) && !actor.isOwner) {
      throw new ForbiddenException('Only application Owners can assign the Owner or Admin role.');
    }

    // 2. An Admin cannot alter an Owner's or another Admin's role
    if ((targetIsOwner || targetIsAdmin) && !actor.isOwner) {
      throw new ForbiddenException("Admins cannot modify an Owner's or Admin's role.");
    }

    // 3. Prevent demoting the last Owner
    if (targetIsOwner && !assigningOwner) {
      const ownerRole = await prisma.role.findUnique({ where: { name: 'Owner' } });
      if (ownerRole) {
        const ownerCount = await prisma.user.count({ where: { roleId: ownerRole.id } });
        if (ownerCount <= 1) {
          throw new BadRequestException('Cannot demote the only remaining Owner of the system.');
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { roleId: newRoleId },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    clearUserPermissionCache(targetUserId);
    return updated;
  }

  async whitelistUser(data: { email: string; name?: string; roleId?: string }, actor: AuthUser) {
    const email = data.email.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Valid email address is required.');
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (existing) {
      throw new BadRequestException(`User with email '${email}' is already registered or whitelisted.`);
    }

    let targetRoleId = data.roleId;
    if (!targetRoleId) {
      const defaultRole = await prisma.role.findFirst({
        where: { name: { in: ['Employee', 'User'] } },
      });
      targetRoleId = defaultRole?.id;
    }

    if (targetRoleId) {
      const role = await prisma.role.findUnique({ where: { id: targetRoleId } });
      if (!role) {
        throw new NotFoundException(`Role with ID ${targetRoleId} not found.`);
      }
      if (role.name.toLowerCase() === 'owner' && !actor.isOwner) {
        throw new ForbiddenException('Only Owners can assign the Owner role to new users.');
      }
    }

    return prisma.user.create({
      data: {
        email,
        name: data.name?.trim() || null,
        roleId: targetRoleId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });
  }
}

export const userService = new UserService();

