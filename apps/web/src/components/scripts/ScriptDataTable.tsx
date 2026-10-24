'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScriptFormModal } from './ScriptFormModal';
import { TableToolbar } from '../ui/TableToolbar';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { Edit2, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FindAndReplace } from '../ui/FindAndReplace';
import {
  sortRecords,
  filterRecordsWithAdvanced,
  replaceValueInRecords,
  type SortDirection,
  type AdvancedCondition,
} from '@/utils/tableFilter';


const SCRIPT_COLUMNS = [
  { key: 'shortName', label: 'Symbol / Code' },
  { key: 'fullName', label: 'Full Description' },
  { key: 'lotSize', label: 'Lot Size' },
  { key: 'exchange.code', label: 'Exchange' },
  { key: 'currency.code', label: 'Currency' },
];

export function ScriptDataTable({
  scripts: initialScripts,
  exchanges,
}: {
  scripts: any[];
  exchanges: any[];
}) {
  const router = useRouter();
  const [scriptsList, setScriptsList] = useState<any[]>(initialScripts);
  const [editingScript, setEditingScript] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('ALL');
  const [advancedConditions, setAdvancedConditions] = useState<AdvancedCondition[]>([]);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('shortName');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useMemo(() => {
    setScriptsList(initialScripts);
  }, [initialScripts]);

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

  // Filter scripts with column targeting + advanced conditions
  const filteredScripts = useMemo(() => {
    return filterRecordsWithAdvanced(scriptsList, searchQuery, searchColumn, advancedConditions);
  }, [scriptsList, searchQuery, searchColumn, advancedConditions]);

  // Sorted and Paginated scripts
  const sortedScripts = useMemo(() => {
    return sortRecords(filteredScripts, sortKey, sortDir);
  }, [filteredScripts, sortKey, sortDir]);

  const totalItems = sortedScripts.length;
  const paginatedScripts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedScripts.slice(start, start + pageSize);
  }, [sortedScripts, currentPage, pageSize]);

  const totalLotSize = useMemo(() => {
    return paginatedScripts.reduce((sum, s) => sum + (Number(s.lotSize) || 0), 0);
  }, [paginatedScripts]);

  const handleReplaceOne = (rowIndex: number, columnKey: string, newValue: string) => {
    const target = paginatedScripts[rowIndex];
    if (!target) return;
    setScriptsList((prev) =>
      prev.map((s) => (s.id === target.id ? { ...s, [columnKey]: newValue } : s))
    );
    toast.success(`Updated ${columnKey}`);
  };

  const handleReplaceAll = (columnKey: string, findVal: string, replaceVal: string) => {
    const { updatedRecords, count } = replaceValueInRecords(scriptsList, columnKey, findVal, replaceVal, true);
    setScriptsList(updatedRecords);
    toast.success(`Replaced ${count} occurrences in ${columnKey}`);
  };

  // Selection handlers
  const isAllVisibleSelected =
    paginatedScripts.length > 0 &&
    paginatedScripts.every((s) => selectedIds.has(s.id));

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        paginatedScripts.forEach((s) => next.delete(s.id));
      } else {
        paginatedScripts.forEach((s) => next.add(s.id));
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

  const handleDeleteSingle = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Script',
      message: 'Are you sure you want to delete this script?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            toast.success('Script deleted successfully');
            router.refresh();
          } else {
            toast.error('Failed to delete script');
          }
        } catch {
          toast.error('Failed to delete script');
        }
      },
    });
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Scripts',
      message: `Are you sure you want to delete all ${count} selected scripts?`,
      confirmLabel: `Delete ${count} Scripts`,
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          const ids = Array.from(selectedIds);
          await Promise.all(
            ids.map((id) =>
              fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}`, {
                method: 'DELETE',
              })
            )
          );
          toast.success(`${count} scripts deleted successfully`);
          setSelectedIds(new Set());
          router.refresh();
        } catch {
          toast.error('Failed to delete some scripts');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  return (
    <div className="space-y-2">
      {/* Top Controls Toolbar */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search scripts by symbol, name, exchange..."
        columns={SCRIPT_COLUMNS}
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
        isDeleting={isDeleting}
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* Find & Replace Drawer */}
      {isFindReplaceOpen && (
        <FindAndReplace
          data={paginatedScripts}
          columns={SCRIPT_COLUMNS}
          onReplaceOne={handleReplaceOne}
          onReplaceAll={handleReplaceAll}
          onClose={() => setIsFindReplaceOpen(false)}
        />
      )}

      {/* Main Table Card */}
      <div className="card shadow-xs border border-t-0 border-slate-200 rounded-t-none bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }} className="text-center">
                  <CustomCheckbox
                    checked={isAllVisibleSelected}
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th
                  style={{ width: '140px' }}
                  onClick={() => handleSort('shortName')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Short Name</span>
                    {sortKey === 'shortName' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('fullName')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Full Name</span>
                    {sortKey === 'fullName' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  style={{ width: '130px' }}
                  onClick={() => handleSort('lotSize')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Market Lot</span>
                    {sortKey === 'lotSize' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th style={{ width: '100px' }}>Exchange</th>
                <th style={{ width: '120px' }}>Currency</th>
                <th style={{ width: '90px' }} className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedScripts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No scripts found matching your search.
                  </td>
                </tr>
              ) : null}
              {paginatedScripts.map((script) => {
                const isSelected = selectedIds.has(script.id);
                const exCode = script.exchange?.code || script.scriptExchangeMappings?.[0]?.exchange?.code || '—';
                const currCode = script.currency
                  ? `${script.currency.code} ${script.currency.symbol ? `(${script.currency.symbol})` : ''}`
                  : 'USD ($)';

                return (
                  <tr
                    key={script.id}
                    className={isSelected ? 'bg-emerald-50/40 hover:bg-emerald-50/60' : 'hover:bg-slate-50/50'}
                  >
                    <td className="text-center">
                      <CustomCheckbox
                        checked={isSelected}
                        onChange={() => handleToggleRow(script.id)}
                      />
                    </td>
                    <td className="font-mono font-bold text-slate-800">
                      {script.shortName}
                    </td>
                    <td className="font-medium text-slate-900">
                      {script.fullName}
                    </td>
                    <td className="font-semibold text-slate-700 font-mono">
                      {Number(script.lotSize).toLocaleString()}
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {exCode}
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                        {currCode}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingScript(script)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors rounded-md hover:bg-slate-100"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(script.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-md hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Sticky Total / Summary Row */}
            <tfoot className="sticky bottom-0 bg-slate-100/95 border-t-2 border-slate-300 font-bold text-xs text-slate-800">
              <tr>
                <td className="py-2.5 px-4 text-center" colSpan={3}>
                  Total Visible: {paginatedScripts.length} of {totalItems} scripts
                </td>
                <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                  Lot Total: {totalLotSize.toLocaleString()}
                </td>
                <td className="py-2.5 px-4 text-slate-500 font-normal" colSpan={3}>
                  Page {currentPage} of {Math.max(1, Math.ceil(totalItems / pageSize))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {editingScript && (
        <ScriptFormModal
          initialData={editingScript}
          exchanges={exchanges}
          scripts={scriptsList}
          onClose={() => setEditingScript(null)}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={async () => {
          await confirmDialog.onConfirm();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
