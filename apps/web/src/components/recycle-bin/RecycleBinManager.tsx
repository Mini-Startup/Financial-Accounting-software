'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  RotateCcw, Trash2, Search, RefreshCw, CheckSquare, Square, 
  Building2, TrendingUp, Receipt, FileSpreadsheet, Layers, 
  Layers2, Calendar, Percent, X, AlertCircle, CheckCircle2,
  Clock, ArrowUpDown, Filter
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UniversalTooltip } from '@/components/ui/UniversalTooltip';
import { UniversalDatePicker } from '@/components/ui/UniversalDatePicker';
import { useTopBar } from '@/context/TopBarContext';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';

export interface RecycleBinItem {
  id: string;
  entityType: 'trade' | 'account' | 'closingRate' | 'script' | 'voucher' | 'brokerage' | 'expiryDate' | 'group';
  entityLabel: string;
  primaryIdentifier: string;
  secondaryIdentifier?: string;
  details: Record<string, any>;
  deletedAt: string;
  createdAt?: string;
}

export interface RecycleBinCounts {
  all: number;
  trades: number;
  accounts: number;
  closingRates: number;
  scripts: number;
  vouchers: number;
  brokerages: number;
  expiryDates: number;
  groups: number;
}

interface RecycleBinManagerProps {
  initialData?: {
    items: RecycleBinItem[];
    counts: RecycleBinCounts;
  };
}

