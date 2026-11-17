import { prisma } from '../../database';
import { BadRequestException, NotFoundException, ForbiddenException } from '../../errors';
import { clearUserPermissionCache, type AuthUser } from '../../middleware/auth';

export class UserService {
  async listUsers() {
    return prisma.user.findMany({
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
}

export const userService = new UserService();

