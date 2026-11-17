'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Shield, Lock, Layers, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/utils/apiClient';

interface PermissionItem {
  id: string;
  feature: string;
  action: string;
  name: string;
  description?: string;
}

interface RoleData {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions?: Array<{
    permission: PermissionItem;
  }>;
}

interface PermissionMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: RoleData | null;
  onSuccess: () => void;
}

// Categorization of features for organized display
const FEATURE_CATEGORIES: Record<string, { label: string; features: string[] }> = {
  master: {
    label: 'Master Data',
    features: ['BROKERS', 'CLIENTS', 'SCRIPTS', 'EXCHANGES', 'CURRENCIES', 'BROKERAGE', 'ACCOUNT_MASTER'],
  },
  data: {
    label: 'Trade Operations',
    features: ['TRADES', 'CLOSING_RATES'],
  },
  reports: {
    label: 'Settlement & Netting',
    features: ['SETTLEMENT'],
  },
  financial: {
    label: 'Financial Accounting',
    features: ['LEDGER', 'VOUCHERS', 'TRIAL_BALANCE'],
  },
  admin: {
    label: 'Administration & System',
    features: ['USER_MANAGEMENT'],
  },
};

const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  BROKERS: 'Brokers',
  CLIENTS: 'Clients',
  SCRIPTS: 'Scripts',
  EXCHANGES: 'Exchanges',
  CURRENCIES: 'Currencies',
  BROKERAGE: 'Brokerage Rules',
  ACCOUNT_MASTER: 'Other Accounts',
  TRADES: 'Trades & Trade FnO',
  CLOSING_RATES: 'Closing Rates',
  SETTLEMENT: 'Settlement Cycles',
  LEDGER: 'Ledger Report',
  VOUCHERS: 'Vouchers',
  TRIAL_BALANCE: 'Trial Balance',
  USER_MANAGEMENT: 'Users & Roles Management',
};

const ALL_ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'IMPORT', 'EXECUTE', 'EXPORT', 'ASSIGN_ROLE', 'MANAGE_ROLES'];

