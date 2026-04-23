export default function Dashboard() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-heading-2">Dashboard</h1>
          <p className="text-subtitle">Welcome back, here's your financial overview.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">Export Data</button>
          <button className="btn-primary">Generate Report</button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="card flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl">💰</span>
          </div>
          <span className="text-caption">Total Balance</span>
          <span className="text-heading-3">$124,563.00</span>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-semibold text-[var(--color-success)] bg-green-100 px-2 py-1 rounded-full">+12.5%</span>
            <span className="text-xs text-gray-500">vs last month</span>
          </div>
        </div>
        
        <div className="card flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl">📈</span>
          </div>
          <span className="text-caption">Monthly Revenue</span>
          <span className="text-heading-3">$43,120.50</span>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-semibold text-[var(--color-success)] bg-green-100 px-2 py-1 rounded-full">+8.2%</span>
            <span className="text-xs text-gray-500">vs last month</span>
          </div>
        </div>

        <div className="card flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl">📉</span>
          </div>
          <span className="text-caption">Active Trades</span>
          <span className="text-heading-3">342</span>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-semibold text-[var(--color-danger)] bg-red-100 px-2 py-1 rounded-full">-2.4%</span>
            <span className="text-xs text-gray-500">vs last month</span>
          </div>
        </div>

        <div className="card flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl">👥</span>
          </div>
          <span className="text-caption">Total Clients</span>
          <span className="text-heading-3">1,204</span>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-semibold text-[var(--color-success)] bg-green-100 px-2 py-1 rounded-full">+18.0%</span>
            <span className="text-xs text-gray-500">vs last month</span>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="card lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-title">Revenue Analytics</h3>
            <select className="text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
              <option>Last 6 Months</option>
              <option>This Year</option>
              <option>All Time</option>
            </select>
          </div>
          
          {/* Static CSS Graph Representation */}
          <div className="h-64 flex items-end justify-between gap-2 md:gap-4 mt-8 pt-4 border-b border-l border-gray-100 px-2">
            {[40, 65, 45, 80, 55, 90].map((height, i) => (
              <div key={i} className="w-full flex flex-col items-center gap-2 group relative">
                {/* Tooltip */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10">
                  ${(height * 1234).toLocaleString()}
                </div>
                <div 
                  className="w-full bg-[var(--color-primary)] rounded-t-sm opacity-80 group-hover:opacity-100 transition-all cursor-pointer"
                  style={{ height: `${height}%` }}
                ></div>
                <span className="text-xs text-gray-500">{'Jan Feb Mar Apr May Jun'.split(' ')[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-title mb-6">Portfolio Distribution</h3>
          <div className="flex flex-col items-center justify-center h-64 relative">
            {/* CSS Donut Chart */}
            <div 
              className="w-48 h-48 rounded-full relative flex items-center justify-center shadow-sm"
              style={{
                background: 'conic-gradient(var(--color-primary) 0% 45%, #10b981 45% 75%, #f59e0b 75% 100%)'
              }}
            >
              <div className="absolute w-[168px] h-[168px] bg-[var(--color-surface)] rounded-full shadow-inner flex flex-col items-center justify-center">
                <span className="text-heading-3 text-[var(--color-secondary)]">45%</span>
                <span className="text-xs text-gray-500">Equities</span>
              </div>
            </div>
            
            <div className="flex gap-4 mt-8 w-full justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]"></div>
                <span className="text-xs text-gray-600">Equities</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                <span className="text-xs text-gray-600">Bonds</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
                <span className="text-xs text-gray-600">Cash</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="card mt-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-title">Recent Transactions</h3>
          <button className="text-sm font-medium text-[var(--color-primary)] hover:underline">View All</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-caption">Transaction ID</th>
                <th className="pb-3 text-caption">Date</th>
                <th className="pb-3 text-caption">Client</th>
                <th className="pb-3 text-caption">Type</th>
                <th className="pb-3 text-caption">Status</th>
                <th className="pb-3 text-caption text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                { id: 'TX-9842', date: 'Oct 24, 2025', client: 'Acme Corp', type: 'Deposit', status: 'Completed', amount: '+$5,400.00' },
                { id: 'TX-9841', date: 'Oct 23, 2025', client: 'Globex Inc', type: 'Withdrawal', status: 'Pending', amount: '-$1,250.00' },
                { id: 'TX-9840', date: 'Oct 21, 2025', client: 'Soylent Corp', type: 'Trade Execution', status: 'Completed', amount: '-$8,500.00' },
                { id: 'TX-9839', date: 'Oct 20, 2025', client: 'Initech', type: 'Deposit', status: 'Completed', amount: '+$12,000.00' },
                { id: 'TX-9838', date: 'Oct 19, 2025', client: 'Umbrella Corp', type: 'Fee', status: 'Failed', amount: '-$150.00' },
              ].map((tx, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 font-medium text-[var(--color-secondary)]">{tx.id}</td>
                  <td className="py-4 text-gray-500">{tx.date}</td>
                  <td className="py-4">{tx.client}</td>
                  <td className="py-4 text-gray-500">{tx.type}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${tx.status === 'Completed' ? 'bg-green-100 text-green-700' : ''}
                      ${tx.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${tx.status === 'Failed' ? 'bg-red-100 text-red-700' : ''}
                    `}>
                      {tx.status}
                    </span>
                  </td>
                  <td className={`py-4 text-right font-medium ${tx.amount.startsWith('+') ? 'text-[var(--color-success)]' : ''}`}>
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
