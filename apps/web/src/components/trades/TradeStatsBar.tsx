'use client';

import { BarChart3, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Users } from 'lucide-react';
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
      icon: BarChart3,
      iconColor: 'text-indigo-600',
      iconBg: '#e0e7ff',
      label: 'Total Rows',
      value: result.totalRows,
    },
    {
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      iconBg: '#dcfce7',
      label: 'Parsed',
      value: result.successCount,
    },
    {
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      iconBg: '#fef3c7',
      label: 'Errors',
      value: result.errorCount,
    },
    {
      icon: TrendingUp,
      iconColor: 'text-emerald-700',
      iconBg: 'rgba(13, 159, 79, 0.1)',
      label: 'Buy',
      value: buyCount,
    },
    {
      icon: TrendingDown,
      iconColor: 'text-rose-600',
      iconBg: 'rgba(214, 51, 90, 0.1)',
      label: 'Sell',
      value: sellCount,
    },
    {
      icon: Users,
      iconColor: 'text-sky-600',
      iconBg: '#e0f2fe',
      label: 'Clients',
      value: uniqueClients,
    },
  ];

  return (
    <div className="trade-stats-bar trade-animate-in">
      {stats.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <div className="trade-stat-chip" key={stat.label}>
            <div
              className="trade-stat-icon flex items-center justify-center"
              style={{ background: stat.iconBg }}
            >
              <IconComponent className={`w-3.5 h-3.5 ${stat.iconColor}`} />
            </div>
            <div className="flex flex-col">
              <span className="trade-stat-label">{stat.label}</span>
              <span className="trade-stat-value">{stat.value.toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