export function PermissionMatrixModal({
  isOpen,
  onClose,
  role,
  onSuccess,
}: PermissionMatrixModalProps) {
  const [catalog, setCatalog] = useState<Record<string, PermissionItem[]>>({});
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [roleDescription, setRoleDescription] = useState<string>('');

  const isOwnerRole = role?.name.toLowerCase() === 'owner';

  useEffect(() => {
    if (!isOpen) return;

    setRoleDescription(role?.description || '');

    // Initialize selected permissions from current role
    const initialPermIds = new Set<string>();
    if (role?.permissions) {
      for (const rp of role.permissions) {
        if (rp.permission?.id) {
          initialPermIds.add(rp.permission.id);
        }
      }
    }
    setSelectedPermIds(initialPermIds);

    // Fetch catalog
    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const res = await apiFetch('/roles/permissions');
        if (res.ok) {
          const data = await res.json();
          setCatalog(data.grouped || {});
        }
      } catch (err) {
        console.error('Failed to load permission catalog:', err);
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, [isOpen, role]);

  // Lookup map: feature + action -> PermissionItem
  const permLookup = useMemo(() => {
    const map = new Map<string, PermissionItem>();
    for (const [feature, items] of Object.entries(catalog)) {
      for (const item of items) {
        map.set(`${feature}:${item.action}`, item);
      }
    }
    return map;
  }, [catalog]);

  const togglePermission = (permId: string) => {
    if (isOwnerRole) return;
    const next = new Set(selectedPermIds);
    if (next.has(permId)) {
      next.delete(permId);
    } else {
      next.add(permId);
    }
    setSelectedPermIds(next);
  };

  const toggleFeatureAll = (feature: string, selectAll: boolean) => {
    if (isOwnerRole) return;
    const items = catalog[feature] || [];
    const next = new Set(selectedPermIds);
    for (const item of items) {
      if (selectAll) {
        next.add(item.id);
      } else {
        next.delete(item.id);
      }
    }
    setSelectedPermIds(next);
  };

  const toggleCategoryAll = (features: string[], selectAll: boolean) => {
    if (isOwnerRole) return;
    const next = new Set(selectedPermIds);
    for (const f of features) {
      const items = catalog[f] || [];
      for (const item of items) {
        if (selectAll) next.add(item.id);
        else next.delete(item.id);
      }
    }
    setSelectedPermIds(next);
  };

  const handleSelectAllRole = (selectAll: boolean) => {
    if (isOwnerRole) return;
    if (selectAll) {
      const allIds = new Set<string>();
      for (const items of Object.values(catalog)) {
        for (const item of items) allIds.add(item.id);
      }
      setSelectedPermIds(allIds);
    } else {
      setSelectedPermIds(new Set());
    }
  };

  const handleSave = async () => {
    if (!role) return;
    if (isOwnerRole) {
      toast.info('The Owner role has full permanent access by design.');
      onClose();
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: roleDescription,
          permissionIds: Array.from(selectedPermIds),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update role permissions');
      }

      toast.success(`Role "${role.name}" permissions updated successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error updating role permissions');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !role) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border-light">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-border-light bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-(--color-forest)/10 text-(--color-forest) flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-h3 font-display text-charcoal">
                  Permissions Matrix: <span className="text-(--color-forest) font-bold">{role.name}</span>
                </h2>
                {role.isSystem && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 tracking-wider uppercase">
                    System Role
                  </span>
                )}
              </div>
              <p className="text-xs text-slate mt-0.5">
                Configure granular feature accessibility and function permissions for this role.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Role Description Bar */}
          <div className="card p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="text-xs font-semibold text-slate-700">Role Description</label>
            <input
              type="text"
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              placeholder="Brief description of this role's purpose..."
              disabled={isOwnerRole}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-(--color-forest) disabled:opacity-60"
            />
          </div>

          {/* Owner Notice Banner */}
          {isOwnerRole && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900">
              <Lock className="w-5 h-5 text-emerald-700 shrink-0" />
              <div className="text-xs">
                <strong>System Safety Rule:</strong> The <strong>Owner</strong> role maintains full, unmodifiable access to all system features and functions to prevent administrative lockouts.
              </div>
            </div>
          )}

          {/* Quick Action Buttons Bar */}
          {!isOwnerRole && (
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-600">
                {selectedPermIds.size} permission(s) granted
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllRole(true)}
                  className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                >
                  Grant All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllRole(false)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 cursor-pointer"
                >
                  Revoke All
                </button>
              </div>
            </div>
          )}

          {loadingCatalog ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-(--color-forest)" />
              <span>Loading system permission catalog…</span>
            </div>
          ) : (
            /* Categorized Matrix Table */
            <div className="space-y-6">
              {Object.entries(FEATURE_CATEGORIES).map(([catKey, category]) => (
                <div key={catKey} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  {/* Category Header */}
                  <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        {category.label}
                      </span>
                    </div>
                    {!isOwnerRole && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCategoryAll(category.features, true)}
                          className="text-[11px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                        >
                          Select Section
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => toggleCategoryAll(category.features, false)}
                          className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear Section
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Features Table inside Category */}
                  <div className="divide-y divide-slate-100">
                    {category.features.map((featureKey) => {
                      const featureItems = catalog[featureKey] || [];
                      if (featureItems.length === 0) return null;

                      const featureName = FEATURE_DISPLAY_NAMES[featureKey] || featureKey;
                      const allSelected = featureItems.every((item) => selectedPermIds.has(item.id));
                      const someSelected = featureItems.some((item) => selectedPermIds.has(item.id));

                      return (
                        <div key={featureKey} className="p-3.5 hover:bg-slate-50/50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{featureName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({featureKey})</span>
                            </div>
                            {!isOwnerRole && (
                              <button
                                type="button"
                                onClick={() => toggleFeatureAll(featureKey, !allSelected)}
                                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 self-start sm:self-auto cursor-pointer"
                              >
                                {allSelected ? 'Deselect Feature' : 'Select Feature'}
                              </button>
                            )}
                          </div>

                          {/* Function Actions Checkboxes */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {featureItems.map((item) => {
                              const checked = isOwnerRole || selectedPermIds.has(item.id);
                              const isDestructive = item.action === 'DELETE';

                              return (
                                <label
                                  key={item.id}
                                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                                    checked
                                      ? isDestructive
                                        ? 'bg-rose-50/70 border-rose-300 text-rose-900 font-semibold'
                                        : 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  } ${isOwnerRole ? 'cursor-not-allowed opacity-90' : ''}`}
                                  title={item.description || item.name}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={isOwnerRole}
                                    onChange={() => togglePermission(item.id)}
                                    className="rounded border-slate-300 text-(--color-forest) focus:ring-(--color-leaf) w-3.5 h-3.5 shrink-0"
                                  />
                                  <span className="truncate">{item.name.replace(/^View |^Create |^Edit |^Delete /, '')}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border-light bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn btn--secondary h-9.5 px-4 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          {!isOwnerRole && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn btn--primary h-9.5 px-5 flex items-center gap-2 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Role Permissions</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

