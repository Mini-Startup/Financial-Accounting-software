import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Briefcase,
  Users,
  Activity
} from "lucide-react";
import { cn } from "@/utils/cn";

export default function Dashboard() {
  const metrics = [
    { label: 'Total Balance', value: '$124,563.00', delta: '+12.5%', positive: true, icon: DollarSign },
    { label: 'Monthly Revenue', value: '$43,120.50', delta: '+8.2%', positive: true, icon: Activity },
    { label: 'Active Trades', value: '342', delta: '-2.4%', positive: false, icon: Briefcase },
    { label: 'Total Clients', value: '1,204', delta: '+18.0%', positive: true, icon: Users },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-h1 font-display">Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back, here's your financial overview.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn--secondary">Export Data</button>
          <button className="btn btn--primary">Generate Report</button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <div key={metric.label} className="stat-card">
            <div className="flex items-center gap-2">
              <metric.icon className="w-5 h-5 text-[var(--color-emerald)]" />
              <p className="stat-card__label">{metric.label}</p>
            </div>
            
            <p className="stat-card__value mt-2">{metric.value}</p>
            
            <div className={cn("stat-card__delta", metric.positive ? "stat-card__delta--up" : "stat-card__delta--down")}>
              {metric.positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {metric.delta} from last month
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="card lg:col-span-2">
          <div className="card__header">
            <h3 className="card__title">Revenue Analytics</h3>
            <select className="input input--sm w-auto">
              <option>Last 6 Months</option>
              <option>This Year</option>
              <option>All Time</option>
            </select>
          </div>
          
          <div className="card__body">
            {/* Static CSS Graph Representation */}
            <div className="h-64 flex items-end justify-between gap-2 md:gap-4 mt-4 border-b border-dashed border-[var(--color-border-light)] px-2">
              {[40, 65, 45, 80, 55, 90].map((height, i) => (
                <div key={i} className="w-full flex flex-col items-center gap-2 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--color-obsidian)] text-white text-xs px-3 py-1.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap z-10">
                    ${(height * 1234).toLocaleString()}
                  </div>
                  <div 
                    className="w-full bg-[var(--color-mist)] rounded-t-md hover:bg-[var(--color-forest)] transition-colors cursor-pointer"
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className="text-xs text-[var(--color-slate)] font-medium">{'Jan Feb Mar Apr May Jun'.split(' ')[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Portfolio Distribution</h3>
          </div>
          <div className="card__body flex flex-col items-center justify-center h-72 relative">
            {/* CSS Donut Chart */}
            <div 
              className="w-48 h-48 rounded-full relative flex items-center justify-center shadow-sm"
              style={{
                background: 'conic-gradient(var(--color-emerald) 0% 45%, var(--color-leaf) 45% 75%, var(--color-mint) 75% 100%)'
              }}
            >
              <div className="absolute w-[168px] h-[168px] bg-[var(--color-white)] rounded-full shadow-inner flex flex-col items-center justify-center">
                <span className="font-mono text-3xl font-bold text-[var(--color-charcoal)]">45%</span>
                <span className="text-xs font-medium text-[var(--color-slate)] uppercase tracking-wider">Equities</span>
              </div>
            </div>
            
            <div className="flex gap-4 mt-8 w-full justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[var(--color-emerald)]"></div>
                <span className="text-xs font-medium text-[var(--color-charcoal)]">Equities</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[var(--color-leaf)]"></div>
                <span className="text-xs font-medium text-[var(--color-charcoal)]">Bonds</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[var(--color-mint)]"></div>
                <span className="text-xs font-medium text-[var(--color-charcoal)]">Cash</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="card mt-8">
        <div className="card__header">
          <h3 className="card__title">Recent Transactions</h3>
          <button className="text-sm font-semibold text-[var(--color-emerald)] hover:text-[var(--color-forest)] transition-colors">View All</button>
        </div>
        
        <div className="card__body p-0 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Date</th>
                <th>Client</th>
                <th>Type</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'TX-9842', date: 'Oct 24, 2025', client: 'Acme Corp', type: 'Deposit', status: 'Completed', amount: '+$5,400.00' },
                { id: 'TX-9841', date: 'Oct 23, 2025', client: 'Globex Inc', type: 'Withdrawal', status: 'Pending', amount: '-$1,250.00' },
                { id: 'TX-9840', date: 'Oct 21, 2025', client: 'Soylent Corp', type: 'Trade Execution', status: 'Completed', amount: '-$8,500.00' },
                { id: 'TX-9839', date: 'Oct 20, 2025', client: 'Initech', type: 'Deposit', status: 'Completed', amount: '+$12,000.00' },
                { id: 'TX-9838', date: 'Oct 19, 2025', client: 'Umbrella Corp', type: 'Fee', status: 'Failed', amount: '-$150.00' },
              ].map((tx, i) => (
                <tr key={i}>
                  <td className="font-mono font-medium text-[var(--color-charcoal)]">{tx.id}</td>
                  <td className="text-[var(--color-slate)]">{tx.date}</td>
                  <td className="font-medium text-[var(--color-charcoal)]">{tx.client}</td>
                  <td className="text-[var(--color-slate)]">{tx.type}</td>
                  <td>
                    <span className={cn("badge", 
                      tx.status === 'Completed' ? 'badge--success badge--dot' : '',
                      tx.status === 'Pending' ? 'badge--warning badge--dot' : '',
                      tx.status === 'Failed' ? 'badge--error badge--dot' : ''
                    )}>
                      {tx.status}
                    </span>
                  </td>
                  <td className={cn("text-right font-mono font-bold", tx.amount.startsWith('+') ? 'text-[var(--color-positive)]' : 'text-[var(--color-charcoal)]')}>
                    {tx.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
