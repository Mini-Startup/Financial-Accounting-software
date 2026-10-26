'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableToolbar } from '@/components/ui/TableToolbar';
import { CustomCheckbox } from '@/components/ui/CustomCheckbox';
import { FindAndReplace } from '@/components/ui/FindAndReplace';
import {
  sortRecords,
  filterRecordsWithAdvanced,
  replaceValueInRecords,
  type SortDirection,
  type AdvancedCondition,
} from '@/utils/tableFilter';
import { ChevronUp, ChevronDown, ChevronsUpDown, Trash2, Edit } from 'lucide-react';
import { formatCurrencySymbol } from '@/utils/currency';
import { BrokerageFormModal } from './BrokerageFormModal';

const BROKERAGE_COLUMNS = [
  { key: 'account.name', label: 'Account' },
  { key: 'appliesTo', label: 'Applies To' },
  { key: 'script.shortName', label: 'Script' },
  { key: 'direction', label: 'Direction' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'brokerage', label: 'Brokerage' },
];

export function BrokerageDataTable({
  brokerages: initialBrokerages,
  accounts = [],
  scripts = [],
}: {
  brokerages: any[];
  accounts?: any[];
  scripts?: any[];
}) {
  const router = useRouter();
  const [brokeragesList, setBrokeragesList] = useState<any[]>(initialBrokerages);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isConfirmBulkOpen, setIsConfirmBulkOpen] = useState(false);

  // Search, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('ALL');
  const [advancedConditions, setAdvancedConditions] = useState<AdvancedCondition[]>([]);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('account.name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setBrokeragesList(initialBrokerages);
  }, [initialBrokerages]);

  // Global Ctrl+F / Cmd+F keyboard shortcut to toggle Find & Replace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setIsFindReplaceOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredBrokerages = useMemo(() => {
    return filterRecordsWithAdvanced(brokeragesList, searchQuery, searchColumn, advancedConditions);
  }, [brokeragesList, searchQuery, searchColumn, advancedConditions]);

  const sortedBrokerages = useMemo(() => {
    return sortRecords(filteredBrokerages, sortKey, sortDir);
  }, [filteredBrokerages, sortKey, sortDir]);

  const paginatedBrokerages = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedBrokerages.slice(start, start + pageSize);
  }, [sortedBrokerages, currentPage, pageSize]);

  // Checkbox Selection handlers
  const isAllVisibleSelected =
    paginatedBrokerages.length > 0 &&
    paginatedBrokerages.every((b) => selectedIds.has(b.id));

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        paginatedBrokerages.forEach((b) => next.delete(b.id));
      } else {
        paginatedBrokerages.forEach((b) => next.add(b.id));
      }
      return next;
    });
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setIsConfirmBulkOpen(true);
  };

  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/brokerages/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        toast.success(`${ids.length} brokerage rules deleted successfully`);
      } else {
        // Fallback to Promise.all
        await Promise.all(
          ids.map((id) =>
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/brokerages/${id}`, {
              method: 'DELETE',
            })
          )
        );
        toast.success(`${ids.length} brokerage rules deleted successfully`);
      }
      setSelectedIds(new Set());
      setIsConfirmBulkOpen(false);
      router.refresh();
    } catch {
      toast.error('Failed to delete selected rules');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleReplaceOne = (rowIndex: number, columnKey: string, newValue: string) => {
    const target = paginatedBrokerages[rowIndex];
    if (!target) return;
    setBrokeragesList((prev) =>
      prev.map((b) => (b.id === target.id ? { ...b, [columnKey]: newValue } : b))
    );
    toast.success(`Updated ${columnKey}`);
  };

  const handleReplaceAll = (columnKey: string, findVal: string, replaceVal: string) => {
    const { updatedRecords, count } = replaceValueInRecords(brokeragesList, columnKey, findVal, replaceVal, true);
    setBrokeragesList(updatedRecords);
    toast.success(`Replaced ${count} occurrences in ${columnKey}`);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/brokerages/${deleteTargetId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Brokerage rule deleted successfully');
        setDeleteTargetId(null);
        router.refresh();
      } else {
        throw new Error('Failed to delete brokerage rule');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to delete right now.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <TableToolbar
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search brokerage rules..."
          columns={BROKERAGE_COLUMNS}
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
          showFindReplaceButton={true}
          isFindReplaceOpen={isFindReplaceOpen}
          onToggleFindReplace={() => setIsFindReplaceOpen(!isFindReplaceOpen)}
          selectedCount={selectedIds.size}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setSelectedIds(new Set())}
          isDeleting={isBulkDeleting}
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={sortedBrokerages.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
        />

        {isFindReplaceOpen && (
          <FindAndReplace
            data={paginatedBrokerages}
            columns={BROKERAGE_COLUMNS}
            onReplaceOne={handleReplaceOne}
            onReplaceAll={handleReplaceAll}
            onClose={() => setIsFindReplaceOpen(false)}
          />
        )}

        <div className="card shadow-xs border border-slate-200 rounded-xl bg-white p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 select-none">
                <tr>
                  <th style={{ width: '40px' }} className="text-center px-4 py-3.5">
                    <CustomCheckbox
                      checked={isAllVisibleSelected}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th
                    onClick={() => handleSort('account.name')}
                    className="cursor-pointer hover:bg-slate-100 select-none px-6 py-3.5 text-left uppercase tracking-wider"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Account</span>
                      {sortKey === 'account.name' ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('appliesTo')}
                    className="cursor-pointer hover:bg-slate-100 select-none px-6 py-3.5 text-left uppercase tracking-wider"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Applies To</span>
                      {sortKey === 'appliesTo' ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('script.shortName')}
                    className="cursor-pointer hover:bg-slate-100 select-none px-6 py-3.5 text-left uppercase tracking-wider"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Script</span>
                      {sortKey === 'script.shortName' ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('direction')}
                    className="cursor-pointer hover:bg-slate-100 select-none px-6 py-3.5 text-left uppercase tracking-wider"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Direction</span>
                      {sortKey === 'direction' ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3.5 text-right uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3.5 text-right uppercase tracking-wider">Brokerage</th>
                  <th className="px-6 py-3.5 text-right uppercase tracking-wider">Per Qty Rate</th>
                  <th className="px-6 py-3.5 text-right uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-slate-100">
                {paginatedBrokerages.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-slate-400 font-medium text-sm">
                      No brokerage rules match search criteria.
                    </td>
                  </tr>
                ) : null}
                {paginatedBrokerages.map((rule) => {
                  const isSelected = selectedIds.has(rule.id);
                  const accName = rule.account?.name || rule.account?.fldName || 'Unnamed';
                  const accCode = rule.account?.code || rule.account?.fldClient || '';
                  const isScriptSpecific = rule.scope === 'SCRIPT' && rule.script;
                  const scriptObj = rule.script || scripts.find((s) => s.id === rule.scriptId);
                  const currSym = formatCurrencySymbol(scriptObj?.currency?.symbol, scriptObj?.currency?.code);
                  const perUnit = rule.quantity > 0 ? (rule.brokerage / rule.quantity).toFixed(4) : '0';

                  return (
                    <tr
                      key={rule.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-emerald-50/50 hover:bg-emerald-50/70' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <CustomCheckbox
                          checked={isSelected}
                          onChange={() => handleToggleRow(rule.id)}
                        />
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-800">
                        <div className="font-semibold">{accName}</div>
                        {accCode && <div className="text-[10px] text-slate-400 font-mono">{accCode}</div>}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            rule.appliesTo === 'CLIENT'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {rule.appliesTo}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-700">
                        {isScriptSpecific ? (
                          <div>
                            <span className="font-semibold text-slate-900">{rule.script.shortName}</span>
                            <span className="text-[11px] text-slate-500 ml-1.5">({rule.script.fullName})</span>
                            {rule.script.exchange && (
                              <span className="ml-1.5 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">
                                {rule.script.exchange.code}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                            All Scripts (Default)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            rule.direction === 'BUY'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rule.direction === 'SELL'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {rule.direction}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs text-right font-mono font-medium text-slate-800">
                        {rule.quantity}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs text-right font-mono font-semibold text-slate-900">
                        {currSym}{Number(rule.brokerage).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs text-right font-mono text-blue-600 font-bold">
                        {currSym}{perUnit}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right text-xs font-medium space-x-2">
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="text-slate-500 hover:text-blue-600 p-1 hover:bg-slate-100 rounded transition inline-flex items-center"
                          title="Edit rule"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(rule.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition inline-flex items-center"
                          title="Delete rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Single Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        title="Delete Brokerage Rule"
        message="Are you sure you want to delete this brokerage rule? This action cannot be undone."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmBulkOpen}
        title="Delete Selected Brokerage Rules"
        message={`Are you sure you want to delete all ${selectedIds.size} selected brokerage rules? This action cannot be undone.`}
        confirmLabel={isBulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size} Rules`}
        variant="danger"
        isLoading={isBulkDeleting}
        onConfirm={confirmBulkDelete}
        onCancel={() => setIsConfirmBulkOpen(false)}
      />

      {editingRule && (
        <BrokerageFormModal
          accounts={accounts}
          scripts={scripts}
          initialRule={editingRule}
          onClose={() => setEditingRule(null)}
        />
      )}
    </>
  );
}
