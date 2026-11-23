'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SettlementCycleSelector } from '../../components/settlement/SettlementCycleSelector';
import { PositionSummaryCards } from '../../components/settlement/PositionSummaryCards';
import { SettlementActionBar } from '../../components/settlement/SettlementActionBar';
import { PositionSummaryTable } from '../../components/settlement/PositionSummaryTable';
import { SettledTradesTable } from '../../components/settlement/SettledTradesTable';
import { SettlementPreviewModal } from '../../components/settlement/SettlementPreviewModal';
import { formatCurrencySymbol } from '@/utils/currency';
import { usePermissions } from '@/context/AuthPermissionsContext';
import { apiFetch } from '@/utils/apiClient';
import type {
  SettlementItem,
  SettlementRecord,
  SettlementDetail,
  SettlementPreviewData,
} from '../../components/settlement/types';

export default function SettlementPage() {
  const { hasPermission } = usePermissions();
  const canDeleteSettlement = hasPermission('SETTLEMENT', 'DELETE');
  const canExecuteSettlement = hasPermission('SETTLEMENT', 'EXECUTE');

  const [reportDate, setReportDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SettlementItem[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Settlement Cycles state
  const [settlementsList, setSettlementsList] = useState<SettlementRecord[]>([]);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string>('LIVE');
  const [isLoadingSettlements, setIsLoadingSettlements] = useState(false);

  // Settlement Execution Preview state
  const [previewModal, setPreviewModal] = useState<SettlementPreviewData | null>(null);
  const [isExecutingSettlement, setIsExecutingSettlement] = useState(false);

  // Settlement Deletion state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    settlementId: string;
    settlementName: string;
  } | null>(null);
  const [isDeletingSettlement, setIsDeletingSettlement] = useState(false);

  // Historical Settlement Detail & Trades View
  const [settlementDetail, setSettlementDetail] = useState<SettlementDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'TRADES'>('SUMMARY');

  const fetchSettlementsList = async () => {
    setIsLoadingSettlements(true);
    try {
      const res = await apiFetch('/settlement/settlements');
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
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setReportDate(todayStr);
    fetchSettlementsList();

    // Automatically load live data on landing
    setLoading(true);
    fetchSettlementSummary(todayStr, 'LIVE')
      .catch((err) => {
        console.error('Failed to auto-load live settlement data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const fetchSettlementSummary = async (date: string, settlementId: string = 'LIVE') => {
    let url = '';
    if (settlementId === 'LIVE') {
      url = `/settlement?settlementId=LIVE&date=${date}`;
    } else {
      url = `/settlement?settlementId=${settlementId}`;
    }

    const res = await apiFetch(url);
    if (res.ok) {
      const data = await res.json();
      setSummaryData(data);
      setHasGenerated(true);
      return data;
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || 'Failed to generate settlement summary');
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedSettlementId === 'LIVE' && !reportDate) {
      toast.error('Please select a Date');
      return;
    }

    setLoading(true);
    try {
      await fetchSettlementSummary(reportDate, selectedSettlementId);
      toast.success(
        selectedSettlementId === 'LIVE'
          ? `Generated live positions summary up to ${reportDate}`
          : `Loaded summary for selected settlement`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to connect to backend server');
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
      const res = await apiFetch(`/settlement/settlements/${settlementId}`);
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
      setLoading(true);
      try {
        await fetchSettlementSummary(reportDate, 'LIVE');
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOpenSettlementPreview = async () => {
    if (!reportDate) {
      toast.error('Please select a closing rate date for settlement.');
      return;
    }

    setIsExecutingSettlement(true);
    try {
      const res = await apiFetch('/settlement/preview', {
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
      const res = await apiFetch('/settlement/execute', {
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

  const handleDeleteSettlement = async () => {
    if (!deleteConfirm) return;
    setIsDeletingSettlement(true);
    try {
      const res = await apiFetch(
        `/settlement/settlements/${deleteConfirm.settlementId}`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Failed to delete settlement');
      }

      const data = await res.json();
      toast.success(
        `"${data.settlementName}" deleted. Removed ${
          data.deletedGeneratedCount
        } generated trades, ${data.untaggedTradesCount} trades reopened, ${
          data.deletedLedgerCount
        } ledger entries wiped clean.`
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
    return settlementsList[0]?.id === id;
  };

  // KPI Calculations
  const {
    totalVolume,
    buyOrdersCount,
    sellOrdersCount,
    openPositionsCount,
    totalOpenLots,
    longPositionsCount,
    shortPositionsCount,
    netTotalPnL,
    pnlDisplayStr,
    realizedPnLStr,
    unrealizedPnLStr,
    profitableLegsCount,
    lossLegsCount,
    ratesAvailableCount,
    missingRatesCount,
  } = useMemo(() => {
    let vol = 0;
    let buyCount = 0;
    let sellCount = 0;
    let openCount = 0;
    let openLots = 0;
    let longCount = 0;
    let shortCount = 0;
    let netPnL = 0;
    let realizedSum = 0;
    let unrealizedSum = 0;
    let profitLegs = 0;
    let lossLegs = 0;
    let availableRates = 0;
    let missingRates = 0;
    const pnlByCurr: Record<string, number> = {};

    for (const item of summaryData) {
      const lot = item.marketLot && Number(item.marketLot) > 0 ? Number(item.marketLot) : 1;
      vol += Math.abs(item.buyQty + item.sellQty);
      if (item.buyQty > 0) buyCount++;
      if (item.sellQty > 0) sellCount++;

      if (item.netQty !== 0) {
        openCount++;
        openLots += Math.abs(item.netQty);
        if (item.netQty > 0) longCount++;
        else shortCount++;
      }

      if (item.closingRate !== null && item.closingRate !== undefined) {
        availableRates++;
      } else {
        missingRates++;
      }

      const itemRealized = item.netQty === 0 ? (item.realizedPnL || 0) : 0;
      const itemUnrealized =
        item.netQty !== 0 && item.closingRate !== null
          ? item.netQty * (item.closingRate - item.netAvgRate)
          : 0;

      const finalPnL = item.netQty === 0 ? itemRealized : itemUnrealized;
      if (finalPnL > 0) profitLegs++;
      else if (finalPnL < 0) lossLegs++;

      realizedSum += itemRealized;
      unrealizedSum += itemUnrealized;
      netPnL += finalPnL;

      const symbol = formatCurrencySymbol(item.currencySymbol, item.currencyCode);
      pnlByCurr[symbol] = (pnlByCurr[symbol] || 0) + finalPnL;
    }

    const pnlStr =
      Object.keys(pnlByCurr).length === 0
        ? '$0.00'
        : Object.entries(pnlByCurr)
            .map(
              ([sym, val]) =>
                `${val >= 0 ? '+' : '-'}${sym}${Math.abs(val).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
            )
            .join(' / ');

    const formatShortPnL = (amount: number) => {
      const isPos = amount >= 0;
      return `${isPos ? '+' : '-'}$${Math.abs(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    };

    return {
      totalVolume: vol,
      buyOrdersCount: buyCount,
      sellOrdersCount: sellCount,
      openPositionsCount: openCount,
      totalOpenLots: openLots,
      longPositionsCount: longCount,
      shortPositionsCount: shortCount,
      netTotalPnL: netPnL,
      pnlDisplayStr: pnlStr,
      realizedPnLStr: formatShortPnL(realizedSum),
      unrealizedPnLStr: formatShortPnL(unrealizedSum),
      profitableLegsCount: profitLegs,
      lossLegsCount: lossLegs,
      ratesAvailableCount: availableRates,
      missingRatesCount: missingRates,
    };
  }, [summaryData]);

  const settledTradesCount =
    settlementDetail?.trades?.length ??
    settlementsList.find((s) => s.id === selectedSettlementId)?._count?.trades ??
    0;

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#2652C8] border border-blue-200 font-mono shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              Double-Entry Settlement Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">
            Settlement Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Position exposure auditing, automated mark-to-market valuations, bilateral client-broker rollovers (Carry Forward / Back Forward), and automated journal vouchers.
          </p>
        </div>
      </div>

      {/* Cycle Selector */}
      <SettlementCycleSelector
        selectedSettlementId={selectedSettlementId}
        settlementsList={settlementsList}
        onSelectCycle={handleSettlementSelectionChange}
        onRefresh={() => (selectedSettlementId === 'LIVE' ? handleGenerate() : fetchSettlementsList())}
        isLoading={loading || isLoadingSettlements}
      />

      {/* KPI Cards (Brand Card Architecture matching Image) */}
      <PositionSummaryCards
        tradeCount={settledTradesCount > 0 ? settledTradesCount : (buyOrdersCount + sellOrdersCount)}
        totalVolume={totalVolume}
        buyOrdersCount={buyOrdersCount}
        sellOrdersCount={sellOrdersCount}
        pnlDisplayStr={pnlDisplayStr}
        netTotalPnL={netTotalPnL}
        realizedPnLStr={realizedPnLStr}
        unrealizedPnLStr={unrealizedPnLStr}
        profitableLegsCount={profitableLegsCount}
        lossLegsCount={lossLegsCount}
        openPositionsCount={openPositionsCount}
        totalOpenLots={totalOpenLots}
        longPositionsCount={longPositionsCount}
        shortPositionsCount={shortPositionsCount}
        totalLegsCount={summaryData.length}
        ratesAvailableCount={ratesAvailableCount}
        missingRatesCount={missingRatesCount}
        cycleStatus={selectedSettlementId === 'LIVE' ? 'Live Session' : 'Cycle Closed'}
      />

      {/* Action Bar (Date input or historical status + tabs) */}
      <SettlementActionBar
        selectedSettlementId={selectedSettlementId}
        reportDate={reportDate}
        setReportDate={setReportDate}
        onGenerate={handleGenerate}
        onOpenPreview={handleOpenSettlementPreview}
        loading={loading}
        hasGenerated={hasGenerated}
        isExecutingSettlement={isExecutingSettlement}
        settlementsList={settlementsList}
        isNewestSettlement={isNewestSettlement}
        onDeleteSettlement={(s) =>
          setDeleteConfirm({
            isOpen: true,
            settlementId: s.id,
            settlementName: s.name,
          })
        }
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settledTradesCount={settledTradesCount}
        canDeleteSettlement={canDeleteSettlement}
        canExecuteSettlement={canExecuteSettlement}
      />

      {/* Content depending on active tab */}
      {activeTab === 'SUMMARY' ? (
        <PositionSummaryTable
          summaryData={summaryData}
          loading={loading}
          hasGenerated={hasGenerated}
        />
      ) : (
        <SettledTradesTable trades={settlementDetail?.trades || []} />
      )}

      {/* Execution Preview Modal */}
      {previewModal?.isOpen && (
        <SettlementPreviewModal
          data={previewModal}
          onClose={() => setPreviewModal(null)}
          onConfirmExecute={handleConfirmExecuteSettlement}
          isExecuting={isExecutingSettlement}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="Delete Settlement"
          message={`Are you sure you want to delete "${deleteConfirm.settlementName}"? This will permanently remove all automatically generated Carry Forward, Back Forward, and Settlement trades, untag historical trades, and reverse ledger entries.`}
          confirmLabel={isDeletingSettlement ? 'Deleting…' : 'Delete Settlement'}
          variant="danger"
          onConfirm={handleDeleteSettlement}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