export function RecycleBinManager({ initialData }: RecycleBinManagerProps) {
  const { setTopBar, resetTopBar } = useTopBar();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [items, setItems] = useState<RecycleBinItem[]>(initialData?.items || []);
  const [counts, setCounts] = useState<RecycleBinCounts>(
    initialData?.counts || {
      all: 0,
      trades: 0,
      accounts: 0,
      closingRates: 0,
      scripts: 0,
      vouchers: 0,
      brokerages: 0,
      expiryDates: 0,
      groups: 0,
    }
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Restore modals state
  const [singleRestoreTarget, setSingleRestoreTarget] = useState<RecycleBinItem | null>(null);
  const [isBulkRestoreOpen, setIsBulkRestoreOpen] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch Recycle Bin items from backend
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('type', activeTab);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);

      const res = await fetch(`${apiUrl}/recycle-bin?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch deleted items: ${res.statusText}`);
      }
      const data = await res.json();
      setItems(data.items || []);
      if (data.counts) setCounts(data.counts);
      // Clear selections that no longer exist
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error('Recycle bin error:', err);
      toast.error(err.message || 'Error fetching deleted items');
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, activeTab, searchQuery, fromDate, toDate]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Set TopBar header
  useEffect(() => {
    setTopBar({
      title: 'Recycle Bin & Recovery',
      actions: (
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setIsBulkRestoreOpen(true)}
              className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 animate-in fade-in zoom-in-95 duration-150"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Restore Selected ({selectedIds.size})</span>
            </button>
          )}
          <UniversalTooltip content="Refresh deleted items list">
            <button
              type="button"
              onClick={fetchItems}
              disabled={isLoading}
              className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 text-slate-500', isLoading && 'animate-spin')} />
              <span>Refresh</span>
            </button>
          </UniversalTooltip>
        </div>
      ),
    });
    return () => resetTopBar();
  }, [setTopBar, resetTopBar, selectedIds.size, fetchItems, isLoading]);

  // Single Item Restore Handler
  const handleSingleRestore = async () => {
    if (!singleRestoreTarget) return;
    setIsRestoring(true);
    try {
      const res = await fetch(`${apiUrl}/recycle-bin/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: singleRestoreTarget.entityType,
          id: singleRestoreTarget.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to restore item');
      }

      toast.success(`${singleRestoreTarget.entityLabel} "${singleRestoreTarget.primaryIdentifier}" restored successfully!`);
      setSingleRestoreTarget(null);
      await fetchItems();
    } catch (err: any) {
      toast.error(err.message || 'Restoration failed');
    } finally {
      setIsRestoring(false);
    }
  };

  // Bulk Items Restore Handler
  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    setIsRestoring(true);
    try {
      const payload = items
        .filter((item) => selectedIds.has(item.id))
        .map((item) => ({ entityType: item.entityType, id: item.id }));

      const res = await fetch(`${apiUrl}/recycle-bin/restore-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to restore selected items');
      }

      if (data.failedCount > 0) {
        toast.warning(`Restored ${data.restoredCount} items, but ${data.failedCount} had conflicts.`);
      } else {
        toast.success(`Successfully restored all ${data.restoredCount} selected items!`);
      }

      setIsBulkRestoreOpen(false);
      setSelectedIds(new Set());
      await fetchItems();
    } catch (err: any) {
      toast.error(err.message || 'Bulk restoration failed');
    } finally {
      setIsRestoring(false);
    }
  };

  // Selection helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(items.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Strictly format date to DD-MM-YYYY HH:mm
  const formatDeletedDate = (isoStr: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch {
      return isoStr;
    }
  };

  // Color & Icon mapping per entity type
  const getEntityBadge = (type: string, label: string) => {
    switch (type) {
      case 'trade':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
            <TrendingUp className="w-3 h-3 text-indigo-600" />
            <span>{label}</span>
          </span>
        );
      case 'account':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
            <Building2 className="w-3 h-3 text-blue-600" />
            <span>{label}</span>
          </span>
        );
      case 'closingRate':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
            <span>{label}</span>
          </span>
        );
      case 'script':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
            <Layers className="w-3 h-3 text-amber-600" />
            <span>{label}</span>
          </span>
        );
      case 'voucher':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
            <Receipt className="w-3 h-3 text-purple-600" />
            <span>{label}</span>
          </span>
        );
      case 'brokerage':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80">
            <Percent className="w-3 h-3 text-sky-600" />
            <span>{label}</span>
          </span>
        );
      case 'expiryDate':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200/80">
            <Calendar className="w-3 h-3 text-orange-600" />
            <span>{label}</span>
          </span>
        );
      case 'group':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Layers2 className="w-3 h-3 text-slate-500" />
            <span>{label}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span>{label}</span>
          </span>
        );
    }
  };

  const tabs = [
    { id: 'all', label: 'All Items', count: counts.all, icon: Trash2 },
    { id: 'trades', label: 'Trades', count: counts.trades, icon: TrendingUp },
    { id: 'accounts', label: 'Clients & Brokers', count: counts.accounts, icon: Building2 },
    { id: 'closingRates', label: 'Closing Rates', count: counts.closingRates, icon: FileSpreadsheet },
    { id: 'scripts', label: 'Scripts', count: counts.scripts, icon: Layers },
    { id: 'vouchers', label: 'Vouchers', count: counts.vouchers, icon: Receipt },
    { id: 'brokerages', label: 'Brokerages', count: counts.brokerages, icon: Percent },
    { id: 'expiryDates', label: 'Expiry Dates', count: counts.expiryDates, icon: Calendar },
    { id: 'groups', label: 'Groups', count: counts.groups, icon: Layers2 },
  ];

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < items.length;

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-4">
      {/* ── Banner Card ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2652C8] flex items-center justify-center font-bold">
              <RotateCcw className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Recycle Bin & Data Recovery</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {counts.all} Deleted Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Soft-deleted records are securely archived. You can inspect deleted records across trades, accounts, closing rates, vouchers, and masters, and restore them back into the active ledger anytime.
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
            <span className="font-semibold text-slate-900">{counts.trades}</span> Trades
          </div>
          <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
            <span className="font-semibold text-slate-900">{counts.accounts}</span> Accounts
          </div>
          <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
            <span className="font-semibold text-slate-900">{counts.closingRates}</span> Rates
          </div>
          <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
            <span className="font-semibold text-slate-900">{counts.vouchers}</span> Vouchers
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0',
                isActive
                  ? 'bg-[#0A1A4A] text-white shadow-2xs font-semibold'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-white' : 'text-slate-400')} />
              <span>{tab.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Filter Bar ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code, name, identifier..."
            className="w-full pl-9 pr-8 h-9 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2652C8] focus:border-[#2652C8]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter & Clear */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Deleted Date:</span>
          </div>

          <div className="w-36">
            <UniversalDatePicker
              value={fromDate}
              onChange={(val) => setFromDate(val || '')}
              placeholder="From Date"
            />
          </div>

          <span className="text-slate-400 text-xs">to</span>

          <div className="w-36">
            <UniversalDatePicker
              value={toDate}
              onChange={(val) => setToDate(val || '')}
              placeholder="To Date"
            />
          </div>

          {(fromDate || toDate || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setFromDate('');
                setToDate('');
                setSearchQuery('');
              }}
              className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Data Table Card ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Header / Selection Status */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50/70 border-b border-blue-200/70 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-900">
                {selectedIds.size} {selectedIds.size === 1 ? 'record' : 'records'} selected
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsBulkRestoreOpen(true)}
              className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <RotateCcw className="w-3 h-3 stroke-[2.5]" />
              <span>Restore All Selected</span>
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-[#2652C8] focus:ring-[#2652C8] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 w-36">Entity Type</th>
                <th className="py-3 px-4 w-48">Identifier</th>
                <th className="py-3 px-4">Summary & Details</th>
                <th className="py-3 px-4 w-48">Deleted Timestamp</th>
                <th className="py-3 px-4 w-28 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-xs font-medium text-slate-600">Loading deleted records...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <Trash2 className="w-6 h-6 stroke-[1.7]" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800">Recycle Bin is Empty</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {searchQuery || fromDate || toDate
                        ? 'No deleted items matched your filters. Try clearing the search or date query.'
                        : 'No deleted items in this category. All operations and master records are active.'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'hover:bg-slate-50/80 transition-colors group',
                        isSelected && 'bg-blue-50/40'
                      )}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#2652C8] focus:ring-[#2652C8] cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getEntityBadge(item.entityType, item.entityLabel)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{item.primaryIdentifier}</div>
                        {item.secondaryIdentifier && (
                          <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                            {item.secondaryIdentifier}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-xs text-slate-600">
                          {item.entityType === 'trade' && (
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-slate-800">
                                {item.details.accountName} ({item.details.accountCode})
                              </span>
                              <span className="text-slate-400">•</span>
                              <span>
                                {item.details.transactionType} {item.details.quantity} @ ₹{item.details.rate}
                              </span>
                              {item.details.brokerName && (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-500">Broker: {item.details.brokerName}</span>
                                </>
                              )}
                            </div>
                          )}

                          {item.entityType === 'account' && (
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-slate-800">{item.details.name}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500">Group: {item.details.group}</span>
                              {item.details.mobileNumber && (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-500">{item.details.mobileNumber}</span>
                                </>
                              )}
                            </div>
                          )}

                          {item.entityType === 'closingRate' && (
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-slate-800">₹{item.details.rate?.toFixed(2)}</span>
                              <span className="text-slate-400">•</span>
                              <span>Exchange: {item.details.exchange || 'NSE'}</span>
                            </div>
                          )}

                          {item.entityType === 'script' && (
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-slate-800">{item.details.fullName}</span>
                              <span className="text-slate-400">•</span>
                              <span>Lot: {item.details.lotSize}</span>
                            </div>
                          )}

                          {item.entityType === 'voucher' && (
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-slate-800">
                                Total: ₹{item.details.totalAmount?.toFixed(2)}
                              </span>
                              <span className="text-slate-400">•</span>
                              <span>{item.details.lineCount} Lines</span>
                              {item.details.remarks && (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-500 italic truncate max-w-xs">{item.details.remarks}</span>
                                </>
                              )}
                            </div>
                          )}

                          {item.entityType === 'brokerage' && (
                            <div className="flex items-center gap-3">
                              <span>Scope: {item.details.scope}</span>
                              <span className="text-slate-400">•</span>
                              <span className="font-medium text-slate-800">Tariff: ₹{item.details.brokerage}</span>
                            </div>
                          )}

                          {item.entityType === 'expiryDate' && (
                            <div className="flex items-center gap-2">
                              <span>Contract Expiry Date: {item.details.date}</span>
                            </div>
                          )}

                          {item.entityType === 'group' && (
                            <div className="flex items-center gap-2">
                              <span>Account Master Group: {item.details.name}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDeletedDate(item.deletedAt)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <UniversalTooltip content={`Restore ${item.primaryIdentifier} back to active records`}>
                          <button
                            type="button"
                            onClick={() => setSingleRestoreTarget(item)}
                            className="h-8 px-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 stroke-[2.2]" />
                            <span>Restore</span>
                          </button>
                        </UniversalTooltip>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Single Restore Confirmation Dialog ───────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(singleRestoreTarget)}
        title="Restore Deleted Record"
        message={
          singleRestoreTarget ? (
            <div className="space-y-2 text-xs">
              <p>
                Are you sure you want to restore the deleted{' '}
                <strong className="text-slate-900 font-semibold">{singleRestoreTarget.entityLabel}</strong>:
              </p>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-mono font-bold text-slate-900 text-sm">
                  {singleRestoreTarget.primaryIdentifier}
                </div>
                {singleRestoreTarget.secondaryIdentifier && (
                  <div className="text-slate-600">{singleRestoreTarget.secondaryIdentifier}</div>
                )}
                <div className="text-slate-400 text-[11px] pt-1">
                  Deleted at: {formatDeletedDate(singleRestoreTarget.deletedAt)}
                </div>
              </div>
              <p className="text-slate-500 pt-1">
                This record will be immediately returned to its active list and made available across reports and transactions.
              </p>
            </div>
          ) : (
            ''
          )
        }
        confirmLabel="Confirm & Restore"
        cancelLabel="Cancel"
        variant="success"
        isLoading={isRestoring}
        onConfirm={handleSingleRestore}
        onCancel={() => setSingleRestoreTarget(null)}
      />

      {/* ── Bulk Restore Confirmation Dialog ─────────────────────── */}
      <ConfirmDialog
        isOpen={isBulkRestoreOpen}
        title="Restore Selected Records"
        message={
          <div className="space-y-2 text-xs">
            <p>
              Are you sure you want to restore{' '}
              <strong className="text-slate-900 font-semibold">{selectedIds.size} selected records</strong>?
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 max-h-40 overflow-y-auto space-y-1">
              {items
                .filter((i) => selectedIds.has(i.id))
                .slice(0, 10)
                .map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-semibold text-slate-800">{i.primaryIdentifier}</span>
                    <span className="text-slate-500">{i.entityLabel}</span>
                  </div>
                ))}
              {selectedIds.size > 10 && (
                <div className="text-[11px] text-slate-400 italic pt-1 text-center">
                  ...and {selectedIds.size - 10} more records
                </div>
              )}
            </div>
            <p className="text-slate-500 pt-1">
              All chosen records will be reactivated in their respective modules and ledger systems.
            </p>
          </div>
        }
        confirmLabel={`Restore ${selectedIds.size} Records`}
        cancelLabel="Cancel"
        variant="success"
        isLoading={isRestoring}
        onConfirm={handleBulkRestore}
        onCancel={() => setIsBulkRestoreOpen(false)}
      />
    </div>
  );
}
