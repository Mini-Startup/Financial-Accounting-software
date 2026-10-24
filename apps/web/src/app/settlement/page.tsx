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
import type {
  SettlementItem,
  SettlementRecord,
  SettlementDetail,
  SettlementPreviewData,
} from '../../components/settlement/types';

export default function SettlementPage() {
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/settlement/settlements/${settlementId}`
      );
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

  const handleDeleteSettlement = async () => {
    if (!deleteConfirm) return;
    setIsDeletingSettlement(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/settlement/settlements/${deleteConfirm.settlementId}`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete settlement');
      }

      const data = await res.json();
      toast.success(
        `"${data.settlementName}" deleted. Removed ${
          data.deletedGeneratedCount + data.deletedBfUnsettledCount
        } generated trades, ${data.untaggedTradesCount} trades un-tagged, ${
          data.deletedLedgerCount
        } ledger entries removed.`
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
  const { totalVolume, openPositionsCount, netTotalPnL, pnlDisplayStr } = useMemo(() => {
    let vol = 0;
    let openCount = 0;
    let netPnL = 0;
    const pnlByCurr: Record<string, number> = {};

    for (const item of summaryData) {
      vol += item.buyQty + item.sellQty;
      if (item.netQty !== 0) openCount++;

      const finalPnL =
        item.netQty === 0
          ? item.realizedPnL
          : item.closingRate !== null
          ? item.netQty * (item.closingRate - item.netAvgRate)
          : 0;

      netPnL += finalPnL;
      const symbol = item.currencySymbol || (item.currencyCode === 'INR' ? '₹' : '$');
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

    return {
      totalVolume: vol,
      openPositionsCount: openCount,
      netTotalPnL: netPnL,
      pnlDisplayStr: pnlStr,
    };
  }, [summaryData]);

  const settledTradesCount =
    settlementDetail?.trades?.length ??
    settlementsList.find((s) => s.id === selectedSettlementId)?._count?.trades ??
    0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-light)] pb-4">
        <div>
          <h1 className="text-h2 font-display text-[var(--color-charcoal)]">Settlement</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">
            Review position exposure, calculate mark-to-market settlements, and generate daily CF/BF accounting cycles.
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

      {/* KPI Cards */}
      <PositionSummaryCards
        pnlDisplayStr={pnlDisplayStr}
        netTotalPnL={netTotalPnL}
        totalVolume={totalVolume}
        openPositionsCount={openPositionsCount}
        totalLegsCount={summaryData.length}
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
