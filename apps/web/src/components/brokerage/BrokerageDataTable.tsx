'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableToolbar } from '@/components/ui/TableToolbar';
import { FindAndReplace } from '@/components/ui/FindAndReplace';
import {
  sortRecords,
  filterRecordsWithAdvanced,
  replaceValueInRecords,
  type SortDirection,
  type AdvancedCondition,
} from '@/utils/tableFilter';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

const BROKERAGE_COLUMNS = [
  { key: 'exchange.code', label: 'Exchange' },
  { key: 'account.fldName', label: 'Account' },
  { key: 'appliesTo', label: 'Applies To (CLIENT/BROKER)' },
  { key: 'type', label: 'Type (PERCENT/AMOUNT)' },
  { key: 'scope', label: 'Scope (DEFAULT/SCRIPT)' },
];

export function BrokerageDataTable({ brokerages: initialBrokerages }: { brokerages: any[] }) {
  const router = useRouter();
  const [brokeragesList, setBrokeragesList] = useState<any[]>(initialBrokerages);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('ALL');
  const [advancedConditions, setAdvancedConditions] = useState<AdvancedCondition[]>([]);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>('exchange.code');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useMemo(() => {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/brokerages/${deleteTargetId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Brokerage rule deleted successfully');
        setDeleteTargetId(null);
        router.refresh();
      } else {
        throw new Error('Failed to delete brokerage rule');
      }
    } catch(e: any) {
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

      <div className="card shadow-xs border border-t-0 border-slate-200 rounded-t-none bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border-light)]">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
              <tr>
                <th
                  onClick={() => handleSort('exchange.code')}
                  className="cursor-pointer hover:bg-slate-100 select-none px-6 py-3 text-left uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Exchange</span>
                    {sortKey === 'exchange.code' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('account.fldName')}
                  className="cursor-pointer hover:bg-slate-100 select-none px-6 py-3 text-left uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Account</span>
                    {sortKey === 'account.fldName' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('type')}
                  className="cursor-pointer hover:bg-slate-100 select-none px-6 py-3 text-left uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Type / Scope</span>
                    {sortKey === 'type' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left uppercase tracking-wider">Key Values</th>
                <th className="px-6 py-3 text-right uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-[var(--color-border-light)]">
              {paginatedBrokerages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[var(--color-slate)] font-medium">
                    No brokerage rules match search criteria.
                  </td>
                </tr>
              ) : null}
              {paginatedBrokerages.map((rule) => {
                const typeStr = rule.type === 'AMOUNT' ? 'Flat Amount' : 'Percentage';
                const scopeStr = rule.scope === 'DEFAULT' ? 'Default' : `Script: ${rule.script?.fullName || 'Unknown'}`;
                
                let valueStr = '';
                if (rule.type === 'AMOUNT') {
                  valueStr = `Base: ${rule.baseAmount}, Fee: ${rule.flatFee}`;
                } else {
                  valueStr = `Trading: ${rule.tradingBuyPct}%/${rule.tradingSellPct}% (min ${rule.tradingMinFee})`;
                }

                return (
                  <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap text-xs font-mono font-bold text-[var(--color-charcoal)]">{rule.exchange?.code}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-xs text-[var(--color-charcoal)]">
                      <div className="font-semibold">{rule.account?.fldName}</div>
                      <div className="text-[10px] text-[var(--color-slate)] uppercase">{rule.appliesTo}</div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-xs text-[var(--color-slate)]">
                      <div>{typeStr}</div>
                      <div className="text-[10px] font-medium text-[var(--color-slate)] bg-[var(--color-mist)] px-2 py-0.5 rounded inline-block mt-0.5">{scopeStr}</div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-xs font-mono text-[var(--color-slate)]">{valueStr}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right text-xs font-medium">
                      <button 
                        onClick={() => setDeleteTargetId(rule.id)}
                        className="text-[var(--color-negative)] hover:opacity-80 font-semibold transition cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Sticky Total / Summary Row */}
            <tfoot className="sticky bottom-0 bg-slate-100/95 border-t-2 border-slate-300 font-bold text-xs text-slate-800">
              <tr>
                <td className="px-6 py-2.5" colSpan={2}>Total Rules: {sortedBrokerages.length}</td>
                <td className="px-6 py-2.5 text-slate-500 font-normal" colSpan={3}>
                  Clients: {brokeragesList.filter((b: any) => b.appliesTo === 'CLIENT').length} | Brokers: {brokeragesList.filter((b: any) => b.appliesTo === 'BROKER').length}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <ConfirmDialog
      isOpen={!!deleteTargetId}
      title="Delete Brokerage Rule"
      message="Are you sure you want to delete this brokerage rule?"
      variant="danger"
      confirmLabel="Delete"
      isLoading={isDeleting}
      onConfirm={confirmDelete}
      onCancel={() => setDeleteTargetId(null)}
    />
    </>
  );
}
