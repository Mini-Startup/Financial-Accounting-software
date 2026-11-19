'use client';

import { useState, useMemo } from 'react';
import { Plus, Calendar, Check, X, Trash2, Power, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { formatDateToDDMMYY, formatDateForInput } from '@/utils/dateUtils';
import { formatExpiryToDDMMMYY } from '@/utils/securityName';
import { useOptimisticEntityList } from '@/hooks/useOptimisticEntityList';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UniversalDropdown } from '@/components/ui/UniversalDropdown';
import { UniversalDatePicker } from '@/components/ui/UniversalDatePicker';
import { useTopBar } from '@/context/TopBarContext';
import { UniversalTooltip } from '@/components/ui/UniversalTooltip';
import { useEffect } from 'react';

export interface ExpiryDateRecord {
  id: string;
  date: string;
  normalizedDate: string;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function ExpiryDatePageManager({
  initialExpiries = [],
}: {
  initialExpiries: ExpiryDateRecord[];
}) {
  const {
    items: expiries,
    addEntity,
    updateEntity,
    removeEntity,
    syncWithServer,
  } = useOptimisticEntityList<ExpiryDateRecord>(initialExpiries);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newIsActive, setNewIsActive] = useState(true);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<ExpiryDateRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { setTopBar, resetTopBar } = useTopBar();

  // Push unified page title & actions to TopBar
  useEffect(() => {
    setTopBar({
      title: 'Expiry Dates',
      actions: (
        <UniversalTooltip content="Add a new contract expiry date">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="h-9 px-3.5 bg-[#2652C8] hover:bg-[#1F42A3] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Expiry Date</span>
          </button>
        </UniversalTooltip>
      ),
    });

    return () => resetTopBar();
  }, [setTopBar, resetTopBar]);

  // Filtered & Sorted list
  const filteredExpiries = useMemo(() => {
    let list = [...expiries];

    if (statusFilter === 'ACTIVE') {
      list = list.filter((e) => e.isActive);
    } else if (statusFilter === 'INACTIVE') {
      list = list.filter((e) => !e.isActive);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((e) => {
        const formatted = formatDateToDDMMYY(e.normalizedDate || e.date).toLowerCase();
        const code = formatExpiryToDDMMMYY(e.normalizedDate || e.date).toLowerCase();
        const raw = (e.date || '').toLowerCase();
        return formatted.includes(q) || code.includes(q) || raw.includes(q);
      });
    }

    return list.sort((a, b) => {
      const timeA = new Date(a.normalizedDate || a.date).getTime() || 0;
      const timeB = new Date(b.normalizedDate || b.date).getTime() || 0;
      return timeA - timeB;
    });
  }, [expiries, statusFilter, searchQuery]);

