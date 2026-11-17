'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Shield,
  Plus,
  Search,
  Lock,
  Layers,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/utils/apiClient';
import { usePermissions } from '@/context/AuthPermissionsContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PermissionMatrixModal } from './PermissionMatrixModal';
import { formatDateToDDMMYY } from '@/utils/dateUtils';

interface UserRecord {
  id: string;
  name: string | null;
  email: string;
  roleId: string | null;
  createdAt: string;
  role?: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
  } | null;
}

interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count: {
    users: number;
  };
  permissions?: Array<{
    permission: {
      id: string;
      feature: string;
      action: string;
      name: string;
    };
  }>;
}

export function UserManagementDashboard() {
  const { isOwner, isAdmin, hasPermission, userId: currentUserId } = usePermissions();

  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES'>('USERS');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Role Assignment Confirmation
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{
    isOpen: boolean;
    user: UserRecord;
    newRole: RoleRecord;
  } | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState<boolean>(false);

  // Permission Matrix Modal
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<RoleRecord | null>(null);

  // Create Role Modal
  const [createRoleModal, setCreateRoleModal] = useState<{
    isOpen: boolean;
    name: string;
    description: string;
    saving: boolean;
  }>({
    isOpen: false,
    name: '',
    description: '',
    saving: false,
  });

  // Delete Role Confirmation
  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState<RoleRecord | null>(null);
  const [isDeletingRole, setIsDeletingRole] = useState<boolean>(false);

  const canManageRoles = hasPermission('USER_MANAGEMENT', 'MANAGE_ROLES');
  const canAssignRole = hasPermission('USER_MANAGEMENT', 'ASSIGN_ROLE');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiFetch('/users'),
        apiFetch('/roles'),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData);
      }
    } catch (err) {
      console.error('Failed to load user management data:', err);
      toast.error('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered users for search
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role?.name || '').toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // Roles assignable by current actor
  const assignableRoles = useMemo(() => {
    if (isOwner) return roles;
    // Admins cannot assign Owner or Admin
    return roles.filter(
      (r) => r.name.toLowerCase() !== 'owner' && r.name.toLowerCase() !== 'admin'
    );
  }, [roles, isOwner]);

  const handleRoleSelection = (user: UserRecord, targetRoleId: string) => {
    if (user.roleId === targetRoleId) return;
    const targetRole = roles.find((r) => r.id === targetRoleId);
    if (!targetRole) return;

    // Safety check: Admin cannot change Owner or another Admin
    const userIsOwner = user.role?.name.toLowerCase() === 'owner';
    const userIsAdmin = user.role?.name.toLowerCase() === 'admin';
    if ((userIsOwner || userIsAdmin) && !isOwner) {
      toast.error('Only application Owners can modify the roles of Admins and Owners.');
      return;
    }

    setRoleChangeConfirm({
      isOpen: true,
      user,
      newRole: targetRole,
    });
  };

  const handleConfirmRoleChange = async () => {
    if (!roleChangeConfirm) return;
    setIsUpdatingRole(true);
    try {
      const res = await apiFetch(`/users/${roleChangeConfirm.user.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: roleChangeConfirm.newRole.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update user role');
      }

      toast.success(
        `Assigned "${roleChangeConfirm.newRole.name}" role to ${
          roleChangeConfirm.user.name || roleChangeConfirm.user.email
        }.`
      );
      setRoleChangeConfirm(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to assign role');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createRoleModal.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    setCreateRoleModal((prev) => ({ ...prev, saving: true }));
    try {
      const res = await apiFetch('/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createRoleModal.name.trim(),
          description: createRoleModal.description.trim() || undefined,
          permissionIds: [],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create role');
      }

      const newRole = await res.json();
      toast.success(`Role "${newRole.name}" created successfully!`);
      setCreateRoleModal({ isOpen: false, name: '', description: '', saving: false });
      await fetchData();

      // Automatically open permission matrix for the newly created role
      setSelectedRoleForMatrix(newRole);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create role');
      setCreateRoleModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleConfirm) return;
    setIsDeletingRole(true);
    try {
      const res = await apiFetch(`/roles/${deleteRoleConfirm.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete role');
      }

      toast.success(`Role "${deleteRoleConfirm.name}" was deleted.`);
      setDeleteRoleConfirm(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete role');
    } finally {
      setIsDeletingRole(false);
    }
  };

  const getRoleBadgeStyle = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'employee':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewer':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-h2 font-display text-[var(--color-charcoal)]">
              Users & Access Control
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
              RBAC
            </span>
          </div>
          <p className="text-sm text-[var(--color-slate)] mt-1">
            Assign team member roles, manage administrative rights, and customize granular feature-function access.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('USERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'USERS'
                ? 'bg-white text-[var(--color-forest)] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Directory ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ROLES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ROLES'
                ? 'bg-white text-[var(--color-forest)] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Roles & Permissions ({roles.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: User Directory */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user by name, email, or role..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-[var(--color-forest)] transition-all"
              />
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="btn btn--secondary h-[38px] px-3.5 flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0 self-end sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="card bg-white rounded-2xl shadow-xs border border-[var(--color-border-light)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Current Role</th>
                    <th className="p-3.5">Member Since</th>
                    <th className="p-3.5 text-right">Assign Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--color-forest)]" />
                        <span>Loading team members…</span>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No team members matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const roleName = u.role?.name || 'Unassigned';
                      const isOwnerUser = roleName.toLowerCase() === 'owner';
                      const isAdminUser = roleName.toLowerCase() === 'admin';
                      const canModifyThisUser = canAssignRole && (isOwner || (!isOwnerUser && !isAdminUser));

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-medium text-slate-800">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[var(--color-forest)]/10 text-[var(--color-forest)] font-bold flex items-center justify-center text-xs shrink-0">
                                {(u.name || u.email || 'U')[0].toUpperCase()}
                              </div>
                              <span className="font-semibold text-slate-900">
                                {u.name || 'Unnamed User'}
                              </span>
                              {u.id === currentUserId && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 uppercase">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-600">{u.email}</td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${getRoleBadgeStyle(
                                roleName
                              )}`}
                            >
                              {isOwnerUser && <Lock className="w-3 h-3" />}
                              <span>{roleName}</span>
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-500">{formatDateToDDMMYY(u.createdAt)}</td>
                          <td className="p-3.5 text-right">
                            {canModifyThisUser ? (
                              <select
                                value={u.roleId || ''}
                                onChange={(e) => handleRoleSelection(u, e.target.value)}
                                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:border-[var(--color-forest)] cursor-pointer"
                              >
                                {assignableRoles.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs text-slate-400 italic font-mono">
                                Protected
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Roles & Permissions Matrix */}
      {activeTab === 'ROLES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Configured System Roles</h2>
              <p className="text-xs text-slate-500">
                Manage roles and assign granular function permissions across all features.
              </p>
            </div>
            {canManageRoles && (
              <button
                type="button"
                onClick={() => setCreateRoleModal({ isOpen: true, name: '', description: '', saving: false })}
                className="btn btn--primary h-[38px] px-4 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Custom Role</span>
              </button>
            )}
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((r) => {
              const isOwnerRole = r.name.toLowerCase() === 'owner';
              const isAdminRole = r.name.toLowerCase() === 'admin';
              const permCount = r.permissions?.length ?? 0;

              return (
                <div
                  key={r.id}
                  className="card bg-white p-5 rounded-2xl border border-[var(--color-border-light)] shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 font-display">{r.name}</h3>
                        {r.isSystem && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                            System
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(
                          r.name
                        )}`}
                      >
                        {r._count.users} user(s)
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 min-h-[36px] line-clamp-2">
                      {r.description || 'No description provided.'}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1 border-t border-slate-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isOwnerRole ? 'All permissions (Full Access)' : `${permCount} function permissions active`}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedRoleForMatrix(r)}
                      className="btn btn--secondary h-[34px] px-3 flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Configure Permissions</span>
                    </button>

                    {!r.isSystem && canManageRoles && r._count.users === 0 && (
                      <button
                        type="button"
                        onClick={() => setDeleteRoleConfirm(r)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                        title="Delete Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Role Assignment Confirm Dialog */}
      {roleChangeConfirm && (
        <ConfirmDialog
          isOpen={roleChangeConfirm.isOpen}
          title="Confirm Role Change"
          message={`Are you sure you want to change the role of ${
            roleChangeConfirm.user.name || roleChangeConfirm.user.email
          } from "${roleChangeConfirm.user.role?.name || 'Unassigned'}" to "${
            roleChangeConfirm.newRole.name
          }"?`}
          confirmLabel={isUpdatingRole ? 'Updating…' : 'Yes, Update Role'}
          cancelLabel="Cancel"
          variant="info"
          onConfirm={handleConfirmRoleChange}
          onCancel={() => setRoleChangeConfirm(null)}
        />
      )}

      {/* Delete Role Confirm Dialog */}
      {deleteRoleConfirm && (
        <ConfirmDialog
          isOpen={Boolean(deleteRoleConfirm)}
          title={`Delete Role "${deleteRoleConfirm.name}"?`}
          message="Are you sure you want to permanently delete this custom role? This action cannot be undone."
          confirmLabel={isDeletingRole ? 'Deleting…' : 'Delete Role'}
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleDeleteRole}
          onCancel={() => setDeleteRoleConfirm(null)}
        />
      )}

      {/* Permission Matrix Modal */}
      {selectedRoleForMatrix && (
        <PermissionMatrixModal
          isOpen={Boolean(selectedRoleForMatrix)}
          onClose={() => setSelectedRoleForMatrix(null)}
          role={selectedRoleForMatrix}
          onSuccess={fetchData}
        />
      )}

      {/* Create Custom Role Modal */}
      {createRoleModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-h3 font-display font-bold text-slate-900">Create New Role</h2>
              <button
                onClick={() => setCreateRoleModal({ isOpen: false, name: '', description: '', saving: false })}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Role Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Risk Manager, Senior Accountant"
                  value={createRoleModal.name}
                  onChange={(e) => setCreateRoleModal((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-[var(--color-forest)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  placeholder="Summary of this role's responsibilities..."
                  value={createRoleModal.description}
                  onChange={(e) => setCreateRoleModal((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-[var(--color-forest)] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateRoleModal({ isOpen: false, name: '', description: '', saving: false })}
                  className="btn btn--secondary h-[36px] px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoleModal.saving}
                  className="btn btn--primary h-[36px] px-4 text-xs font-bold cursor-pointer"
                >
                  {createRoleModal.saving ? 'Creating…' : 'Create & Configure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
