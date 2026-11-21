import { prisma } from '../../database';
import { BadRequestException, NotFoundException, ForbiddenException } from '../../errors';
import { clearUserPermissionCache, type AuthUser } from '../../middleware/auth';
import { randomUUID } from 'crypto';

export class RoleService {
  async listRoles() {
    return prisma.role.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { users: true },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async getAllPermissions() {
    const all = await prisma.permission.findMany({
      orderBy: [{ feature: 'asc' }, { action: 'asc' }],
    });

    // Group permissions by feature for the UI matrix
    const grouped: Record<string, typeof all> = {};
    for (const p of all) {
      if (!grouped[p.feature]) {
        grouped[p.feature] = [];
      }
      grouped[p.feature].push(p);
    }

    return {
      all,
      grouped,
    };
  }

  async createRole(
    data: { name: string; description?: string; permissionIds: string[] },
    actor: AuthUser
  ) {
    const cleanName = data.name.trim();
    if (!cleanName) {
      throw new BadRequestException('Role name is required.');
    }

    if (['owner', 'admin'].includes(cleanName.toLowerCase()) && !actor.isOwner) {
      throw new ForbiddenException('Cannot create roles named Owner or Admin.');
    }

    const existing = await prisma.role.findUnique({
      where: { name: cleanName },
    });
    if (existing) {
      throw new BadRequestException(`A role named "${cleanName}" already exists.`);
    }

    const newRole = await prisma.role.create({
      data: {
        id: randomUUID(),
        name: cleanName,
        description: data.description || null,
        isSystem: false,
      },
    });

    if (data.permissionIds && data.permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: data.permissionIds.map((pid) => ({
          id: randomUUID(),
          roleId: newRole.id,
          permissionId: pid,
        })),
        skipDuplicates: true,
      });
    }

    clearUserPermissionCache();
    return this.getRoleById(newRole.id);
  }

  async getRoleById(roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: { select: { users: true } },
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found.`);
    }
    return role;
  }

  async updateRole(
    roleId: string,
    data: { name?: string; description?: string; permissionIds?: string[] },
    actor: AuthUser
  ) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found.`);
    }

    // Owner role permissions cannot be edited to prevent system lockouts
    if (role.name.toLowerCase() === 'owner') {
      throw new ForbiddenException('The Owner role has permanent full access and cannot be modified.');
    }

    // Only Owner can modify the Admin role
    if (role.name.toLowerCase() === 'admin' && !actor.isOwner) {
      throw new ForbiddenException('Only the application Owner can modify the Admin role.');
    }

    if (data.name && data.name.trim() !== role.name) {
      if (role.isSystem) {
        throw new BadRequestException('System role names cannot be renamed.');
      }
      const existing = await prisma.role.findUnique({
        where: { name: data.name.trim() },
      });
      if (existing) {
        throw new BadRequestException(`A role named "${data.name.trim()}" already exists.`);
      }
    }

    // Update role metadata
    await prisma.role.update({
      where: { id: roleId },
      data: {
        name: role.isSystem ? role.name : (data.name?.trim() || role.name),
        description: data.description !== undefined ? data.description : role.description,
      },
    });

    // Update permissions if provided
    if (data.permissionIds) {
      await prisma.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        if (data.permissionIds!.length > 0) {
          await tx.rolePermission.createMany({
            data: data.permissionIds!.map((pid) => ({
              id: randomUUID(),
              roleId,
              permissionId: pid,
            })),
            skipDuplicates: true,
          });
        }
      });
    }

    clearUserPermissionCache();
    return this.getRoleById(roleId);
  }

  async deleteRole(roleId: string, actor: AuthUser) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, isDeleted: false },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found.`);
    }

    if (role.isSystem) {
      throw new BadRequestException(`Cannot delete built-in system role "${role.name}".`);
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.name}" because it is currently assigned to ${role._count.users} user(s). Reassign them first.`
      );
    }

    if (!actor.isOwner && !actor.isAdmin) {
      throw new ForbiddenException('Not authorized to delete roles.');
    }

    await prisma.role.update({
      where: { id: roleId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    clearUserPermissionCache();
    return { success: true, message: `Role "${role.name}" was successfully deleted.` };
  }
}

export const roleService = new RoleService();