  // Toggle active/inactive
  const handleToggleActive = async (expiry: ExpiryDateRecord) => {
    const updated = { ...expiry, isActive: !expiry.isActive };
    updateEntity(updated);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/expiry-dates/${expiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !expiry.isActive }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status on server');
      }
      toast.success(
        `Expiry ${formatDateToDDMMYY(expiry.normalizedDate || expiry.date)} marked ${!expiry.isActive ? 'Active' : 'Inactive'}`
      );
    } catch {
      updateEntity(expiry); // Revert
      toast.error('Failed to update expiry status');
    }
  };

  // Delete expiry date
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setIsDeleting(true);

    removeEntity(target.id);
    toast.success('Expiry date deleted');
    setDeleteTarget(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/expiry-dates/${target.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Server deletion failed');
      }
    } catch {
      toast.error('Failed to delete on server');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add new expiry date
  const handleCreateExpiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      toast.error('Please select an expiry date');
      return;
    }

    // Check duplicate
    const formattedNew = formatDateToDDMMYY(newDate);
    const existing = expiries.find(
      (exp) => formatDateToDDMMYY(exp.normalizedDate || exp.date) === formattedNew
    );
    if (existing) {
      toast.error(`Expiry date ${formattedNew} already exists in master`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/expiry-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newDate,
          normalizedDate: new Date(`${newDate}T00:00:00Z`).toISOString(),
          isActive: newIsActive,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create expiry date');
      }

      const created = await res.json();
      addEntity(created);
      toast.success(`Expiry date ${formattedNew} added successfully`);
      setIsAdding(false);
      setNewDate('');
      setNewIsActive(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add expiry date');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="border border-border-light rounded-xl shadow-xs bg-white p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search bar */}
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search date or symbol code..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Status Filter */}
          <div className="w-36">
            <UniversalDropdown
              value={statusFilter}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active Only' },
                { value: 'INACTIVE', label: 'Inactive Only' },
              ]}
              onChange={(val) => setStatusFilter(val as any)}
              placeholder="Status"
            />
          </div>

          {(searchQuery || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Total: <span className="font-bold text-slate-800">{filteredExpiries.length}</span> expiries
        </div>
      </div>

      {/* High-density Table */}
      <div className="border border-border-light rounded-xl shadow-xs bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table data-table-dense w-full text-xs">
            <thead>
              <tr className="whitespace-nowrap bg-slate-50/80">
                <th className="font-semibold text-slate-700">Expiry Date (DD-MM-YY)</th>
                <th className="font-semibold text-slate-700">Contract Code</th>
                <th className="font-semibold text-slate-700">Raw Stored Value</th>
                <th className="font-semibold text-slate-700">Status</th>
                <th className="text-right font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredExpiries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate font-medium">
                    No expiry dates match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredExpiries.map((exp) => {
                  const dateStr = exp.normalizedDate || exp.date;
                  const formatted = formatDateToDDMMYY(dateStr);
                  const code = formatExpiryToDDMMMYY(dateStr);

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="font-mono font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatted}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-slate-700 whitespace-nowrap font-medium">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {code}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-slate-500 whitespace-nowrap">
                        {exp.date}
                      </td>
                      <td className="whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(exp)}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border transition cursor-pointer',
                            exp.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          )}
                          title="Click to toggle status"
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-xs',
                              exp.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            )}
                          />
                          <span>{exp.isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(exp)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50 cursor-pointer"
                            title={exp.isActive ? 'Deactivate Expiry' : 'Activate Expiry'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(exp)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 transition-colors rounded-md hover:bg-rose-50 cursor-pointer"
                            title="Delete Expiry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expiry Date Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-border-light animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-border-light flex items-center justify-between">
              <h2 className="text-base font-bold text-charcoal font-display">Add Expiry Date</h2>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1 text-slate hover:text-charcoal rounded-lg hover:bg-snow transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpiry} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expiry Date <span className="text-rose-500">*</span>
                </label>
                <UniversalDatePicker
                  value={newDate}
                  onChange={(d) => setNewDate(d)}
                  placeholder="DD-MM-YY"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Format is strictly DD-MM-YY (e.g. 15-12-26).
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-slate-700">Active by default</span>
                <button
                  type="button"
                  onClick={() => setNewIsActive(!newIsActive)}
                  className={cn(
                    'w-10 h-6 flex items-center rounded-lg p-1 cursor-pointer transition-colors',
                    newIsActive ? 'bg-emerald-600' : 'bg-slate-300'
                  )}
                >
                  <div
                    className={cn(
                      'bg-white w-4 h-4 rounded-md shadow-md transform transition-transform',
                      newIsActive ? 'translate-x-4' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-light">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="btn btn--secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newDate}
                  className="btn btn--primary text-xs px-4 py-2 min-w-24 justify-center"
                >
                  {isSubmitting ? 'Adding...' : 'Add Expiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Expiry Date"
        message={
          <div>
            <p>
              Are you sure you want to delete expiry date{' '}
              <strong className="font-mono">
                {deleteTarget ? formatDateToDDMMYY(deleteTarget.normalizedDate || deleteTarget.date) : ''}
              </strong>
              ?
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Consequence: This expiry date will be removed from trade dropdowns and future file mapping suggestions.
              Any existing trades referencing this date will not be lost.
            </p>
          </div>
        }
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
