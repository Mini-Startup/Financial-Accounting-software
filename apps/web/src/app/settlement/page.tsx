'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { 
  Search, Calculator, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, 
  Eye, EyeOff, Layers, Zap, AlertCircle, X, Check, Trash2, FileText
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

interface SettlementItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  role: 'CLIENT' | 'BROKER';
  securityName: string;
  scriptId: string;
  scriptShortName: string;
  scriptFullName: string;
  exchangeId: string;
  exchangeCode: string;
  currencyCode?: string;
  currencySymbol?: string;
  expiry: string | null;
  buyQty: number;
  buyVal: number;
  buyAvgRate: number;
  sellQty: number;
  sellVal: number;
  sellAvgRate: number;
  netQty: number;
  netVal: number;
  netAvgRate: number;
  realizedPnL: number;
  closingRate: number | null;
}

interface SettlementRecord {
  id: string;
  name: string;
  fromDate: string;
  toDate: string;
  createdAt: string;
  _count?: { trades: number };
}

export default function SettlementPage() {
  const [reportDate, setReportDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SettlementItem[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showAutoCalculated, setShowAutoCalculated] = useState(false);

  // Settlement Cycles state
  const [settlementsList, setSettlementsList] = useState<SettlementRecord[]>([]);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string>('LIVE');
  const [isLoadingSettlements, setIsLoadingSettlements] = useState(false);

  // Settlement Execution Preview state
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    preview: any[];
    errors: any[];
    settlementFromDate: string;
    settlementToDate: string;
    unsettledTradesCount: number;
  } | null>(null);
  const [isExecutingSettlement, setIsExecutingSettlement] = useState(false);

  // Settlement Deletion state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    settlementId: string;
    settlementName: string;
  } | null>(null);
  const [isDeletingSettlement, setIsDeletingSettlement] = useState(false);

  // Historical Settlement Detail & Trades View
  const [settlementDetail, setSettlementDetail] = useState<{
    id: string;
    name: string;
    fromDate: string;
    toDate: string;
    trades: any[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'TRADES'>('SUMMARY');
  const [tradeSearchTerm, setTradeSearchTerm] = useState('');
  const [tradeTypeFilter, setTradeTypeFilter] = useState<string>('ALL');
  const [tradeActionFilter, setTradeActionFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CLIENT' | 'BROKER'>('ALL');
  const [positionFilter, setPositionFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');

  const fetchSettlementsList = async () => {
    setIsLoadingSettlements(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settlement/settlements`);
      if (res.ok) {
        const data = await res.json();
        setSettlementsList(data);
      }
    } catch (err) {
      console.error('Failed to load settlements list:', err);
    } finally {
      setIsLoadingSettlements(false);
    }
  };

  useEffect(() => {
    // Set default date to today
    const today = new Date();
    setReportDate(today.toISOString().split('T')[0]);
    fetchSettlementsList();
  }, []);

  const fetchSettlementSummary = async (date: string, settlementId: string = 'LIVE') => {
    let url = '';
    if (settlementId === 'LIVE') {
      url = `${process.env.NEXT_PUBLIC_API_URL}/settlement?settlementId=LIVE&date=${date}`;
    } else {
      url = `${process.env.NEXT_PUBLIC_API_URL}/settlement?settlementId=${settlementId}`;
    }

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setSummaryData(data);
      setHasGenerated(true);
      return data;
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate settlement summary');
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedSettlementId === 'LIVE' && !reportDate) {
      toast.error('Please select a Date');
      return;
    }

    setLoading(true);
    setShowAutoCalculated(false);
    try {
      await fetchSettlementSummary(reportDate, selectedSettlementId);
      toast.success(
        selectedSettlementId === 'LIVE'
          ? `Generated live positions summary up to ${reportDate}`
          : `Loaded summary for selected settlement`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to connect to the backend server');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettlementDetail = async (settlementId: string) => {
    if (!settlementId || settlementId === 'LIVE') {
      setSettlementDetail(null);
      return null;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settlement/settlements/${settlementId}`);
      if (res.ok) {
        const data = await res.json();
        setSettlementDetail(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to load settlement details:', err);
    }
    return null;
  };

  const handleSettlementSelectionChange = async (newSettlementId: string) => {
    setSelectedSettlementId(newSettlementId);
    setSummaryData([]);
    setActiveTab('SUMMARY');
    if (newSettlementId !== 'LIVE') {
      const s = settlementsList.find((item) => item.id === newSettlementId);
      const targetDate = s ? new Date(s.toDate).toISOString().split('T')[0] : reportDate;
      if (s) {
        setReportDate(targetDate);
      }
      setLoading(true);
      try {
        await Promise.all([
          fetchSettlementSummary(targetDate, newSettlementId),
          fetchSettlementDetail(newSettlementId),
        ]);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to load settlement data');
      } finally {
        setLoading(false);
      }
    } else {
      setSettlementDetail(null);
      setHasGenerated(false);
    }
  };

  // Auto-fetch whenever selectedSettlementId changes to a historical settlement
  useEffect(() => {
    if (selectedSettlementId !== 'LIVE' && selectedSettlementId) {
      const s = settlementsList.find((item) => item.id === selectedSettlementId);
      const targetDate = s ? new Date(s.toDate).toISOString().split('T')[0] : reportDate;
      setLoading(true);
      Promise.all([
        fetchSettlementSummary(targetDate, selectedSettlementId),
        fetchSettlementDetail(selectedSettlementId),
      ]).catch((err) => {
        console.error(err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [selectedSettlementId]);

  const handleOpenSettlementPreview = async () => {
    if (!reportDate) {
      toast.error('Please select a closing rate date for settlement.');
      return;
    }

    setIsExecutingSettlement(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settlement/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closingRateDate: reportDate }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Failed to compute settlement preview');
      }

      const data = await res.json();
      setPreviewModal({
        isOpen: true,
        preview: data.preview || [],
        errors: data.errors || [],
        settlementFromDate: data.settlementFromDate,
        settlementToDate: data.settlementToDate,
        unsettledTradesCount: data.unsettledTradesCount || 0,
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error computing settlement preview');
    } finally {
      setIsExecutingSettlement(false);
    }
  };

  const handleConfirmExecuteSettlement = async () => {
    if (!reportDate) return;
    setIsExecutingSettlement(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settlement/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closingRateDate: reportDate }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Failed to execute settlement');
      }

      const data = await res.json();
      toast.success(
        `Settlement created successfully! Added ${data.cfCount} CF trades, ${data.bfCount} BF trades, ${data.settlementCount} Settlement trades, and ${data.ledgerEntriesCount} Ledger entries.`
      );
      setPreviewModal(null);
      await fetchSettlementsList();
      if (data.settlement?.id) {
        setSelectedSettlementId(data.settlement.id);
        await Promise.all([
          fetchSettlementSummary(reportDate, data.settlement.id),
          fetchSettlementDetail(data.settlement.id),
        ]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error executing settlement');
    } finally {
      setIsExecutingSettlement(false);
    }
  };

  // Settlement Deletion
  const handleDeleteSettlement = async () => {
    if (!deleteConfirm) return;
    setIsDeletingSettlement(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settlement/settlements/${deleteConfirm.settlementId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete settlement');
      }

      const data = await res.json();
      toast.success(
        `"${data.settlementName}" deleted. Removed ${data.deletedGeneratedCount + data.deletedBfUnsettledCount} generated trades, ${data.untaggedTradesCount} trades un-tagged, ${data.deletedLedgerCount} ledger entries removed.`
      );
      setDeleteConfirm(null);
      setSelectedSettlementId('LIVE');
      setHasGenerated(false);
      setSummaryData([]);
      await fetchSettlementsList();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error deleting settlement');
    } finally {
      setIsDeletingSettlement(false);
    }
  };

  const isNewestSettlement = (id: string) => {
    if (settlementsList.length === 0) return false;
    return settlementsList[0]?.id === id; // List is ordered by toDate desc
  };

  // Filter logic
  const filteredData = summaryData.filter(item => {
    const matchesSearch = 
      item.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.scriptShortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.scriptFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.exchangeCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = 
      roleFilter === 'ALL' ? true : item.role === roleFilter;

    const matchesPosition = 
      positionFilter === 'ALL' ? true :
      positionFilter === 'OPEN' ? item.netQty !== 0 :
      item.netQty === 0;

    return matchesSearch && matchesRole && matchesPosition;
  });

  const settledData = filteredData.map(item => {
    const finalPnL = item.netQty === 0
      ? item.realizedPnL
      : item.closingRate !== null
        ? item.netQty * (item.closingRate - item.netAvgRate)
        : 0;
    return {
      ...item,
      finalPnL
    };
  });

  const getSym = (item: { currencySymbol?: string; currencyCode?: string }) =>
    item.currencySymbol || (item.currencyCode === 'INR' ? '₹' : '$');

  const totalVolume = filteredData.reduce((sum, item) => sum + item.buyQty + item.sellQty, 0);
  const openPositionsCount = filteredData.filter(item => item.netQty !== 0).length;
  const netTotalPnL = settledData.reduce((sum, item) => sum + item.finalPnL, 0);

  const pnlByCurrency = settledData.reduce((acc, item) => {
    const symbol = getSym(item);
    acc[symbol] = (acc[symbol] || 0) + item.finalPnL;
    return acc;
  }, {} as Record<string, number>);

  const pnlDisplayStr = Object.keys(pnlByCurrency).length === 0
    ? '$0.00'
    : Object.entries(pnlByCurrency)
        .map(([symbol, val]) => `${val >= 0 ? '+' : '-'}${symbol}${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        .join(' / ');

  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const getNextDayStr = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + 1);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const carryForwardDateFormatted = formatDateStr(reportDate);
  const backForwardDateFormatted = getNextDayStr(reportDate);
  const openPositions = filteredData.filter(item => item.netQty !== 0);

  // Filter settled trades for historical settlement view
  const filteredSettledTrades = (settlementDetail?.trades || []).filter((t: any) => {
    const q = tradeSearchTerm.toLowerCase();
    const matchesSearch =
      !tradeSearchTerm ||
      t.tradeNumber?.toLowerCase().includes(q) ||
      t.account?.code?.toLowerCase().includes(q) ||
      t.account?.name?.toLowerCase().includes(q) ||
      t.broker?.code?.toLowerCase().includes(q) ||
      t.broker?.name?.toLowerCase().includes(q) ||
      t.securityName?.toLowerCase().includes(q) ||
      t.script?.shortName?.toLowerCase().includes(q) ||
      t.script?.fullName?.toLowerCase().includes(q) ||
      t.remarks?.toLowerCase().includes(q);

    const matchesType = tradeTypeFilter === 'ALL' || t.tradeType === tradeTypeFilter;
    const matchesAction = tradeActionFilter === 'ALL' || t.transactionType === tradeActionFilter;

    return matchesSearch && matchesType && matchesAction;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">Settlement</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">
            Generate daily summarized trade positions, average rates, and manage settlement cycles.
          </p>
        </div>
      </div>

      {/* Settlement Cycle Selector Card */}
      <div className="card p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Settlement Period / Batch</span>
            </div>
            <h2 className="text-lg font-bold text-white">Select Settlement Cycle</h2>
            <p className="text-xs text-slate-300">
              View live open positions or select any finalized historical settlement batch.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedSettlementId}
              onChange={(e) => handleSettlementSelectionChange(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-4 py-2.5 font-medium focus:ring-2 focus:ring-emerald-400 focus:outline-none cursor-pointer"
            >
              <option value="LIVE">⚡ Live / Open Positions (Unsettled)</option>
              {settlementsList.map((s) => (
                <option key={s.id} value={s.id}>
                  📁 {s.name} ({formatDateStr(s.fromDate)} – {formatDateStr(s.toDate)}) • {s._count?.trades || 0} trades
                </option>
              ))}
            </select>
            <button
              onClick={() => handleGenerate()}
              disabled={loading}
              className="btn btn--primary text-xs flex items-center gap-1.5 py-2.5 px-4 rounded-xl"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date & Actions Form Card (For Live Settlements) */}
      {selectedSettlementId === 'LIVE' ? (
        <div className="card">
          <div className="card__body p-6">
            <form onSubmit={handleGenerate} className="flex flex-col md:flex-row items-end gap-6">
              <div className="form-field flex-1 max-w-xs">
                <label className="form-label form-label--required">Closing Rate Date (Cutoff)</label>
                <input 
                  type="date" 
                  value={reportDate} 
                  onChange={e => setReportDate(e.target.value)} 
                  className="input w-full"
                  required 
                />
              </div>

              <div className="flex items-center gap-3">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn btn--primary h-[42px] px-6 flex items-center justify-center gap-2 w-full md:w-auto shrink-0"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" />
                      Generate Summary
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenSettlementPreview}
                  disabled={isExecutingSettlement || !hasGenerated}
                  className="px-5 h-[42px] bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Compute and preview Carry Forward, Back Forward, and Settlement trades"
                >
                  {isExecutingSettlement ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-emerald-300" />}
                  <span>Generate CF/BF/Settlement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Historical Settlement Banner */
        <div className="card p-5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
              FINALIZED
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                {settlementsList.find(s => s.id === selectedSettlementId)?.name}
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Period: {formatDateStr(settlementsList.find(s => s.id === selectedSettlementId)?.fromDate || '')} to {formatDateStr(settlementsList.find(s => s.id === selectedSettlementId)?.toDate || '')}
                {' • '}{settlementsList.find(s => s.id === selectedSettlementId)?._count?.trades || 0} trades
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-emerald-800 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
              Read-only Historical Record
            </span>
            {isNewestSettlement(selectedSettlementId) && (
              <button
                onClick={() => {
                  const s = settlementsList.find(s => s.id === selectedSettlementId);
                  if (s) {
                    setDeleteConfirm({
                      isOpen: true,
                      settlementId: s.id,
                      settlementName: s.name,
                    });
                  }
                }}
                className="text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5"
                title="Delete this settlement (only the newest can be deleted)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Settlement
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab Switcher for Historical Settlement */}
      {selectedSettlementId !== 'LIVE' && (
        <div className="flex items-center gap-2 border-b border-[var(--sidebar-divider)] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('SUMMARY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'SUMMARY'
                ? 'bg-[var(--color-charcoal)] text-white shadow-xs'
                : 'text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-slate-100'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Position Summary</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TRADES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'TRADES'
                ? 'bg-[var(--color-charcoal)] text-white shadow-xs'
                : 'text-[var(--color-slate)] hover:text-[var(--color-charcoal)] hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              Settled Trades ({settlementDetail?.trades?.length ?? settlementsList.find(s => s.id === selectedSettlementId)?._count?.trades ?? 0})
            </span>
          </button>
        </div>
      )}

      {/* Loading state indicator */}
      {loading && (
        <div className="card p-12 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-[var(--color-forest)] animate-spin" />
          <p className="text-sm font-medium text-[var(--color-slate)]">Loading settlement data...</p>
        </div>
      )}

      {/* Historical Settled Trades Tab View */}
      {!loading && selectedSettlementId !== 'LIVE' && activeTab === 'TRADES' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Filters for Settled Trades */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-mist)] p-4 rounded-xl border border-[var(--sidebar-divider)]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
              <input
                type="text"
                placeholder="Search by trade #, party, broker, security..."
                value={tradeSearchTerm}
                onChange={(e) => setTradeSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-slate)] font-medium">Type:</span>
                <select
                  value={tradeTypeFilter}
                  onChange={(e) => setTradeTypeFilter(e.target.value)}
                  className="input py-1.5 px-3 text-xs"
                >
                  <option value="ALL">All Types</option>
                  <option value="CARRY_FORWARD">Carry Forward (CF)</option>
                  <option value="BACK_FORWARD">Back Forward (BF)</option>
                  <option value="SETTLEMENT">Settlement</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-slate)] font-medium">Action:</span>
                <select
                  value={tradeActionFilter}
                  onChange={(e) => setTradeActionFilter(e.target.value as any)}
                  className="input py-1.5 px-3 text-xs"
                >
                  <option value="ALL">All Actions</option>
                  <option value="BUY">BUY Only</option>
                  <option value="SELL">SELL Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Trades Table */}
          <div className="card">
            <div className="card__body p-0 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Trade #</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Broker</th>
                    <th>Security Name (Exchange)</th>
                    <th>Action</th>
                    <th className="text-right">Quantity</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Total Amount</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSettledTrades.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-[var(--color-slate)] font-medium">
                        No matching settled trades found in this settlement.
                      </td>
                    </tr>
                  ) : (
                    filteredSettledTrades.map((t: any) => {
                      const rate = t.clientRate ?? t.rate ?? 0;
                      const total = t.quantity * rate;
                      const sym = getSym(t);
                      const isBuy = t.transactionType === 'BUY';

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="font-mono text-xs font-semibold text-[var(--color-charcoal)]">
                            {t.tradeNumber || '—'}
                          </td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.tradeType === 'CARRY_FORWARD' ? 'bg-blue-100 text-blue-800' :
                              t.tradeType === 'BACK_FORWARD' ? 'bg-emerald-100 text-emerald-800' :
                              t.tradeType === 'SETTLEMENT' ? 'bg-purple-100 text-purple-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {t.tradeType}
                            </span>
                          </td>
                          <td className="font-mono text-xs text-[var(--color-slate)]">
                            {formatDateStr(t.tradeDate)}
                          </td>
                          <td>
                            <div className="font-mono font-medium text-[var(--color-charcoal)]">{t.account?.code}</div>
                            <div className="text-xs text-[var(--color-slate)] truncate max-w-[150px]">{t.account?.name}</div>
                          </td>
                          <td className="text-xs text-[var(--color-slate)]">
                            {t.broker?.code || '—'}
                          </td>
                          <td>
                            <div className="font-semibold text-[var(--color-charcoal)]">
                              {t.securityName || t.script?.fullName || t.script?.shortName}
                            </div>
                            <div className="text-[10px] text-[var(--color-slate)] font-mono">
                              {t.exchange?.code}{t.expiry ? ` • Exp: ${t.expiry}` : ''}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${isBuy ? 'badge--success' : 'badge--warning'} font-bold`}>
                              {t.transactionType}
                            </span>
                          </td>
                          <td className="text-right font-mono font-bold text-[var(--color-charcoal)]">
                            {t.quantity.toLocaleString('en-IN')}
                          </td>
                          <td className="text-right font-mono text-[var(--color-charcoal)]">
                            {sym}{rate.toFixed(2)}
                          </td>
                          <td className="text-right font-mono font-semibold text-[var(--color-charcoal)]">
                            {sym}{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="text-xs text-[var(--color-slate)] truncate max-w-[180px]" title={t.remarks || ''}>
                            {t.remarks || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Position Summary View (when activeTab === 'SUMMARY' or LIVE) */}
      {!loading && (activeTab === 'SUMMARY' || selectedSettlementId === 'LIVE') && hasGenerated && (
        <>
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <div className="card__body flex items-center justify-between p-6">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Total Settled P&L</p>
                  <h3 className={`text-h2 font-display mt-2 font-bold ${netTotalPnL >= 0 ? 'text-[var(--color-forest)]' : 'text-[var(--color-negative)]'}`}>
                    {pnlDisplayStr}
                  </h3>
                </div>
                <div className={`p-3 rounded-xl ${netTotalPnL >= 0 ? 'bg-emerald-50 text-[var(--color-forest)]' : 'bg-red-50 text-[var(--color-negative)]'}`}>
                  {netTotalPnL >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card__body flex items-center justify-between p-6">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Total Traded Volume</p>
                  <h3 className="text-h2 font-display mt-2 font-bold text-[var(--color-charcoal)]">
                    {totalVolume.toLocaleString('en-IN')} shares
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <Calculator className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card__body flex items-center justify-between p-6">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Open Positions (Scripts)</p>
                  <h3 className="text-h2 font-display mt-2 font-bold text-[var(--color-charcoal)]">
                    {openPositionsCount}
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                  <RefreshCw className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Settlement Summary Header with Toggle Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
            <h3 className="text-lg font-bold text-[var(--color-charcoal)]">Settlement Summary</h3>
            {openPositions.length > 0 && (
              <button
                onClick={() => setShowAutoCalculated(!showAutoCalculated)}
                className={`btn ${showAutoCalculated ? 'btn--primary' : 'btn--secondary'} flex items-center justify-center gap-2 text-xs py-2 px-4 shadow-sm`}
              >
                {showAutoCalculated ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Hide Auto-Calculated Trades
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Show Auto Calculated Trades
                  </>
                )}
              </button>
            )}
          </div>

          {/* Filters and List */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-mist)] p-4 rounded-xl border border-[var(--sidebar-divider)]">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-slate)]" />
                <input 
                  type="text"
                  placeholder="Search by client, broker, script..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>

              {/* Action Buttons & Dropdowns */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-slate)] font-medium">Role:</span>
                  <select 
                    value={roleFilter} 
                    onChange={e => setRoleFilter(e.target.value as any)} 
                    className="input py-1.5 px-3 text-xs"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="CLIENT">Client Only</option>
                    <option value="BROKER">Broker Only</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-slate)] font-medium">Position:</span>
                  <select 
                    value={positionFilter} 
                    onChange={e => setPositionFilter(e.target.value as any)} 
                    className="input py-1.5 px-3 text-xs"
                  >
                    <option value="ALL">All Positions</option>
                    <option value="OPEN">Open Positions</option>
                    <option value="CLOSED">Closed Positions</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="card">
              <div className="card__body p-0 overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Party Code & Name</th>
                      <th>Role</th>
                      <th>Security Name (Exchange)</th>
                      <th>Expiry</th>
                      <th className="text-right">Buy Qty</th>
                      <th className="text-right">Buy Avg Price</th>
                      <th className="text-right">Sell Qty</th>
                      <th className="text-right">Sell Avg Price</th>
                      <th className="text-right">Net Qty</th>
                      <th className="text-right">Net Avg Price</th>
                      <th className="text-right">Closing Rate</th>
                      <th className="text-right">Profit & Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settledData.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-[var(--color-slate)] font-medium">
                          No matching settlement summary rows found.
                        </td>
                      </tr>
                    ) : (
                      settledData.map((item, index) => {
                        const isNetLong = item.netQty > 0;
                        const isClosed = item.netQty === 0;
                        const secName = item.securityName || item.scriptShortName || '—';
                        const s = getSym(item);

                        return (
                          <tr key={`${item.accountId}_${item.securityName}_${item.exchangeId}_${index}`}>
                            <td>
                              <div className="font-mono font-medium text-[var(--color-charcoal)]">{item.accountCode}</div>
                              <div className="text-xs text-[var(--color-slate)] truncate max-w-[200px]">{item.accountName}</div>
                            </td>
                            <td>
                              <span className={`badge ${item.role === 'CLIENT' ? 'badge--success' : 'badge--warning'}`}>
                                {item.role}
                              </span>
                            </td>
                            <td>
                              <div className="font-semibold text-[var(--color-charcoal)]">{secName}</div>
                              <div className="text-[10px] text-[var(--color-slate)] font-mono">
                                {item.exchangeCode}{item.scriptShortName && item.scriptShortName !== secName ? ` • ${item.scriptShortName}` : ''}
                              </div>
                            </td>
                            <td className="font-mono text-xs text-[var(--color-slate)]">
                              {item.expiry || '—'}
                            </td>
                            <td className="text-right font-mono">{item.buyQty.toLocaleString('en-IN')}</td>
                            <td className="text-right font-mono">{s}{item.buyAvgRate.toFixed(2)}</td>
                            <td className="text-right font-mono">{item.sellQty.toLocaleString('en-IN')}</td>
                            <td className="text-right font-mono">{s}{item.sellAvgRate.toFixed(2)}</td>
                            <td className={`text-right font-mono font-semibold`}>
                              {isClosed ? (
                                <span className="text-[var(--color-slate)]/50">CLOSED</span>
                              ) : (
                                <span className={isNetLong ? 'text-[var(--color-forest)]' : 'text-[var(--color-negative)]'}>
                                  {isNetLong ? '+' : ''}{item.netQty.toLocaleString('en-IN')}
                                </span>
                              )}
                            </td>
                            <td className="text-right font-mono font-medium">
                              {isClosed ? '—' : `${s}${item.netAvgRate.toFixed(2)}`}
                            </td>
                            <td className="text-right font-mono font-medium">
                              {isClosed ? (
                                <span className="text-[var(--color-slate)]/40">—</span>
                              ) : item.closingRate === null ? (
                                <span className="text-amber-600 font-semibold" title="Missing closing rate in DB">Missing</span>
                              ) : (
                                `${s}${item.closingRate.toFixed(2)}`
                              )}
                            </td>
                            <td className={`text-right font-mono font-semibold`}>
                              <span className={item.finalPnL > 0 ? 'text-[var(--color-forest)]' : item.finalPnL < 0 ? 'text-[var(--color-negative)]' : 'text-[var(--color-slate)]'}>
                                {item.finalPnL > 0 ? '+' : ''}{s}{Math.abs(item.finalPnL).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Auto-Calculated Forwarding Tables */}
          {showAutoCalculated && openPositions.length > 0 && (
            <div className="space-y-8 animate-fadeIn pt-4">
              <hr className="border-[var(--sidebar-divider)]" />
              
              {/* Carry Forward Section */}
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-charcoal)]">Carry Forwarded Trades</h3>
                    <p className="text-xs text-[var(--color-slate)]">
                      These closing trades invert the remaining open quantity. Will be added on date: <span className="font-semibold text-[var(--color-charcoal)]">{carryForwardDateFormatted}</span>.
                    </p>
                  </div>
                  <span className="badge badge--neutral text-xs">Closing Rate Valuation</span>
                </div>

                <div className="card">
                  <div className="card__body p-0 overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Party Code & Name</th>
                          <th>Role</th>
                          <th>Script (Exchange)</th>
                          <th>Expiry</th>
                          <th>Action</th>
                          <th className="text-right">Quantity</th>
                          <th className="text-right">Valuation Rate</th>
                          <th className="text-right">Valuation Amount</th>
                          <th>Add Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openPositions.map((item, index) => {
                          const action = item.netQty > 0 ? 'SELL' : 'BUY';
                          const qty = Math.abs(item.netQty);
                          const rate = item.closingRate ?? 0;
                          const hasNoRate = item.closingRate === null;

                          return (
                            <tr key={`cf_${item.accountId}_${item.scriptId}_${index}`}>
                              <td>
                                <div className="font-mono font-medium text-[var(--color-charcoal)]">{item.accountCode}</div>
                                <div className="text-xs text-[var(--color-slate)] truncate max-w-[200px]">{item.accountName}</div>
                              </td>
                              <td>
                                <span className={`badge ${item.role === 'CLIENT' ? 'badge--success' : 'badge--warning'}`}>
                                  {item.role}
                                </span>
                              </td>
                              <td>
                                <div className="font-semibold text-[var(--color-charcoal)]">{item.scriptShortName}</div>
                                <div className="text-[10px] text-[var(--color-slate)]">{item.exchangeCode}</div>
                              </td>
                              <td className="font-mono text-xs text-[var(--color-slate)]">{item.expiry || '—'}</td>
                              <td>
                                <span className={`badge ${action === 'BUY' ? 'badge--success' : 'badge--warning'} font-bold`}>
                                  {action}
                                </span>
                              </td>
                              <td className="text-right font-mono">
                                {hasNoRate ? (
                                  <span className="text-amber-600 flex items-center justify-end gap-1 text-xs font-semibold" title="Please add a closing rate for this script in the database.">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {getSym(item)}0.00 (Missing)
                                  </span>
                                ) : (
                                  `${getSym(item)}${rate.toFixed(2)}`
                                )}
                              </td>
                              <td className="text-right font-mono font-semibold">
                                {getSym(item)}{(qty * rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="text-xs font-medium text-[var(--color-charcoal)]">{carryForwardDateFormatted}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Back Forward Section */}
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-charcoal)]">Back Forwarded Trades</h3>
                    <p className="text-xs text-[var(--color-slate)]">
                      These opening trades re-establish the positions on the next day. Will be added on date: <span className="font-semibold text-[var(--color-charcoal)]">{backForwardDateFormatted}</span>.
                    </p>
                  </div>
                  <span className="badge badge--neutral text-xs">Opening Position Re-entry</span>
                </div>

                <div className="card">
                  <div className="card__body p-0 overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Party Code & Name</th>
                          <th>Role</th>
                          <th>Script (Exchange)</th>
                          <th>Expiry</th>
                          <th>Action</th>
                          <th className="text-right">Quantity</th>
                          <th className="text-right">Valuation Rate</th>
                          <th className="text-right">Valuation Amount</th>
                          <th>Add Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openPositions.map((item, index) => {
                          const action = item.netQty > 0 ? 'BUY' : 'SELL';
                          const qty = Math.abs(item.netQty);
                          const rate = item.closingRate ?? 0;
                          const hasNoRate = item.closingRate === null;

                          return (
                            <tr key={`bf_${item.accountId}_${item.scriptId}_${index}`}>
                              <td>
                                <div className="font-mono font-medium text-[var(--color-charcoal)]">{item.accountCode}</div>
                                <div className="text-xs text-[var(--color-slate)] truncate max-w-[200px]">{item.accountName}</div>
                              </td>
                              <td>
                                <span className={`badge ${item.role === 'CLIENT' ? 'badge--success' : 'badge--warning'}`}>
                                  {item.role}
                                </span>
                              </td>
                              <td>
                                <div className="font-semibold text-[var(--color-charcoal)]">{item.scriptShortName}</div>
                                <div className="text-[10px] text-[var(--color-slate)]">{item.exchangeCode}</div>
                              </td>
                              <td className="font-mono text-xs text-[var(--color-slate)]">{item.expiry || '—'}</td>
                              <td>
                                <span className={`badge ${action === 'BUY' ? 'badge--success' : 'badge--warning'} font-bold`}>
                                  {action}
                                </span>
                              </td>
                              <td className="text-right font-mono font-medium">{qty.toLocaleString('en-IN')}</td>
                              <td className="text-right font-mono">
                                {hasNoRate ? (
                                  <span className="text-amber-600 flex items-center justify-end gap-1 text-xs font-semibold" title="Please add a closing rate for this script in the database.">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {getSym(item)}0.00 (Missing)
                                  </span>
                                ) : (
                                  `${getSym(item)}${rate.toFixed(2)}`
                                )}
                              </td>
                              <td className="text-right font-mono font-semibold">
                                {getSym(item)}{(qty * rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="text-xs font-medium text-[var(--color-charcoal)]">{backForwardDateFormatted}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Settlement Execution Preview Modal */}
      {previewModal?.isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-[var(--bg-card)] border border-[var(--color-border-medium)] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-[var(--color-border-light)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                    <Zap className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Settlement Execution Preview</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Period: <strong>{formatDateStr(previewModal.settlementFromDate)}</strong> to <strong>{formatDateStr(previewModal.settlementToDate)}</strong> • {previewModal.unsettledTradesCount} unsettled trades
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60">
                    <div className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Carry Forward (CF)</div>
                    <div className="text-2xl font-bold text-blue-700 mt-1">
                      {previewModal.preview.filter(p => p.tradeType === 'CARRY_FORWARD').length} trades
                    </div>
                    <div className="text-[11px] text-blue-600 mt-0.5">Closes open positions on {formatDateStr(previewModal.settlementToDate)}</div>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
                    <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Back Forward (BF)</div>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">
                      {previewModal.preview.filter(p => p.tradeType === 'BACK_FORWARD').length} trades
                    </div>
                    <div className="text-[11px] text-emerald-600 mt-0.5">Re-opens position on next day ({getNextDayStr(previewModal.settlementToDate)})</div>
                  </div>

                  <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60">
                    <div className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Settlement (Expired)</div>
                    <div className="text-2xl font-bold text-purple-700 mt-1">
                      {previewModal.preview.filter(p => p.tradeType === 'SETTLEMENT').length} trades
                    </div>
                    <div className="text-[11px] text-purple-600 mt-0.5">Final closing trade on expiry date (No BF)</div>
                  </div>
                </div>

                {/* Errors Section */}
                {previewModal.errors.length > 0 && (
                  <div className="border border-rose-200 bg-rose-50/80 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Missing Closing Rates for Settlement ({previewModal.errors.length})
                    </div>
                    <p className="text-xs text-rose-700">
                      The following securities are missing closing rates for this settlement date. Please import or add closing rates before executing settlement.
                    </p>
                    <ul className="list-disc list-inside text-xs text-rose-800 space-y-1 mt-2">
                      {previewModal.errors.map((e, idx) => (
                        <li key={idx}>
                          <strong>{e.securityName}</strong>: {e.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Preview Trades Table */}
                {previewModal.preview.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Generated Adjustment Trades Preview ({previewModal.preview.length})</span>
                      <span className="text-[11px] text-slate-500 font-normal">Auto-calculated using closing rates</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100/75 text-slate-600 font-semibold sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Client</th>
                            <th className="py-2.5 px-3">Broker</th>
                            <th className="py-2.5 px-3">Security Name</th>
                            <th className="py-2.5 px-3">Action</th>
                            <th className="py-2.5 px-3 text-right">Qty</th>
                            <th className="py-2.5 px-3 text-right">Closing Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewModal.preview.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-semibold">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  p.tradeType === 'CARRY_FORWARD' ? 'bg-blue-100 text-blue-800' :
                                  p.tradeType === 'BACK_FORWARD' ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {p.tradeType}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">{formatDateStr(p.tradeDate)}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-800">{p.accountCode}</td>
                              <td className="py-2.5 px-3 text-slate-600">{p.brokerCode || '—'}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-700">{p.securityName}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  p.transactionType === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {p.transactionType}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{p.quantity.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                                {p.currencyCode || '$'}{p.rate.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl">
                    No open positions require Carry Forward, Back Forward, or Settlement adjustment for this date.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-[var(--color-border-light)] flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Executing will create trades, tag participating records with Settlement ID, and post net amounts to the Ledger.
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPreviewModal(null)}
                    className="btn btn--secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmExecuteSettlement}
                    disabled={isExecutingSettlement || previewModal.errors.length > 0 || previewModal.preview.length === 0}
                    className="btn btn--primary text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExecutingSettlement ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Executing Settlement...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Confirm & Execute Settlement
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Settlement Deletion Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm?.isOpen ?? false}
        title="Delete Settlement"
        message={
          <div className="space-y-2">
            <p>
              Are you sure you want to delete <strong>&quot;{deleteConfirm?.settlementName}&quot;</strong>?
            </p>
            <p className="text-xs text-rose-600 font-medium">
              This will permanently remove all Carry Forward, Back Forward, and Settlement trades created by this settlement, delete associated ledger entries, and un-tag the original trades.
            </p>
          </div>
        }
        confirmLabel="Delete Settlement"
        variant="danger"
        onConfirm={handleDeleteSettlement}
        onCancel={() => setDeleteConfirm(null)}
        isLoading={isDeletingSettlement}
      />
    </div>
  );
}
