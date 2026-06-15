'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Calculator, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface SettlementItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  role: 'CLIENT' | 'BROKER';
  scriptId: string;
  scriptShortName: string;
  scriptFullName: string;
  exchangeId: string;
  exchangeCode: string;
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

export default function SettlementPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SettlementItem[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showAutoCalculated, setShowAutoCalculated] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CLIENT' | 'BROKER'>('ALL');
  const [positionFilter, setPositionFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');

  useEffect(() => {
    // Set default date range to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setFromDate(firstDay.toISOString().split('T')[0]);
    setToDate(today.toISOString().split('T')[0]);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate) {
      toast.error('Please select both From and To dates');
      return;
    }

    setLoading(true);
    setShowAutoCalculated(false); // Reset auto-calculation state on new generate
    try {
      const url = `http://localhost:4000/settlement?fromDate=${fromDate}&toDate=${toDate}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
        setHasGenerated(true);
        toast.success(`Generated settlement summary successfully`);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to generate settlement summary');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to connect to the backend server');
    } finally {
      setLoading(false);
    }
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

  // Calculate high-level metrics for the filtered view
  const totalRealizedPnL = filteredData.reduce((sum, item) => sum + item.realizedPnL, 0);
  const totalVolume = filteredData.reduce((sum, item) => sum + item.buyQty + item.sellQty, 0);
  const openPositionsCount = filteredData.filter(item => item.netQty !== 0).length;

  // Carry Forward and Back Forward Date calculations
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

  const carryForwardDateFormatted = formatDateStr(toDate);
  const backForwardDateFormatted = getNextDayStr(toDate);

  // Filter positions that have open balances to be carry/back forwarded
  const openPositions = filteredData.filter(item => item.netQty !== 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-display">Settlement</h1>
          <p className="text-sm text-[var(--color-slate)] mt-1">
            Generate and analyze summarized trade positions, average rates, and realized profit/losses for clients and brokers.
          </p>
        </div>
      </div>

      {/* Date Range Selection Card */}
      <div className="card">
        <div className="card__body">
          <form onSubmit={handleGenerate} className="flex flex-col md:flex-row items-end gap-6">
            <div className="form-field flex-1">
              <label className="form-label form-label--required">From Date</label>
              <input 
                type="date" 
                value={fromDate} 
                onChange={e => setFromDate(e.target.value)} 
                className="input w-full"
                required 
              />
            </div>
            
            <div className="form-field flex-1">
              <label className="form-label form-label--required">To Date</label>
              <input 
                type="date" 
                value={toDate} 
                onChange={e => setToDate(e.target.value)} 
                className="input w-full"
                required 
              />
            </div>

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
          </form>
        </div>
      </div>

      {hasGenerated && (
        <>
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <div className="card__body flex items-center justify-between p-6">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">Total Realized P&L</p>
                  <h3 className={`text-h2 font-display mt-2 font-bold ${totalRealizedPnL >= 0 ? 'text-[var(--color-forest)]' : 'text-[var(--color-negative)]'}`}>
                    ₹{totalRealizedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className={`p-3 rounded-xl ${totalRealizedPnL >= 0 ? 'bg-emerald-50 text-[var(--color-forest)]' : 'bg-red-50 text-[var(--color-negative)]'}`}>
                  {totalRealizedPnL >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
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

                {openPositions.length > 0 && (
                  <button
                    onClick={() => setShowAutoCalculated(!showAutoCalculated)}
                    className="btn btn--secondary flex items-center justify-center gap-2 text-xs py-1.5 px-4"
                  >
                    {showAutoCalculated ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        Hide Auto-Calculated Trades
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        Show Auto Calculated Trades
                      </>
                    )}
                  </button>
                )}
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
                      <th>Script (Exchange)</th>
                      <th>Expiry</th>
                      <th className="text-right">Buy Qty</th>
                      <th className="text-right">Buy Avg Price</th>
                      <th className="text-right">Sell Qty</th>
                      <th className="text-right">Sell Avg Price</th>
                      <th className="text-right">Net Qty</th>
                      <th className="text-right">Net Avg Price</th>
                      <th className="text-right">Realized P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-[var(--color-slate)] font-medium">
                          No matching settlement summary rows found.
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((item, index) => {
                        const isNetLong = item.netQty > 0;
                        const isNetShort = item.netQty < 0;
                        const isClosed = item.netQty === 0;

                        return (
                          <tr key={`${item.accountId}_${item.scriptId}_${item.exchangeId}_${index}`}>
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
                              <div className="text-[10px] text-[var(--color-slate)]">
                                {item.exchangeCode} - {item.scriptFullName}
                              </div>
                            </td>
                            <td className="font-mono text-xs text-[var(--color-slate)]">
                              {item.expiry || '—'}
                            </td>
                            <td className="text-right font-mono">{item.buyQty.toLocaleString('en-IN')}</td>
                            <td className="text-right font-mono">₹{item.buyAvgRate.toFixed(2)}</td>
                            <td className="text-right font-mono">{item.sellQty.toLocaleString('en-IN')}</td>
                            <td className="text-right font-mono">₹{item.sellAvgRate.toFixed(2)}</td>
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
                              {isClosed ? '—' : `₹${item.netAvgRate.toFixed(2)}`}
                            </td>
                            <td className={`text-right font-mono font-semibold`}>
                              <span className={item.realizedPnL > 0 ? 'text-[var(--color-forest)]' : item.realizedPnL < 0 ? 'text-[var(--color-negative)]' : 'text-[var(--color-slate)]'}>
                                {item.realizedPnL > 0 ? '+' : ''}₹{item.realizedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                              <td className="text-right font-mono font-medium">{qty.toLocaleString('en-IN')}</td>
                              <td className="text-right font-mono">
                                {hasNoRate ? (
                                  <span className="text-amber-600 flex items-center justify-end gap-1 text-xs font-semibold" title="Please add a closing rate for this script in the database.">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    ₹0.00 (Missing)
                                  </span>
                                ) : (
                                  `₹${rate.toFixed(2)}`
                                )}
                              </td>
                              <td className="text-right font-mono font-semibold">
                                ₹{(qty * rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                    ₹0.00 (Missing)
                                  </span>
                                ) : (
                                  `₹${rate.toFixed(2)}`
                                )}
                              </td>
                              <td className="text-right font-mono font-semibold">
                                ₹{(qty * rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
    </div>
  );
}
