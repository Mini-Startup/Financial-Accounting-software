'use client';

import { useState, useMemo } from 'react';
import type { ParsedTrade } from '../../lib/tradeParser';

interface TradeDataGridProps {
  trades: ParsedTrade[];
}

/** Number of rows to render at a time for large datasets */
const PAGE_SIZE = 200;

export function TradeDataGrid({ trades }: TradeDataGridProps) {
  const [clientFilter, setClientFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [scriptFilter, setScriptFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Derive unique client codes for the filter dropdown
  const uniqueClients = useMemo(() => {
    const codes = new Set(trades.map((t) => t.clientCode));
    return Array.from(codes).sort();
  }, [trades]);

  // Apply filters
  const filteredTrades = useMemo(() => {
    let result = trades;

    if (clientFilter) {
      result = result.filter((t) => t.clientCode === clientFilter);
    }

    if (typeFilter !== 'ALL') {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (scriptFilter) {
      const q = scriptFilter.toLowerCase();
      result = result.filter(
        (t) =>
          t.script.toLowerCase().includes(q) ||
          t.fullScript.toLowerCase().includes(q)
      );
    }

    return result;
  }, [trades, clientFilter, typeFilter, scriptFilter]);

  // Slice for progressive rendering
  const visibleTrades = filteredTrades.slice(0, visibleCount);
  const hasMore = visibleCount < filteredTrades.length;

  const handleClearFilters = () => {
    setClientFilter('');
    setTypeFilter('ALL');
    setScriptFilter('');
  };

  const hasActiveFilters = clientFilter || typeFilter !== 'ALL' || scriptFilter;

  return (
    <div className="trade-grid-wrapper trade-animate-in">
      {/* Toolbar */}
      <div className="trade-grid-toolbar">
        <div className="trade-grid-toolbar-left">
          {/* Client filter */}
          <select
            className="trade-grid-filter"
            value={clientFilter}
            onChange={(e) => {
              setClientFilter(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            aria-label="Filter by client"
          >
            <option value="">All Clients</option>
            {uniqueClients.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>

          {/* Script search */}
          <input
            type="text"
            className="trade-grid-filter"
            placeholder="Search script…"
            value={scriptFilter}
            onChange={(e) => {
              setScriptFilter(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            aria-label="Filter by script name"
          />

          {/* Buy/Sell toggle */}
          <button
            className={`trade-grid-filter-btn ${typeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => { setTypeFilter('ALL'); setVisibleCount(PAGE_SIZE); }}
          >
            ALL
          </button>
          <button
            className={`trade-grid-filter-btn ${typeFilter === 'BUY' ? 'active-buy' : ''}`}
            onClick={() => { setTypeFilter('BUY'); setVisibleCount(PAGE_SIZE); }}
          >
            BUY
          </button>
          <button
            className={`trade-grid-filter-btn ${typeFilter === 'SELL' ? 'active-sell' : ''}`}
            onClick={() => { setTypeFilter('SELL'); setVisibleCount(PAGE_SIZE); }}
          >
            SELL
          </button>
        </div>

        <div className="trade-grid-toolbar-right">
          {hasActiveFilters && (
            <button className="trade-grid-filter-btn" onClick={handleClearFilters}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="trade-grid-scroll">
        <table className="trade-grid-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Trade No</th>
              <th>Date / Time</th>
              <th>Script</th>
              <th>Expiry</th>
              <th>Type</th>
              <th className="align-right">Qty</th>
              <th className="align-right">Rate</th>
              <th>Client</th>
              <th>Terminal</th>
              <th>Order ID</th>
            </tr>
          </thead>
          <tbody>
            {visibleTrades.length === 0 ? (
              <tr className="trade-empty-row">
                <td colSpan={11}>
                  {hasActiveFilters
                    ? 'No trades match the current filters'
                    : 'No trade data loaded'}
                </td>
              </tr>
            ) : (
              visibleTrades.map((trade, idx) => (
                <tr
                  key={`${trade.uniqueTradeId || trade.tradeNo}-${idx}`}
                  className={trade.type === 'BUY' ? 'row-buy' : 'row-sell'}
                >
                  <td className="mono" style={{ color: '#94a3b8', fontSize: '11px' }}>
                    {idx + 1}
                  </td>
                  <td className="mono">{trade.tradeNo}</td>
                  <td className="mono">{trade.tradeTime}</td>
                  <td style={{ fontWeight: 600 }}>{trade.script}</td>
                  <td style={{ color: '#64748b' }}>{trade.expiry || '—'}</td>
                  <td>
                    <span
                      className={`trade-type-badge ${trade.type === 'BUY' ? 'buy' : 'sell'}`}
                    >
                      {trade.type}
                    </span>
                  </td>
                  <td className="align-right mono" style={{ fontWeight: 600 }}>
                    {trade.qty.toLocaleString()}
                  </td>
                  <td className="align-right mono" style={{ fontWeight: 600 }}>
                    {trade.rate.toFixed(2)}
                  </td>
                  <td className="mono">{trade.clientCode}</td>
                  <td style={{ color: '#64748b' }}>{trade.terminal}</td>
                  <td className="mono" style={{ color: '#94a3b8' }}>
                    {trade.orderId || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Load more for large datasets */}
      {hasMore && (
        <div style={{ padding: '8px 12px', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
          <button
            className="trade-grid-filter-btn"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            Load {Math.min(PAGE_SIZE, filteredTrades.length - visibleCount)} more rows
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="trade-grid-footer">
        <span>
          Showing {visibleTrades.length.toLocaleString()} of{' '}
          {filteredTrades.length.toLocaleString()} trades
          {hasActiveFilters ? ' (filtered)' : ''}
        </span>
        <span>
          Total: {trades.length.toLocaleString()} rows
        </span>
      </div>
    </div>
  );
}
