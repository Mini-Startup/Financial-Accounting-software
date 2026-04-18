'use client';

import type { ParseResult } from '../../lib/tradeParser';

interface TradeStatsBarProps {
  result: ParseResult;
}

export function TradeStatsBar({ result }: TradeStatsBarProps) {
  const buyCount = result.trades.filter((t) => t.type === 'BUY').length;
  const sellCount = result.trades.filter((t) => t.type === 'SELL').length;
  const uniqueClients = new Set(result.trades.map((t) => t.clientCode)).size;

  const stats = [
    {
      icon: '📊',
      iconBg: '#e0e7ff',
      label: 'Total Rows',
      value: result.totalRows,
    },
    {
      icon: '✅',
      iconBg: '#dcfce7',
      label: 'Parsed',
      value: result.successCount,
    },
    {
      icon: '⚠️',
      iconBg: '#fef3c7',
      label: 'Errors',
      value: result.errorCount,
    },
    {
      icon: '📈',
      iconBg: 'rgba(13, 159, 79, 0.1)',
      label: 'Buy',
      value: buyCount,
    },
    {
      icon: '📉',
      iconBg: 'rgba(214, 51, 90, 0.1)',
      label: 'Sell',
      value: sellCount,
    },
    {
      icon: '👤',
      iconBg: '#e0f2fe',
      label: 'Clients',
      value: uniqueClients,
    },
  ];

  return (
    <div className="trade-stats-bar trade-animate-in">
      {stats.map((stat) => (
        <div className="trade-stat-chip" key={stat.label}>
          <div
            className="trade-stat-icon"
            style={{ background: stat.iconBg }}
          >
            {stat.icon}
          </div>
          <div className="flex flex-col">
            <span className="trade-stat-label">{stat.label}</span>
            <span className="trade-stat-value">{stat.value.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
