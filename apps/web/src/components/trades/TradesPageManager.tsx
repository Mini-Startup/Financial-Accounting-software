'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TradeFormModal } from './TradeFormModal';
import { TradeImportManager } from './TradeImportManager';
import { TradeDetailModal } from './TradeDetailModal';
import { TableToolbar } from '../ui/TableToolbar';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { LoadingOverlay } from '../ui/LoadingOverlay';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { UniversalDropdown } from '../ui/UniversalDropdown';
import { UniversalDatePicker } from '../ui/UniversalDatePicker';
import { FindAndReplace, type FindReplaceMatchState } from '../ui/FindAndReplace';
import {
  sortRecords,
  filterRecordsWithAdvanced,
  replaceValueInRecords,
  type SortDirection,
  type AdvancedCondition,
} from '@/utils/tableFilter';
import { Trash2, Plus, UploadCloud, Pencil, Lock, ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { formatDateToDDMMYY } from '@/utils/dateUtils';

type DateFilterMode = 'ALL' | 'DATE' | 'MONTH' | 'RANGE';

function parseTradeDateString(dateVal: any): { yyyyMmDd: string; yyyyMm: string; time: number } | null {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    const isoMatch = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const yyyy = isoMatch[1];
      const mm = isoMatch[2];
      const dd = isoMatch[3];
      const d = new Date(dateVal);
      return {
        yyyyMmDd: `${yyyy}-${mm}-${dd}`,
        yyyyMm: `${yyyy}-${mm}`,
        time: isNaN(d.getTime()) ? new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`).getTime() : d.getTime(),
      };
    }
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return {
    yyyyMmDd: `${yyyy}-${mm}-${dd}`,
    yyyyMm: `${yyyy}-${mm}`,
    time: d.getTime(),
  };
}

const TRADE_COLUMNS = [
  { key: 'securityName', label: 'Security / Script' },
  { key: 'tradeDate', label: 'Trade Date' },
  { key: 'exchange.code', label: 'Exchange' },
  { key: 'expiry', label: 'Expiry Date' },
  { key: 'transactionType', label: 'Type (BUY/SELL)' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'price', label: 'Rate' },
  { key: 'account.name', label: 'Client' },
  { key: 'broker.name', label: 'Broker' },
  { key: 'terminal', label: 'Terminal' },
  { key: 'profitTotal', label: 'Profit' },
  { key: 'tradeType', label: 'Trade Type' },
];

export function TradesPageManager({
  exchanges,
  accounts,
  scripts,
  initialTrades,
}: {
  exchanges: any[];
  accounts: any[];
  scripts: any[];
  initialTrades: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isImportParam = searchParams.get('import') === 'true';

  const [viewMode, setViewMode] = useState<'list' | 'import'>(isImportParam ? 'import' : 'list');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTrade, setEditingTrade] = useState<any | null>(null);
  const [trades, setTrades] = useState<any[]>(initialTrades);
  const [selectedTrade, setSelectedTrade] = useState<any | null>(null);
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

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('ALL');
  const [advancedConditions, setAdvancedConditions] = useState<AdvancedCondition[]>([]);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [exchangeFilter, setExchangeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [tradeTypeFilter, setTradeTypeFilter] = useState('');
  const [findReplaceMatch, setFindReplaceMatch] = useState<FindReplaceMatchState | null>(null);

  // Date filter state: particular date, particular month, or date range
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Sorting & Pagination
  const [sortKey, setSortKey] = useState<string | null>('tradeDate');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state with query parameters (e.g. sidebar links)
  useEffect(() => {
    setViewMode(isImportParam ? 'import' : 'list');
  }, [isImportParam]);

  // Update local trades list when initialTrades changes
  useEffect(() => {
    setTrades(initialTrades);
  }, [initialTrades]);

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

  const clients = useMemo(
    () =>
      (accounts || []).filter((a) => {
        const name = (a.group?.name || a.groupName || (typeof a.group === 'string' ? a.group : '') || '').toLowerCase().trim();
        return name === 'sundry debtors';
      }),
    [accounts]
  );
  const brokers = useMemo(
    () =>
      (accounts || []).filter((a) => {
        const name = (a.group?.name || a.groupName || (typeof a.group === 'string' ? a.group : '') || '').toLowerCase().trim();
        return name === 'sundry creditors';
      }),
    [accounts]
  );

  const exchangeOptions = useMemo(() => [
    { value: '', label: 'All Exchanges' },
    ...exchanges.map((ex) => ({ value: ex.code, label: ex.code })),
  ], [exchanges]);

  const typeOptions = useMemo(() => [
    { value: '', label: 'Buy / Sell' },
    { value: 'BUY', label: 'BUY' },
    { value: 'SELL', label: 'SELL' },
  ], []);

  const tradeTypeOptions = useMemo(() => [
    { value: '', label: 'All Trade Types' },
    { value: 'INTERNAL', label: 'Internal Trade' },
    { value: 'CARRY_FORWARD', label: 'Carry Forward' },
    { value: 'BACK_FORWARD', label: 'Backforward' },
    { value: 'SETTLEMENT', label: 'Settlement' },
    { value: 'REGULAR', label: 'Regular / Import' },
  ], []);

  const dateFilterModeOptions = useMemo(() => [
    { value: 'ALL', label: 'All Dates' },
    { value: 'DATE', label: 'Single Date' },
    { value: 'MONTH', label: 'By Month' },
    { value: 'RANGE', label: 'Date Range' },
  ], []);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Filter trades list with column targeting + advanced conditions + date filter
  const filteredTrades = useMemo(() => {
    let list = filterRecordsWithAdvanced(trades, searchQuery, searchColumn, advancedConditions);
    if (exchangeFilter) list = list.filter((t) => t.exchange?.code === exchangeFilter);
    if (typeFilter) list = list.filter((t) => t.transactionType === typeFilter);
    if (tradeTypeFilter) {
      list = list.filter((t) =>
        tradeTypeFilter === 'REGULAR'
          ? !t.tradeType || t.tradeType === 'REGULAR'
          : t.tradeType === tradeTypeFilter
      );
    }

    // Date filter: Particular Date, Particular Month, or Date Range
    if (dateFilterMode === 'DATE' && selectedDate) {
      list = list.filter((t) => {
        const parts = parseTradeDateString(t.tradeDate);
        return parts ? parts.yyyyMmDd === selectedDate : false;
      });
    } else if (dateFilterMode === 'MONTH' && selectedMonth) {
      list = list.filter((t) => {
        const parts = parseTradeDateString(t.tradeDate);
        return parts ? parts.yyyyMm === selectedMonth : false;
      });
    } else if (dateFilterMode === 'RANGE') {
      const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
      const to = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;
      if (from !== null || to !== null) {
        list = list.filter((t) => {
          const parts = parseTradeDateString(t.tradeDate);
          if (!parts) return false;
          const tradeTime = parts.time;
          if (from !== null && tradeTime < from) return false;
          if (to !== null && tradeTime > to) return false;
          return true;
        });
      }
    }

    return list;
  }, [
    trades,
    searchQuery,
    searchColumn,
    advancedConditions,
    exchangeFilter,
    typeFilter,
    tradeTypeFilter,
    dateFilterMode,
    selectedDate,
    selectedMonth,
    fromDate,
    toDate,
  ]);

  // Sorted and Paginated trades
  const sortedTrades = useMemo(() => {
    return sortRecords(filteredTrades, sortKey, sortDir);
  }, [filteredTrades, sortKey, sortDir]);

  const totalItems = sortedTrades.length;
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTrades.slice(start, start + pageSize);
  }, [sortedTrades, currentPage, pageSize]);

  // Statistics calculated strictly on currently visible / paginated rows
  const visibleStats = useMemo(() => {
    let buyQty = 0;
    let sellQty = 0;
    let totalProfit = 0;

    for (const t of paginatedTrades) {
      const qty = Math.abs(Number(t.quantity) || 0);
      if (t.transactionType === 'BUY') {
        buyQty += qty;
      } else {
        sellQty += qty;
      }
      totalProfit += Number(t.profitTotal) || 0;
    }

    return {
      buyQty,
      sellQty,
      netQty: buyQty - sellQty,
      totalProfit,
      count: paginatedTrades.length,
    };
  }, [paginatedTrades]);

  // Find & Replace handlers
  const handleReplaceOne = (rowIndex: number, columnKey: string, newValue: string) => {
    const target = paginatedTrades[rowIndex];
    if (!target) return;
    setTrades((prev) =>
      prev.map((t) => (t.id === target.id ? { ...t, [columnKey]: newValue } : t))
    );
    toast.success(`Updated ${columnKey}`);
  };

  const handleReplaceAll = (columnKey: string, findVal: string, replaceVal: string) => {
    const { updatedRecords, count } = replaceValueInRecords(trades, columnKey, findVal, replaceVal, true);
    setTrades(updatedRecords);
    toast.success(`Replaced ${count} occurrences in ${columnKey}`);
  };

  // Selection handlers
  const isAllVisibleSelected =
    paginatedTrades.length > 0 &&
    paginatedTrades.every((t) => selectedIds.has(t.id));

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        paginatedTrades.forEach((t) => next.delete(t.id));
      } else {
        paginatedTrades.forEach((t) => next.add(t.id));
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

  const handleDelete = (id: string) => {
    const tradeToDelete = trades.find((t) => t.id === id);
    const isLocked = Boolean(
      tradeToDelete?.settlementId != null ||
      (tradeToDelete?.source === 'SYSTEM' && (
        tradeToDelete?.tradeType === 'CARRY_FORWARD' ||
        tradeToDelete?.tradeType === 'BACK_FORWARD' ||
        tradeToDelete?.tradeType === 'SETTLEMENT'
      ))
    );
    if (isLocked) {
      toast.error('Settlement-generated trades are locked and cannot be deleted.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Trade',
      message: 'Are you sure you want to delete this trade?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trades/${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            setTrades((prev) => prev.filter((t) => t.id !== id));
            toast.success('Trade deleted successfully');
          } else {
            toast.error('Failed to delete trade');
          }
        } catch {
          toast.error('Failed to delete trade');
        }
      },
    });
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;

    // Check if any selected trade is locked
    const lockedCount = trades.filter(
      (t) =>
        selectedIds.has(t.id) &&
        (t.settlementId != null || (t.source === 'SYSTEM' && ['CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT'].includes(t.tradeType)))
    ).length;

    if (lockedCount > 0) {
      toast.error(`Cannot delete selection: ${lockedCount} settlement trade(s) are locked.`);
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Trades',
      message: `Are you sure you want to delete all ${count} selected trades?`,
      confirmLabel: `Delete ${count} Trades`,
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          const ids = Array.from(selectedIds);
          await Promise.all(
            ids.map((id) =>
              fetch(`${process.env.NEXT_PUBLIC_API_URL}/trades/${id}`, {
                method: 'DELETE',
              })
            )
          );
          setTrades((prev) => prev.filter((t) => !selectedIds.has(t.id)));
          setSelectedIds(new Set());
          toast.success(`${count} trades deleted successfully`);
        } catch {
          toast.error('Failed to delete some trades');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleSave = (savedTrade?: any) => {
    if (savedTrade && savedTrade.id) {
      setTrades((prev) => {
        const index = prev.findIndex((t) => t.id === savedTrade.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = savedTrade;
          return updated;
        }
        return [savedTrade, ...prev];
      });
    }
    router.refresh();
  };

  const handleImportBack = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('import');
    window.history.pushState({}, '', url.toString());
    setViewMode('list');
    router.refresh();
  };

  if (viewMode === 'import') {
    return <TradeImportManager onBack={handleImportBack} />;
  }

  const renderWithDiff = (colKey: string, currentVal: any, isActiveMatch: boolean) => {
    const rawText = String(currentVal ?? '');
    if (!isActiveMatch || findReplaceMatch?.targetColumn !== colKey || !findReplaceMatch?.findText.trim()) {
      return currentVal;
    }
    const isReplaceActive = Boolean(findReplaceMatch.replaceText && findReplaceMatch.replaceText.trim().length > 0);
    if (!isReplaceActive) {
      return (
        <span className="bg-amber-200 text-amber-950 font-bold px-1.5 py-0.5 rounded shadow-2xs">
          {rawText || '—'}
        </span>
      );
    }
    let preview = rawText;
    try {
      const regex = new RegExp(findReplaceMatch.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      preview = rawText.replace(regex, findReplaceMatch.replaceText);
    } catch {
      preview = findReplaceMatch.replaceText;
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs">
        <span className="line-through text-red-600 bg-red-50 px-1 py-0.5 rounded opacity-75">{rawText || '—'}</span>
        <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold shadow-2xs">→ {preview}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 relative">
      {isDeleting && <LoadingOverlay message="Deleting selected trades..." />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-4">
        <div>
          <h1 className="text-h2 font-display">Trades</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">
            Review manual, imported, and settlement trades cross-referenced with account masters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdding(true)}
            className="btn btn--primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Trade
          </button>
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('import', 'true');
              window.history.pushState({}, '', url.toString());
              setViewMode('import');
            }}
            className="btn btn--secondary flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4 text-[var(--color-primary)]" /> Import File
          </button>
        </div>
      </div>

      {/* Table Container Card (Seamless zero gap between Toolbar and Table) */}
      <div className="border border-[var(--color-border-light)] rounded-xl shadow-xs overflow-hidden bg-white">
        <TableToolbar
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search trades (supports OR via comma/space: e.g. TCS, INFY)..."
          columns={TRADE_COLUMNS}
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
          pageSizeOptions={[25, 50, 100, 200]}
          className="border-0 rounded-none border-b border-[var(--color-border-light)]"
          filterSlot={
            <div className="flex gap-2 items-center flex-wrap">
              <div className="w-36">
                <UniversalDropdown
                  options={exchangeOptions}
                  value={exchangeFilter}
                  onChange={(val) => {
                    setExchangeFilter(val);
                    setCurrentPage(1);
                  }}
                  placeholder="All Exchanges"
                />
              </div>
              <div className="w-32">
                <UniversalDropdown
                  options={typeOptions}
                  value={typeFilter}
                  onChange={(val) => {
                    setTypeFilter(val);
                    setCurrentPage(1);
                  }}
                  placeholder="Buy / Sell"
                />
              </div>
              <div className="w-40">
                <UniversalDropdown
                  options={tradeTypeOptions}
                  value={tradeTypeFilter}
                  onChange={(val) => {
                    setTradeTypeFilter(val);
                    setCurrentPage(1);
                  }}
                  placeholder="All Trade Types"
                />
              </div>

              {/* Date Filters: Particular Date, Month, or Range */}
              <div className="w-34">
                <UniversalDropdown
                  options={dateFilterModeOptions}
                  value={dateFilterMode}
                  onChange={(val) => {
                    setDateFilterMode(val as DateFilterMode);
                    setCurrentPage(1);
                  }}
                  placeholder="Filter Date"
                />
              </div>

              {dateFilterMode === 'DATE' && (
                <div className="w-38">
                  <UniversalDatePicker
                    value={selectedDate}
                    onChange={(val) => {
                      setSelectedDate(val);
                      setCurrentPage(1);
                    }}
                    placeholder="Select date"
                  />
                </div>
              )}

              {dateFilterMode === 'MONTH' && (
                <div className="w-38">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-8.5 w-full px-2.5 text-xs rounded-lg border border-[var(--color-border-medium)] bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[var(--color-leaf)] shadow-2xs cursor-pointer"
                    title="Select month"
                  />
                </div>
              )}

              {dateFilterMode === 'RANGE' && (
                <div className="flex items-center gap-1.5">
                  <div className="w-34">
                    <UniversalDatePicker
                      value={fromDate}
                      onChange={(val) => {
                        setFromDate(val);
                        setCurrentPage(1);
                      }}
                      placeholder="From date"
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">to</span>
                  <div className="w-34">
                    <UniversalDatePicker
                      value={toDate}
                      onChange={(val) => {
                        setToDate(val);
                        setCurrentPage(1);
                      }}
                      placeholder="To date"
                    />
                  </div>
                </div>
              )}

              {dateFilterMode !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFilterMode('ALL');
                    setSelectedDate('');
                    setSelectedMonth('');
                    setFromDate('');
                    setToDate('');
                    setCurrentPage(1);
                  }}
                  className="h-8.5 px-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center gap-1 cursor-pointer"
                  title="Clear date filter"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear Date</span>
                </button>
              )}
            </div>
          }
        />

        <div className="overflow-x-auto">
          <table className="data-table w-full text-xs">
            <thead>
              <tr className="whitespace-nowrap">
                <th style={{ width: '40px' }} className="text-center">
                  <CustomCheckbox
                    checked={isAllVisibleSelected}
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th
                  onClick={() => handleSort('tradeDate')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    {sortKey === 'tradeDate' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('exchange.code')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
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
                  onClick={() => handleSort('securityName')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Security Name / Script</span>
                    {sortKey === 'securityName' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('expiry')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Expiry Date</span>
                    {sortKey === 'expiry' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('transactionType')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Type</span>
                    {sortKey === 'transactionType' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  className="text-right cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Qty</span>
                    {sortKey === 'quantity' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  className="text-right cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Rate</span>
                    {sortKey === 'price' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('account.name')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Client</span>
                    {sortKey === 'account.name' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('broker.name')}
                  className="cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Broker</span>
                    {sortKey === 'broker.name' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="text-right">Client Rate</th>
                <th className="text-right">Broker Rate</th>
                <th
                  className="text-right cursor-pointer hover:bg-slate-100 select-none"
                  onClick={() => handleSort('profitTotal')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Profit</span>
                    {sortKey === 'profitTotal' ? (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th>Trade Type</th>
                <th style={{ width: '90px' }} className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedTrades.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-[var(--color-slate)] font-medium">
                    No trades match your search criteria.
                  </td>
                </tr>
              ) : null}
              {paginatedTrades.map((t, index) => {
                const profit = t.profitTotal ?? 0;
                const secName = t.securityName || t.script?.fullName || t.script?.shortName || '—';
                const isSelected = selectedIds.has(t.id);
                const isMatched = findReplaceMatch?.matchedRowIndices.includes(index);
                const isActiveMatch = findReplaceMatch?.activeRowIndex === index;
                
                // Dynamic currency symbol resolution
                const currSym = t.script?.currency?.symbol || (
                  (t.script?.currency?.code || t.currencyCode || '').toUpperCase() === 'INR' ? '₹' :
                  (t.script?.currency?.code || t.currencyCode || '').toUpperCase() === 'USD' ? '$' :
                  (t.script?.currency?.code || t.currencyCode || '').toUpperCase() === 'AED' ? 'AED ' :
                  (t.script?.currency?.code || t.currencyCode || '').toUpperCase() === 'EUR' ? '€' :
                  (t.script?.currency?.code || t.currencyCode || '').toUpperCase() === 'GBP' ? '£' :
                  (t.currencyCode ? `${t.currencyCode} ` : '$')
                );

                return (
                  <tr
                    key={t.id}
                    ref={(el) => {
                      if (isActiveMatch && el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }
                    }}
                    onClick={() => setSelectedTrade(t)}
                    className={cn(
                      'transition-colors cursor-pointer select-none whitespace-nowrap',
                      isSelected && 'bg-emerald-50/40 hover:bg-emerald-50/60',
                      !isSelected && isMatched && !isActiveMatch && 'bg-amber-50/60 hover:bg-amber-100/60',
                      isActiveMatch && 'bg-amber-100/90 ring-2 ring-amber-400 font-semibold shadow-xs',
                      !isSelected && !isMatched && !isActiveMatch && 'hover:bg-slate-50'
                    )}
                    title="Click to view full details"
                  >
                    <td
                      className="text-center whitespace-nowrap"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleRow(t.id);
                      }}
                    >
                      <CustomCheckbox
                        checked={isSelected}
                        onChange={() => handleToggleRow(t.id)}
                      />
                    </td>
                    <td className="text-[var(--color-slate)] font-mono text-xs whitespace-nowrap">
                      {renderWithDiff('tradeDate', formatDateToDDMMYY(t.tradeDate), isActiveMatch)}
                    </td>
                    <td className="font-bold text-[var(--color-charcoal)] whitespace-nowrap">
                      {renderWithDiff('exchange.code', t.exchange?.code || '—', isActiveMatch)}
                    </td>
                    <td className="max-w-[260px] truncate whitespace-nowrap" title={secName}>
                      <span className="font-semibold text-[var(--color-charcoal)] text-xs truncate block">
                        {renderWithDiff('securityName', secName, isActiveMatch)}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-slate-700 whitespace-nowrap">
                      {renderWithDiff('expiry', t.expiry || '—', isActiveMatch)}
                    </td>
                    <td className="whitespace-nowrap">
                      {isActiveMatch && findReplaceMatch?.targetColumn === 'transactionType' ? (
                        renderWithDiff('transactionType', t.transactionType, true)
                      ) : (
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap',
                            t.transactionType === 'BUY'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          )}
                        >
                          {t.transactionType}
                        </span>
                      )}
                    </td>
                    <td className="font-mono font-semibold text-right whitespace-nowrap">{t.quantity}</td>
                    <td className="font-mono text-right text-xs whitespace-nowrap">{currSym}{t.rate.toFixed(2)}</td>
                    <td className="font-mono text-xs whitespace-nowrap" title={t.account?.name}>
                      {renderWithDiff('account.code', t.account?.code || '—', isActiveMatch)}
                    </td>
                    <td className="font-mono text-xs whitespace-nowrap" title={t.broker?.name}>
                      {renderWithDiff('broker.code', t.broker?.code || '—', isActiveMatch)}
                    </td>
                    <td className="font-mono text-right text-xs whitespace-nowrap">
                      {t.clientRate != null ? `${currSym}${t.clientRate.toFixed(2)}` : '—'}
                    </td>
                    <td className="font-mono text-right text-xs whitespace-nowrap">
                      {t.brokerRate != null ? `${currSym}${t.brokerRate.toFixed(2)}` : '—'}
                    </td>
                    <td
                      className={cn(
                        'font-mono font-bold text-right text-xs whitespace-nowrap',
                        profit > 0 ? 'text-[var(--color-positive)]' :
                        profit < 0 ? 'text-[var(--color-negative)]' :
                        'text-[var(--color-charcoal)]'
                      )}
                    >
                      {profit > 0 ? '+' : ''}{currSym}{profit.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap',
                          t.tradeType === 'CARRY_FORWARD' && 'bg-amber-50 text-amber-800 border-amber-200',
                          t.tradeType === 'BACK_FORWARD' && 'bg-indigo-50 text-indigo-800 border-indigo-200',
                          t.tradeType === 'SETTLEMENT' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                          t.tradeType === 'INTERNAL' && 'bg-blue-50 text-blue-700 border-blue-200',
                          (!t.tradeType || t.tradeType === 'REGULAR') &&
                            (t.source === 'MANUAL'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200')
                        )}
                      >
                        {t.tradeType === 'CARRY_FORWARD'
                          ? 'Carry Forward'
                          : t.tradeType === 'BACK_FORWARD'
                          ? 'Backforward'
                          : t.tradeType === 'SETTLEMENT'
                          ? 'Settlement'
                          : t.tradeType === 'INTERNAL'
                          ? 'Internal Trade'
                          : t.tradeType && t.tradeType !== 'REGULAR'
                          ? t.tradeType
                          : t.source}
                      </span>
                    </td>
                    <td
                      className="text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t.settlementId != null || (t.source === 'SYSTEM' && ['CARRY_FORWARD', 'BACK_FORWARD', 'SETTLEMENT'].includes(t.tradeType)) ? (
                        <div
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs select-none border border-slate-200"
                          title="Settlement-generated trade is locked against edits and deletion"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px] font-medium">Locked</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingTrade(t)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50 cursor-pointer"
                            title="Edit Trade"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-negative)] transition-colors rounded-md hover:bg-red-50 cursor-pointer"
                            title="Delete Trade"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Sticky Total / Summary Row */}
            <tfoot className="sticky bottom-0 bg-slate-100/95 border-t-2 border-slate-300 font-bold text-xs text-slate-800">
              <tr>
                <td className="py-2.5 px-4 text-center" colSpan={6}>
                  Visible Trades: {visibleStats.count} of {totalItems} (Page {currentPage} of {Math.max(1, Math.ceil(totalItems / pageSize))})
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                  <div className="text-[10px] text-slate-500 font-normal">Buy: {visibleStats.buyQty.toLocaleString()} | Sell: {visibleStats.sellQty.toLocaleString()}</div>
                  <div>Net: {visibleStats.netQty > 0 ? `+${visibleStats.netQty.toLocaleString()}` : visibleStats.netQty.toLocaleString()}</div>
                </td>
                <td colSpan={5} className="py-2.5 px-3 text-right text-slate-500 font-normal">
                  Visible Net P&amp;L:
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold">
                  <span
                    className={cn(
                      visibleStats.totalProfit > 0 ? 'text-[var(--color-positive)]' :
                      visibleStats.totalProfit < 0 ? 'text-[var(--color-negative)]' :
                      'text-slate-800'
                    )}
                  >
                    {visibleStats.totalProfit > 0 ? '+' : ''}₹{visibleStats.totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td colSpan={2} className="py-2.5 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Floating Find & Replace Overlay Widget */}
      {isFindReplaceOpen && (
        <FindAndReplace
          data={paginatedTrades}
          columns={TRADE_COLUMNS}
          onReplaceOne={handleReplaceOne}
          onReplaceAll={handleReplaceAll}
          onClose={() => {
            setIsFindReplaceOpen(false);
            setFindReplaceMatch(null);
          }}
          onMatchChange={setFindReplaceMatch}
        />
      )}

      {/* Manual Entry Form Modal */}
      {isAdding && (
        <TradeFormModal
          exchanges={exchanges}
          scripts={scripts}
          clients={clients}
          brokers={brokers}
          onClose={() => setIsAdding(false)}
          onSave={handleSave}
        />
      )}

      {/* Edit Form Modal */}
      {editingTrade && (
        <TradeFormModal
          exchanges={exchanges}
          scripts={scripts}
          clients={clients}
          brokers={brokers}
          initialTrade={editingTrade}
          onClose={() => setEditingTrade(null)}
          onSave={handleSave}
        />
      )}

      {/* Detail Modal Popup */}
      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          onEdit={() => setEditingTrade(selectedTrade)}
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
