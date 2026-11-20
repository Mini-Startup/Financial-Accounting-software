'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Calendar, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateToDDMMYY, parseDateDetailed } from '@/utils/dateUtils';
import { useOptimisticEntityList } from '@/hooks/useOptimisticEntityList';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UniversalDatePicker } from '@/components/ui/UniversalDatePicker';
import { useTopBar } from '@/context/TopBarContext';
import { UniversalTooltip } from '@/components/ui/UniversalTooltip';
import { TableToolbar } from '@/components/ui/TableToolbar';
import type { AdvancedCondition } from '@/utils/tableFilter';

export interface ExpiryDateRecord {
  id: string;
  date: string;
  normalizedDate: string;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const EXPIRY_COLUMNS = [
  { key: 'date', label: 'Expiry Date' },
  { key: 'dayOfWeek', label: 'Day of Week' },
  { key: 'contractMonth', label: 'Contract Month' },
  { key: 'timeline', label: 'Timeline' },
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getExpiryCalendarDetails(dateStr: string) {
  const parsed = parseDateDetailed(dateStr);
  if (!parsed.isValid || !parsed.year || !parsed.month || !parsed.day) {
    return {
      formattedDate: dateStr,
      dayOfWeek: '—',
      contractMonth: '—',
      timeline: '—',
      timelineType: 'neutral' as const,
    };
  }

  const expDate = new Date(parsed.year, parsed.month - 1, parsed.day);
  const formattedDate = formatDateToDDMMYY(dateStr);
  const dayOfWeek = WEEKDAYS[expDate.getDay()] || '—';
  const contractMonth = `${MONTH_FULL[parsed.month - 1]} ${parsed.year}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDay = new Date(parsed.year, parsed.month - 1, parsed.day, 0, 0, 0, 0);
  const diffTime = targetDay.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let timeline = '';
  let timelineType: 'matured' | 'today' | 'upcoming' = 'upcoming';

  if (diffDays < 0) {
    timeline = 'Matured';
    timelineType = 'matured';
  } else if (diffDays === 0) {
    timeline = 'Expires Today';
    timelineType = 'today';
  } else if (diffDays === 1) {
    timeline = 'Expires Tomorrow';
    timelineType = 'upcoming';
  } else {
    timeline = `In ${diffDays} days`;
    timelineType = 'upcoming';
  }

  return {
    formattedDate,
    dayOfWeek,
    contractMonth,
    timeline,
    timelineType,
  };
}

export function ExpiryDatePageManager({
  initialExpiries = [],
}: {
  initialExpiries: ExpiryDateRecord[];
}) {
  const {
    items: expiries,
    addEntity,
    removeEntity,
  } = useOptimisticEntityList<ExpiryDateRecord>(initialExpiries);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('ALL');
  const [advancedConditions, setAdvancedConditions] = useState<AdvancedCondition[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDate, setNewDate] = useState('');

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
            className="h-9 px-3.5 bg-[#2652C8] hover:bg-[#1F42A3] text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((e) => {
        const details = getExpiryCalendarDetails(e.normalizedDate || e.date);
        const formatted = details.formattedDate.toLowerCase();
        const day = details.dayOfWeek.toLowerCase();
        const month = details.contractMonth.toLowerCase();
        const time = details.timeline.toLowerCase();

        if (searchColumn === 'date') return formatted.includes(q);
        if (searchColumn === 'dayOfWeek') return day.includes(q);
        if (searchColumn === 'contractMonth') return month.includes(q);
        if (searchColumn === 'timeline') return time.includes(q);
        return formatted.includes(q) || day.includes(q) || month.includes(q) || time.includes(q);
      });
    }

    return list.sort((a, b) => {
      const timeA = new Date(a.normalizedDate || a.date).getTime() || 0;
      const timeB = new Date(b.normalizedDate || b.date).getTime() || 0;
      return timeA - timeB;
    });
  }, [expiries, searchQuery, searchColumn]);

  const paginatedExpiries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExpiries.slice(start, start + pageSize);
  }, [filteredExpiries, currentPage, pageSize]);

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
          isActive: true,
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
    } catch (err: any) {
      toast.error(err.message || 'Failed to add expiry date');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border border-slate-200/90 rounded-2xl shadow-xs bg-white overflow-hidden relative">
      {/* Standard TableToolbar (identical to Currency, Exchange, and Script pages) */}
      <TableToolbar
        tableName="Expiry Dates"
        records={expiries}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search expiry date, day, month, or timeline..."
        columns={EXPIRY_COLUMNS}
        searchColumn={searchColumn}
        onSearchColumnChange={(col) => {
          setSearchColumn(col);
          setCurrentPage(1);
        }}
        advancedConditions={advancedConditions}
        onAdvancedConditionsChange={(conds) => {
          setAdvancedConditions(conds);
          setCurrentPage(1);
        }}
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={filteredExpiries.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 25, 50, 100]}
      />

      {/* Unified Table View */}
      <div className="overflow-x-auto">
        <table className="data-table w-full text-xs">
          <thead className="bg-slate-50/90 border-b border-slate-200/80 select-none">
            <tr className="whitespace-nowrap">
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-600 text-[11px]">Expiry Date</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-600 text-[11px]">Day of Week</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-600 text-[11px]">Contract Month</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-600 text-[11px]">Timeline</th>
              <th className="text-right px-4 py-3 font-bold uppercase tracking-wider text-slate-600 text-[11px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white font-sans">
            {paginatedExpiries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                  No expiry dates match your search criteria.
                </td>
              </tr>
            ) : (
              paginatedExpiries.map((exp) => {
                const details = getExpiryCalendarDetails(exp.normalizedDate || exp.date);

                return (
                  <tr key={exp.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#2652C8]" />
                        <span>{details.formattedDate}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                      {details.dayOfWeek}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                      {details.contractMonth}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {details.timelineType === 'matured' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          {details.timeline}
                        </span>
                      ) : details.timelineType === 'today' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          {details.timeline}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-[#2652C8] border border-blue-200">
                          {details.timeline}
                        </span>
                      )}
                    </td>
                    <td className="text-right px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(exp)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 cursor-pointer inline-flex items-center justify-center"
                        title="Delete Expiry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-50/90 border-t border-slate-200/80">
            <tr>
              <td colSpan={5} className="px-4 py-2.5 text-xs text-slate-500 font-medium">
                Showing {paginatedExpiries.length} of {filteredExpiries.length} expiry date {filteredExpiries.length === 1 ? 'record' : 'records'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add Expiry Date Modal */}
      {isAdding && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsAdding(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Unified Modal Header — No redundant badge */}
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2652C8] flex items-center justify-center shrink-0 border border-blue-100/60 shadow-2xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">Add Expiry Date</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Contract expiration date for derivatives trading</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpiry} className="flex-1 flex flex-col min-h-0">
              <div className="p-6 space-y-4 flex-1 bg-white">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Expiry Date <span className="text-rose-500">*</span>
                  </label>
                  <UniversalDatePicker
                    value={newDate}
                    onChange={(d) => setNewDate(d)}
                    placeholder="DD-MM-YY"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Format is strictly DD-MM-YY (e.g. 15-12-26).
                  </p>
                </div>
              </div>

              {/* Unified Modal Footer */}
              <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="h-9 px-4 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newDate}
                  className="h-9 px-5 text-xs font-semibold rounded-lg text-white bg-[#2652C8] hover:bg-[#1E42A8] transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
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
