'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ExchangeFormModal } from './ExchangeFormModal';
import { ExchangeDeleteModal } from './ExchangeDeleteModal';
import { TableToolbar } from '@/components/ui/TableToolbar';
import { FindAndReplace } from '@/components/ui/FindAndReplace';
import { useOptimisticEntityList } from '@/hooks/useOptimisticEntityList';
import {
  sortRecords,
  filterRecordsWithAdvanced,
  replaceValueInRecords,
  type SortDirection,
  type AdvancedCondition,
} from '@/utils/tableFilter';
import { ChevronUp, ChevronDown, ChevronsUpDown, Pencil, Trash2 } from 'lucide-react';

const EXCHANGE_COLUMNS = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
];

export function ExchangeDataTable({ exchanges: initialExchanges }: { exchanges: any[] }) {
  const router = useRouter();
  const {
    items: exchangesList,
    setItems: setExchangesList,
    addEntity,
    updateEntity,
    removeEntity,
    syncWithServer,
  } = useOptimisticEntityList<any>(initialExchanges);

  const [editingExchange, setEditingExchange] = useState<any | null>(null);
  const [deleteTargetExchange, setDeleteTargetExchange] = useState<any | null>(null);

  // Search, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('ALL');
  const [advancedConditions, setAdvancedConditions] = useState<AdvancedCondition[]>([]);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('code');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    syncWithServer(initialExchanges);
  }, [initialExchanges, syncWithServer]);

  /* Find & Replace disabled outside import flows
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
  */

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredExchanges = useMemo(() => {
    return filterRecordsWithAdvanced(exchangesList, searchQuery, searchColumn, advancedConditions);
  }, [exchangesList, searchQuery, searchColumn, advancedConditions]);

  const sortedExchanges = useMemo(() => {
    return sortRecords(filteredExchanges, sortKey, sortDir);
  }, [filteredExchanges, sortKey, sortDir]);

  const paginatedExchanges = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedExchanges.slice(start, start + pageSize);
  }, [sortedExchanges, currentPage, pageSize]);

  const handleReplaceOne = (rowIndex: number, columnKey: string, newValue: string) => {
    const target = paginatedExchanges[rowIndex];
    if (!target) return;
    setExchangesList((prev) =>
      prev.map((e) => (e.id === target.id ? { ...e, [columnKey]: newValue } : e))
    );
    toast.success(`Updated ${columnKey}`);
  };

  const handleReplaceAll = (columnKey: string, findVal: string, replaceVal: string) => {
    const { updatedRecords, count } = replaceValueInRecords(exchangesList, columnKey, findVal, replaceVal, true);
    setExchangesList(updatedRecords);
    toast.success(`Replaced ${count} occurrences in ${columnKey}`);
  };

  return (
    <>
    <div className="border border-slate-200/90 rounded-2xl shadow-xs bg-white overflow-hidden relative">
      <TableToolbar
        tableName="Exchanges"
        records={exchangesList}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search exchange code or name..."
        columns={EXCHANGE_COLUMNS}
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
        /* showFindReplaceButton={true}
        isFindReplaceOpen={isFindReplaceOpen}
        onToggleFindReplace={() => setIsFindReplaceOpen(!isFindReplaceOpen)} */
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={sortedExchanges.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[25, 50, 100, 200, { value: 999999, label: 'All' }]}
      />

      {/* Find & Replace disabled outside import flows
      {isFindReplaceOpen && (
        <FindAndReplace
          data={paginatedExchanges}
          columns={EXCHANGE_COLUMNS}
          onReplaceOne={handleReplaceOne}
          onReplaceAll={handleReplaceAll}
          onClose={() => setIsFindReplaceOpen(false)}
        />
      )} */}

      <div className="overflow-x-auto rounded-b-xl">
        <table className="data-table data-table-dense w-full text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs select-none">
            <tr className="whitespace-nowrap">
              <th
                onClick={() => handleSort('code')}
                className="cursor-pointer hover:bg-slate-100 select-none py-2.5 px-4 font-bold uppercase tracking-wider text-slate-600 text-[11px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Exchange Code</span>
                  {sortKey === 'code' ? (
                    sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#2652C8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#2652C8]" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('name')}
                className="cursor-pointer hover:bg-slate-100 select-none py-2.5 px-4 font-bold uppercase tracking-wider text-slate-600 text-[11px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Exchange Full Name</span>
                  {sortKey === 'name' ? (
                    sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#2652C8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#2652C8]" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th className="text-right py-2.5 px-4 font-bold uppercase tracking-wider text-slate-600 text-[11px] w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white font-sans">
            {paginatedExchanges.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center text-slate-400 font-medium">
                  No exchanges match search criteria.
                </td>
              </tr>
            ) : null}
            {paginatedExchanges.map((exc) => (
              <tr
                key={exc.id}
                onClick={() => setEditingExchange(exc)}
                className="hover:bg-slate-50 transition-colors cursor-pointer select-none whitespace-nowrap group"
              >
                <td className="py-2.5 px-4">
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80 shadow-2xs inline-block">
                    {exc.code}
                  </span>
                </td>
                <td className="py-2.5 px-4">
                  <span className="text-slate-800 font-medium text-xs">
                    {exc.name || '—'}
                  </span>
                </td>
                <td className="text-right py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <button 
                      onClick={() => setEditingExchange(exc)}
                      className="p-1.5 text-slate-400 hover:text-[#2652C8] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Exchange"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setDeleteTargetExchange(exc)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Exchange"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {/* Summary / Total Footer */}
          <tfoot className="border-t border-slate-200 bg-slate-50/80 font-medium text-xs text-slate-600">
            <tr>
              <td className="py-2.5 px-4 font-bold text-slate-700" colSpan={2}>
                Total Exchanges: <span className="font-mono font-bold text-slate-900">{sortedExchanges.length}</span>
              </td>
              <td className="py-2.5 px-4 text-right text-slate-500 font-normal">
                Page {currentPage} of {Math.max(1, Math.ceil(sortedExchanges.length / pageSize))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    {editingExchange && (
      <ExchangeFormModal 
        initialData={editingExchange} 
        onClose={() => setEditingExchange(null)} 
        onSuccess={(updated) => {
          if (updated) updateEntity(updated);
          setEditingExchange(null);
        }}
      />
    )}

    <ExchangeDeleteModal
      isOpen={!!deleteTargetExchange}
      exchange={deleteTargetExchange}
      onClose={() => setDeleteTargetExchange(null)}
      onDeleted={(deletedId) => {
        removeEntity(deletedId);
        setDeleteTargetExchange(null);
      }}
    />
    </>
  );
}
