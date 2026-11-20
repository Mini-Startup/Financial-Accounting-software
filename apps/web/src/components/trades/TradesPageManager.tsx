'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TradeFormModal } from './TradeFormModal';
import { TradeImportModal } from './TradeImportModal';
import { TableToolbar } from '../ui/TableToolbar';
import { CustomCheckbox } from '../ui/CustomCheckbox';
import { LoadingOverlay } from '../ui/LoadingOverlay';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { UniversalDropdown } from '../ui/UniversalDropdown';
import { UniversalDatePicker } from '../ui/UniversalDatePicker';
import { UniversalDateRangePicker } from '../ui/UniversalDateRangePicker';
import { UniversalTooltip } from '../ui/UniversalTooltip';
import { useTopBar } from '@/context/TopBarContext';
import { FindAndReplace, type FindReplaceMatchState } from '../ui/FindAndReplace';
import {
  sortRecords,
  filterRecordsWithAdvanced,
  replaceValueInRecords,
  type SortDirection,
  type AdvancedCondition,
} from '@/utils/tableFilter';
import { Trash2, Plus, UploadCloud, Pencil, Lock, ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react';
import { notify } from '@/utils/toastNotify';
import { cn } from '@/utils/cn';
import { formatDateToDDMMYY, formatDateForInput } from '@/utils/dateUtils';
import { formatCurrencySymbol } from '@/utils/currency';
import { useOptimisticEntityList } from '@/hooks/useOptimisticEntityList';
import { formatExpiryToDDMMMYY } from '@/utils/securityName';
import type { ColumnDefinition } from '../ui/ColumnSettingsPopover';

type DateFilterMode = 'ALL' | 'DATE' | 'MONTH' | 'RANGE';

function parseTradeDateString(dateVal: any): { yyyyMmDd: string; yyyyMm: string; time: number } | null {
  if (!dateVal) return null;
  const iso = formatDateForInput(dateVal);
  if (iso) {
    const parts = iso.split('-');
    return {
      yyyyMmDd: iso,
      yyyyMm: `${parts[0]}-${parts[1]}`,
      time: new Date(`${iso}T00:00:00Z`).getTime(),
    };
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const yyyyMmDd = `${yyyy}-${mm}-${dd}`;
  return {
    yyyyMmDd,
    yyyyMm: `${yyyy}-${mm}`,
    time: d.getTime(),
  };
}

const TRADE_COLUMNS: ColumnDefinition[] = [
  { key: 'tradeDate', label: 'Date & Trade No', isDefault: true, required: true },
  { key: 'securityName', label: 'Security & Symbol', isDefault: true, required: true },
  { key: 'expiry', label: 'Expiry', isDefault: true, required: true },
  { key: 'transactionType', label: 'Side / Type', isDefault: true, required: true },
  { key: 'quantity', label: 'Quantity', isDefault: true, required: true },
  { key: 'client', label: 'Client & Rate', isDefault: true, required: true },
  { key: 'broker', label: 'Broker & Rate', isDefault: true, required: true },
  { key: 'price', label: 'Market Rate', isDefault: true },
  { key: 'exchange.code', label: 'Exchange', isDefault: false },
  { key: 'clientRate', label: 'Client Rate', isDefault: false },
  { key: 'brokerRate', label: 'Broker Rate', isDefault: false },
  { key: 'clientBrokerage', label: 'Client Brk', isDefault: false },
  { key: 'brokerBrokerage', label: 'Broker Brk', isDefault: false },
  { key: 'tradeType', label: 'Trade Type', isDefault: false },
];

const DEFAULT_VISIBLE_COLUMNS = [
  'tradeDate',
  'securityName',
  'expiry',
  'transactionType',
  'quantity',
  'client',
  'broker',
  'price',
];

export function TradesPageManager({
  exchanges,
  accounts,
  scripts,
  initialTrades,
  settlements = [],
  initialExpiries = [],
}: {
  exchanges: any[];
  accounts: any[];
  scripts: any[];
  initialTrades: any[];
  settlements?: any[];
  initialExpiries?: any[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isImportParam = searchParams.get('import') === 'true';
  const isAddParam = searchParams.get('action') === 'add';

  const [isImportModalOpen, setIsImportModalOpen] = useState(isImportParam);
  const [isAdding, setIsAdding] = useState(isAddParam);
  const [editingTrade, setEditingTrade] = useState<any | null>(null);
  const [viewingTrade, setViewingTrade] = useState<any | null>(null);

  const removeQueryParam = useCallback((paramKey: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.has(paramKey)) {
      url.searchParams.delete(paramKey);
      const cleanUrl = url.pathname + (url.search ? url.search : '');
      window.history.pushState({}, '', cleanUrl);
    }
  }, []);

  const handleCloseAdd = useCallback(() => {
    setIsAdding(false);
    removeQueryParam('action');
  }, [removeQueryParam]);

  const handleCloseImport = useCallback(() => {
    setIsImportModalOpen(false);
    removeQueryParam('import');
  }, [removeQueryParam]);

  // Synchronize when searchParams change or custom event is received
  useEffect(() => {
    if (isAddParam) {
      setIsAdding(true);
    }
    if (isImportParam) {
      setIsImportModalOpen(true);
    }
  }, [isAddParam, isImportParam]);

  useEffect(() => {
    const handleOpenAdd = () => {
      setIsAdding(true);
    };
    window.addEventListener('bizzmate-open-add-trade', handleOpenAdd);
    return () => window.removeEventListener('bizzmate-open-add-trade', handleOpenAdd);
  }, []);

  const {
    items: trades,
    setItems: setTrades,
    addEntity,
    updateEntity,
    removeEntity,
    syncWithServer,
  } = useOptimisticEntityList<any>(initialTrades);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [expiryList, setExpiryList] = useState<any[]>(initialExpiries || []);
  const [expiryFilter, setExpiryFilter] = useState('');

  // Primary business filters
  const [settlementFilter, setSettlementFilter] = useState<string>('OPEN');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [brokerFilter, setBrokerFilter] = useState<string>('');
  const [scriptFilter, setScriptFilter] = useState<string>('');

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

  // Date filter state: defaults from earliest open trade to latest open trade in data
  const [fromDate, setFromDate] = useState<string>(() => {
    const openTrades = (initialTrades || []).filter((t: any) => !t.settlementId && t.tradeDate);
    if (openTrades.length === 0) return '';
    return openTrades.reduce((min: string, t: any) => {
      const parts = parseTradeDateString(t.tradeDate);
      if (!parts) return min;
      return !min || parts.yyyyMmDd < min ? parts.yyyyMmDd : min;
    }, '');
  });
  const [toDate, setToDate] = useState<string>(() => {
    const openTrades = (initialTrades || []).filter((t: any) => !t.settlementId && t.tradeDate);
    if (openTrades.length === 0) return '';
    return openTrades.reduce((max: string, t: any) => {
      const parts = parseTradeDateString(t.tradeDate);
      if (!parts) return max;
      return !max || parts.yyyyMmDd > max ? parts.yyyyMmDd : max;
    }, '');
  });

  // Sorting & Pagination
  const [sortKey, setSortKey] = useState<string | null>('tradeDate');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isDeleting, setIsDeleting] = useState(false);

  const { setTopBar, resetTopBar } = useTopBar();

  // Push clean simple title & page action buttons to unified TopBar
  useEffect(() => {
    setTopBar({
      title: 'Trades',
      actions: (
        <div className="flex items-center gap-2">
          <UniversalTooltip content="Add a new trade entry (Alt+N)">
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="h-9 px-3.5 bg-[#2652C8] hover:bg-[#1F42A3] text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Trade</span>
            </button>
          </UniversalTooltip>
          <UniversalTooltip content="Bulk import trades from Excel or CSV file">
            <button
              type="button"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('import', 'true');
                window.history.pushState({}, '', url.toString());
                setIsImportModalOpen(true);
              }}
              className="h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
              <span>Import File</span>
            </button>
          </UniversalTooltip>
        </div>
      ),
    });

    return () => resetTopBar();
  }, [setTopBar, resetTopBar]);

  // Sync state with query parameters (e.g. sidebar links)
  useEffect(() => {
    if (isImportParam) {
      setIsImportModalOpen(true);
    }
  }, [isImportParam]);

  // Update local trades list when initialTrades changes
  useEffect(() => {
    syncWithServer(initialTrades);
  }, [initialTrades, syncWithServer]);

  // Load active contract expiries from ExpiryDate master
  useEffect(() => {
    const fetchExpiries = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/expiry-dates?activeOnly=true`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setExpiryList(data);
          }
        }
      } catch (err) {
        console.error('Failed to load active expiry dates:', err);
      }
    };
    fetchExpiries();
  }, []);

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

  const settlementOptions = useMemo(() => [
    { value: 'OPEN', label: 'Open Positions' },
    { value: 'ALL', label: 'All Settlements' },
    ...(settlements || []).map((s: any) => ({
      value: s.id,
      label: s.name || `Settlement (${formatDateToDDMMYY(s.toDate)})`,
    })),
  ], [settlements]);

  const scriptOptions = useMemo(() => [
    { value: '', label: 'All Scripts' },
    ...(scripts || []).map((s: any) => ({
      value: s.id,
      label: `${s.fullName || s.shortName} (${s.shortName})`,
    })),
  ], [scripts]);

  const clientOptions = useMemo(() => [
    { value: '', label: 'All Clients' },
    ...clients.map((c: any) => ({
      value: c.id,
      label: `${c.name} (${c.code})`,
    })),
  ], [clients]);

  const brokerOptions = useMemo(() => [
    { value: '', label: 'All Brokers' },
    ...brokers.map((b: any) => ({
      value: b.id,
      label: `${b.name} (${b.code})`,
    })),
  ], [brokers]);

  const expiryFilterOptions = useMemo(() => [
    { value: '', label: 'All Expiries' },
    ...expiryList.map((exp: any) => {
      const expDate = exp.expiryDate || exp.date;
      const formatted = formatDateToDDMMYY(expDate);
      const code = formatExpiryToDDMMMYY(expDate);
      return {
        value: formatted,
        label: `${formatted} (${code})`,
      };
    }),
  ], [expiryList]);

  const typeOptions = useMemo(() => [
    { value: '', label: 'All' },
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

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Filter trades list with column targeting + advanced conditions + business filters
  const filteredTrades = useMemo(() => {
    let list = filterRecordsWithAdvanced(trades, searchQuery, searchColumn, advancedConditions);

    // 1. Settlement filter (default 'OPEN' shows only open/unsettled positions)
    if (settlementFilter === 'OPEN') {
      list = list.filter((t) => !t.settlementId);
    } else if (settlementFilter !== 'ALL' && settlementFilter) {
      list = list.filter((t) => t.settlementId === settlementFilter);
    }

    // 2. Client filter
    if (clientFilter) {
      list = list.filter((t) => t.accountId === clientFilter);
    }

    // 3. Broker filter
    if (brokerFilter) {
      list = list.filter((t) => t.brokerId === brokerFilter);
    }

    // 4. Script filter
    if (scriptFilter) {
      list = list.filter((t) => t.scriptId === scriptFilter);
    }

    // 5. Exchange filter
    if (exchangeFilter) list = list.filter((t) => t.exchange?.code === exchangeFilter);

    // 6. Buy/Sell Type filter
    if (typeFilter) list = list.filter((t) => t.transactionType === typeFilter);

    // 7. Trade Type filter
    if (tradeTypeFilter) {
      list = list.filter((t) =>
        tradeTypeFilter === 'REGULAR'
          ? !t.tradeType || t.tradeType === 'REGULAR'
          : t.tradeType === tradeTypeFilter
      );
    }

    // 8. Expiry filter
    if (expiryFilter) {
      list = list.filter((t) => {
        const formattedExp = formatDateToDDMMYY(t.expiry);
        return (
          formattedExp === expiryFilter ||
          String(t.expiry || '').toUpperCase().includes(expiryFilter.toUpperCase())
        );
      });
    }

    // 9. Date Range filter
    if (fromDate || toDate) {
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
    settlementFilter,
    clientFilter,
    brokerFilter,
    scriptFilter,
    exchangeFilter,
    typeFilter,
    tradeTypeFilter,
    fromDate,
    toDate,
    expiryFilter,
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
    notify.success(`Updated ${columnKey}`);
  };

  const handleReplaceAll = (columnKey: string, findVal: string, replaceVal: string) => {
    const { updatedRecords, count } = replaceValueInRecords(trades, columnKey, findVal, replaceVal, true);
    setTrades(updatedRecords);
    notify.success(`Replaced ${count} occurrences in ${columnKey}`);
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
      notify.error('Locked Trade', {
        description: 'Settlement-generated trades are locked and cannot be deleted.',
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Trade',
      message: 'Are you sure you want to delete this trade?',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        // Sub-16ms spontaneous optimistic removal
        removeEntity(id);
        notify.success('Trade deleted successfully');
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trades/${id}`, {
            method: 'DELETE',
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            notify.error(err.message || 'Server failed to delete trade');
          }
        } catch {
          notify.error('Failed to sync deletion with server');
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
      notify.error('Locked Trades Selected', {
        description: `Cannot delete selection: ${lockedCount} settlement trade(s) are locked.`,
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Trades',
      message: `Are you sure you want to delete all ${count} selected trades?`,
      confirmLabel: `Delete ${count} Trades`,
      onConfirm: async () => {
        setIsDeleting(true);
        const ids = Array.from(selectedIds);
        setTrades((prev) => prev.filter((t) => !selectedIds.has(t.id)));
        setSelectedIds(new Set());
        notify.success(`${count} trades deleted successfully`);
        try {
          await Promise.all(
            ids.map((id) =>
              fetch(`${process.env.NEXT_PUBLIC_API_URL}/trades/${id}`, {
                method: 'DELETE',
              })
            )
          );
        } catch {
          notify.error('Failed to delete some trades on server');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleSave = (savedTrade?: any) => {
    if (savedTrade && savedTrade.id) {
      if (editingTrade || viewingTrade) {
        updateEntity(savedTrade);
      } else {
        addEntity(savedTrade);
      }
    }
  };

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
        <span className="text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded font-bold shadow-2xs">→ {preview}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 relative">
      {isDeleting && <LoadingOverlay message="Deleting selected trades..." />}

      {/* Table Container Card (Clean unified card: Toolbar -> Secondary Filters -> Data Table) */}
      <div className="border border-slate-200/90 rounded-2xl shadow-xs bg-white overflow-hidden relative">
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
          columnSettings={{
            columns: TRADE_COLUMNS,
            visibleColumns,
            onChange: setVisibleColumns,
            storageKey: 'bizzmate_trades_visible_columns',
          }}
          showFindReplaceButton={true}
          isFindReplaceOpen={isFindReplaceOpen}
          onToggleFindReplace={() => setIsFindReplaceOpen(!isFindReplaceOpen)}
          selectedCount={selectedIds.size}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setSelectedIds(new Set())}
          isDeleting={isDeleting}
          compactSearch={true}
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[25, 50, 100, 200, { value: 999999, label: 'All' }]}
          className="border-0 rounded-none border-b border-slate-200/80 px-4 py-3"
          filterSlot={
            <div className="flex gap-2.5 items-center">
              {/* 1-Click Side Segmented Control: All / BUY / SELL */}
              <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 shrink-0 select-none">
                <UniversalTooltip content="Show all BUY and SELL trades">
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilter('');
                      setCurrentPage(1);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      !typeFilter
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    )}
                  >
                    All
                  </button>
                </UniversalTooltip>
                <UniversalTooltip content="Filter only BUY trades">
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilter('BUY');
                      setCurrentPage(1);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      typeFilter === 'BUY'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    )}
                  >
                    BUY
                  </button>
                </UniversalTooltip>
                <UniversalTooltip content="Filter only SELL trades">
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilter('SELL');
                      setCurrentPage(1);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      typeFilter === 'SELL'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-rose-700 hover:bg-rose-50'
                    )}
                  >
                    SELL
                  </button>
                </UniversalTooltip>
              </div>

              {/* Settlement Dropdown: Supports Open Positions, All Settlements, and specific cycles like Settlement 1 */}
              <div className="w-44 shrink-0">
                <UniversalDropdown
                  options={settlementOptions}
                  value={settlementFilter}
                  onChange={(val) => {
                    setSettlementFilter(val || 'OPEN');
                    setCurrentPage(1);
                  }}
                  placeholder="Settlement"
                  searchable={true}
                />
              </div>
            </div>
          }
        />

        {/* Secondary Granular Filter Shelf: Clean Single Shelf (Exchange, Expiry, Script, Client, Broker, Date Range, Reset) */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center gap-2 flex-wrap">
          <div className="w-32">
            <UniversalDropdown
              options={exchangeOptions}
              value={exchangeFilter}
              onChange={(val) => {
                setExchangeFilter(val);
                setCurrentPage(1);
              }}
              placeholder="All Exchanges"
              searchable={true}
            />
          </div>
          <div className="w-32">
            <UniversalDropdown
              options={expiryFilterOptions}
              value={expiryFilter}
              onChange={(val) => {
                setExpiryFilter(val);
                setCurrentPage(1);
              }}
              placeholder="All Expiries"
              searchable={true}
            />
          </div>
          <div className="w-36">
            <UniversalDropdown
              options={scriptOptions}
              value={scriptFilter}
              onChange={(val) => {
                setScriptFilter(val);
                setCurrentPage(1);
              }}
              placeholder="All Scripts"
              searchable={true}
            />
          </div>
          <div className="w-36">
            <UniversalDropdown
              options={clientOptions}
              value={clientFilter}
              onChange={(val) => {
                setClientFilter(val);
                setCurrentPage(1);
              }}
              placeholder="All Clients"
              searchable={true}
            />
          </div>
          <div className="w-36">
            <UniversalDropdown
              options={brokerOptions}
              value={brokerFilter}
              onChange={(val) => {
                setBrokerFilter(val);
                setCurrentPage(1);
              }}
              placeholder="All Brokers"
              searchable={true}
            />
          </div>
          <div className="w-60">
            <UniversalDateRangePicker
              startDate={fromDate}
              endDate={toDate}
              onChange={({ startDate, endDate }) => {
                setFromDate(startDate);
                setToDate(endDate);
                setCurrentPage(1);
              }}
              placeholder="Filter Date Range"
              compact={true}
            />
          </div>

          {(settlementFilter !== 'OPEN' || clientFilter || brokerFilter || scriptFilter || exchangeFilter || typeFilter || tradeTypeFilter || expiryFilter || fromDate || toDate) && (
            <UniversalTooltip content="Reset all active filters to default">
              <button
                type="button"
                onClick={() => {
                  setSettlementFilter('OPEN');
                  setClientFilter('');
                  setBrokerFilter('');
                  setScriptFilter('');
                  setExchangeFilter('');
                  setTypeFilter('');
                  setTradeTypeFilter('');
                  setExpiryFilter('');
                  setFromDate('');
                  setToDate('');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="h-8.5 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 cursor-pointer transition shadow-2xs shrink-0"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset</span>
              </button>
            </UniversalTooltip>
          )}
        </div>

        <div className="overflow-x-auto rounded-b-xl">
          <table className="data-table data-table-dense w-full text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-2xs">
              <tr className="whitespace-nowrap">
                <th style={{ width: '36px' }} className="text-center">
                  <CustomCheckbox
                    checked={isAllVisibleSelected}
                    onChange={handleToggleSelectAll}
                  />
                </th>
                {visibleColumns.includes('tradeDate') && (
                  <th
                    onClick={() => handleSort('tradeDate')}
                    className="cursor-pointer hover:bg-slate-100 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date &amp; Trade No</span>
                      {sortKey === 'tradeDate' ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('exchange.code') && (
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
                )}
                {visibleColumns.includes('securityName') && (
                  <th
                    onClick={() => handleSort('securityName')}
                    className="cursor-pointer hover:bg-slate-100 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Security &amp; Symbol</span>
                      {sortKey === 'securityName' ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('expiry') && (
                  <th
                    onClick={() => handleSort('expiry')}
                    className="cursor-pointer hover:bg-slate-100 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Expiry</span>
                      {sortKey === 'expiry' ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('transactionType') && (
                  <th
                    onClick={() => handleSort('transactionType')}
                    className="cursor-pointer hover:bg-slate-100 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Side / Type</span>
                      {sortKey === 'transactionType' ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('quantity') && (
                  <th
                    className="text-right cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Quantity</span>
                      {sortKey === 'quantity' ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('client') && (
                  <th
                    onClick={() => handleSort('account.name')}
                    className="cursor-pointer hover:bg-slate-100 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Client &amp; Rate</span>
                      {sortKey === 'account.name' ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('broker') && (
                  <th
                    onClick={() => handleSort('broker.name')}
                    className="cursor-pointer hover:bg-slate-100 select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Broker &amp; Rate</span>
                      {sortKey === 'broker.name' ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('price') && (
                  <th
                    className="text-right cursor-pointer hover:bg-slate-100 select-none font-semibold text-slate-700"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Market Rate</span>
                      {sortKey === 'price' ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('clientRate') && (
                  <th className="text-right font-semibold text-slate-600">
                    Client Rate
                  </th>
                )}
                {visibleColumns.includes('brokerRate') && (
                  <th className="text-right font-semibold text-slate-600">
                    Broker Rate
                  </th>
                )}
                {visibleColumns.includes('clientBrokerage') && (
                  <th className="text-right font-semibold text-slate-600">
                    Client Brk
                  </th>
                )}
                {visibleColumns.includes('brokerBrokerage') && (
                  <th className="text-right font-semibold text-slate-600">
                    Broker Brk
                  </th>
                )}
                {visibleColumns.includes('tradeType') && (
                  <th>Trade Type</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedTrades.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="py-12 text-center text-slate font-medium">
                    No trades match your search criteria.
                  </td>
                </tr>
              ) : null}
              {paginatedTrades.map((t, index) => {
                const secName = t.securityName || t.script?.fullName || t.script?.shortName || '—';
                const isSelected = selectedIds.has(t.id);
                const isMatched = findReplaceMatch?.matchedRowIndices.includes(index);
                const isActiveMatch = findReplaceMatch?.activeRowIndex === index;
                
                // Dynamic currency symbol resolution
                const currSym = formatCurrencySymbol(
                  t.script?.currency?.symbol,
                  t.script?.currency?.code || t.currencyCode
                );

                return (
                  <tr
                    key={t.id}
                    ref={(el) => {
                      if (isActiveMatch && el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }
                    }}
                    onClick={() => setViewingTrade(t)}
                    className={cn(
                      'transition-colors cursor-pointer select-none whitespace-nowrap',
                      isSelected && 'bg-blue-50/60 hover:bg-blue-50/80',
                      !isSelected && isMatched && !isActiveMatch && 'bg-amber-50/60 hover:bg-amber-100/60',
                      isActiveMatch && 'bg-amber-100/90 ring-2 ring-amber-400 font-semibold shadow-xs',
                      !isSelected && !isMatched && !isActiveMatch && 'hover:bg-slate-50'
                    )}
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
                    {visibleColumns.includes('tradeDate') && (
                      <td className="text-slate text-xs whitespace-nowrap">
                        <div className="font-mono font-medium text-slate-800">
                          {renderWithDiff('tradeDate', formatDateToDDMMYY(t.tradeDate), isActiveMatch)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {t.tradeNumber || '—'}
                        </div>
                      </td>
                    )}
                    {visibleColumns.includes('exchange.code') && (
                      <td className="font-medium text-slate-600 text-xs whitespace-nowrap">
                        {renderWithDiff('exchange.code', t.exchange?.code || '—', isActiveMatch)}
                      </td>
                    )}

                    {visibleColumns.includes('securityName') && (
                      <td className="max-w-65 truncate whitespace-nowrap">
                        <div className="font-medium text-slate-800 text-xs truncate">
                          {renderWithDiff('securityName', secName, isActiveMatch)}
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal flex items-center gap-1.5 mt-0.5">
                          <span>{t.script?.shortName || '—'}</span>
                          {t.exchange?.code && (
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                              {t.exchange.code}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {visibleColumns.includes('expiry') && (
                      <td className="font-mono text-xs text-slate-600 whitespace-nowrap font-normal">
                        {renderWithDiff('expiry', formatDateToDDMMYY(t.expiry) || '—', isActiveMatch)}
                      </td>
                    )}

                    {visibleColumns.includes('transactionType') && (
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isActiveMatch && findReplaceMatch?.targetColumn === 'transactionType' ? (
                            renderWithDiff('transactionType', t.transactionType, true)
                          ) : (
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap',
                                t.transactionType === 'BUY'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              )}
                            >
                              {t.transactionType}
                            </span>
                          )}
                          {t.tradeType && t.tradeType !== 'INTERNAL' && t.tradeType !== 'REGULAR' && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {t.tradeType === 'CARRY_FORWARD' ? 'CF' : t.tradeType === 'BACK_FORWARD' ? 'BF' : t.tradeType === 'SETTLEMENT' ? 'SETTL' : t.tradeType}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {visibleColumns.includes('quantity') && (
                      <td className="font-mono font-medium text-right whitespace-nowrap text-slate-800">
                        {Math.abs(t.quantity).toLocaleString()}
                      </td>
                    )}

                    {visibleColumns.includes('client') && (
                      <td className="font-mono text-xs whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {renderWithDiff('account.code', t.account?.code || t.account?.name || '—', isActiveMatch)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {(() => {
                            const rateVal = t.clientRate != null ? t.clientRate : t.rate;
                            const brk = t.clientBrokerage ?? 0;
                            if (brk > 0) {
                              return `Rate: ${currSym}${rateVal.toFixed(2)} (+${currSym}${brk.toFixed(2)})`;
                            }
                            return `Rate: ${currSym}${rateVal.toFixed(2)}`;
                          })()}
                        </div>
                      </td>
                    )}

                    {visibleColumns.includes('broker') && (
                      <td className="font-mono text-xs whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {renderWithDiff('broker.code', t.broker?.code || t.broker?.name || '—', isActiveMatch)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {(() => {
                            const rateVal = t.brokerRate != null ? t.brokerRate : t.rate;
                            const brk = t.brokerBrokerage ?? 0;
                            if (brk > 0) {
                              return `Rate: ${currSym}${rateVal.toFixed(2)} (+${currSym}${brk.toFixed(2)})`;
                            }
                            return `Rate: ${currSym}${rateVal.toFixed(2)}`;
                          })()}
                        </div>
                      </td>
                    )}

                    {/* Market Rate & Brokerage Columns (Uniform modern styling) */}
                    {visibleColumns.includes('price') && (
                      <td className="font-mono text-right text-xs whitespace-nowrap font-semibold text-slate-900">
                        {currSym}{t.rate.toFixed(2)}
                      </td>
                    )}
                    {visibleColumns.includes('clientRate') && (
                      <td className="font-mono text-right text-xs whitespace-nowrap font-normal text-slate-700">
                        {t.clientRate != null ? `${currSym}${t.clientRate.toFixed(2)}` : '—'}
                      </td>
                    )}
                    {visibleColumns.includes('brokerRate') && (
                      <td className="font-mono text-right text-xs whitespace-nowrap font-normal text-slate-700">
                        {t.brokerRate != null ? `${currSym}${t.brokerRate.toFixed(2)}` : '—'}
                      </td>
                    )}
                    {visibleColumns.includes('clientBrokerage') && (
                      <td className="font-mono text-right text-xs whitespace-nowrap font-normal text-slate-500">
                        {t.clientBrokerage != null && t.clientBrokerage > 0 ? `${currSym}${t.clientBrokerage.toFixed(2)}` : `${currSym}0.00`}
                      </td>
                    )}
                    {visibleColumns.includes('brokerBrokerage') && (
                      <td className="font-mono text-right text-xs whitespace-nowrap font-normal text-slate-500">
                        {t.brokerBrokerage != null && t.brokerBrokerage > 0 ? `${currSym}${t.brokerBrokerage.toFixed(2)}` : `${currSym}0.00`}
                      </td>
                    )}

                    {visibleColumns.includes('tradeType') && (
                      <td className="whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border whitespace-nowrap',
                            t.tradeType === 'CARRY_FORWARD' && 'bg-amber-50 text-amber-800 border-amber-200',
                            t.tradeType === 'BACK_FORWARD' && 'bg-indigo-50 text-indigo-800 border-indigo-200',
                            t.tradeType === 'SETTLEMENT' && 'bg-blue-50 text-blue-800 border-blue-200',
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
                    )}
                  </tr>
                );
              })}
            </tbody>
            {/* Sticky Total / Summary Row */}
            <tfoot className="sticky bottom-0 bg-slate-100/95 border-t-2 border-slate-300 font-bold text-xs text-slate-800">
              <tr>
                <td className="py-2.5 px-4 text-center" colSpan={Math.max(1, visibleColumns.length - 1)}>
                  Visible Trades: {visibleStats.count} of {totalItems} (Page {currentPage} of {Math.max(1, Math.ceil(totalItems / pageSize))})
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                  <div className="text-[10px] text-slate-500 font-normal">Buy: {visibleStats.buyQty.toLocaleString()} | Sell: {visibleStats.sellQty.toLocaleString()}</div>
                  <div>Net: {visibleStats.netQty > 0 ? `+${visibleStats.netQty.toLocaleString()}` : visibleStats.netQty.toLocaleString()}</div>
                </td>
                <td className="py-2.5 px-3"></td>
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
          initialMode="edit"
          onClose={handleCloseAdd}
          onSave={(saved) => {
            handleSave(saved);
            handleCloseAdd();
          }}
        />
      )}

      {/* Unified View / Edit / Delete Modal */}
      {viewingTrade && (
        <TradeFormModal
          exchanges={exchanges}
          scripts={scripts}
          clients={clients}
          brokers={brokers}
          initialTrade={viewingTrade}
          initialMode="view"
          onClose={() => setViewingTrade(null)}
          onSave={(saved) => {
            handleSave(saved);
            setViewingTrade(null);
          }}
          onDelete={async (id) => {
            removeEntity(id);
            setViewingTrade(null);
            notify.success('Trade deleted successfully');
            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trades/${id}`, {
                method: 'DELETE',
              });
              if (!res.ok) {
                notify.error('Failed to sync deletion with server');
              }
            } catch {
              notify.error('Failed to sync deletion with server');
            }
          }}
        />
      )}

      {/* Bulk Trade Import Modal (Preserves parsed state across open/close) */}
      <TradeImportModal
        isOpen={isImportModalOpen}
        onClose={handleCloseImport}
        onComplete={() => {
          handleCloseImport();
          router.refresh();
        }}
      />

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
