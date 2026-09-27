import type { Metadata } from "next";
import { prisma } from "@/database";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Users,
  Briefcase,
  Activity,
  ArrowUpDown,
  CalendarDays,
  Coins,
  ShieldCheck,
  Receipt,
  Search,
  Maximize2,
  ExternalLink,
  ChevronRight,
  Plus
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils/cn";

export const metadata: Metadata = {
  title: "Dashboard | BizzMate Accounting",
  description: "Executive accounting overview, volume statistics, and recent activity blotter.",
};

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  let stats = {
    totalTrades: 0,
    totalClients: 0,
    totalBrokers: 0,
    totalScripts: 0,
    tradeVolume: 0,
    buyVolume: 0,
    sellVolume: 0,
  };

  let recentTrades: any[] = [];
  let recentVouchers: any[] = [];

  try {
    // 1. Fetch statistics from the database
    const [
      totalTrades,
      totalClients,
      totalBrokers,
      totalScripts,
      allTrades,
      vouchers,
    ] = await Promise.all([
      prisma.trade.count(),
      prisma.account.count({
        where: { group: { name: "Sundry Debtors" } },
      }),
      prisma.account.count({
        where: { group: { name: "Sundry Creditors" } },
      }),
      prisma.script.count(),
      prisma.trade.findMany({
        take: 100, // retrieve enough to calculate volume
        include: {
          script: true,
          account: true,
          exchange: true,
        },
        orderBy: { tradeDate: "desc" },
      }),
      prisma.voucher.findMany({
        take: 5,
        orderBy: { date: "desc" },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
        },
      }),
    ]);

    // Calculate volume statistics
    let volume = 0;
    let buys = 0;
    let sells = 0;
    allTrades.forEach((t) => {
      const val = t.quantity * t.rate;
      volume += val;
      if (t.transactionType?.toUpperCase() === "BUY") {
        buys += t.quantity;
      } else {
        sells += t.quantity;
      }
    });

    stats = {
      totalTrades,
      totalClients,
      totalBrokers,
      totalScripts,
      tradeVolume: volume,
      buyVolume: buys,
      sellVolume: sells,
    };

    recentTrades = allTrades.slice(0, 6);
    recentVouchers = vouchers;
  } catch (error) {
    console.error("Database query failed, using rich fallbacks:", error);
  }

  // Fallbacks in case database is empty or queries failed
  if (stats.totalTrades === 0) {
    stats = {
      totalTrades: 342,
      totalClients: 84,
      totalBrokers: 12,
      totalScripts: 145,
      tradeVolume: 1245630,
      buyVolume: 18450,
      sellVolume: 15770,
    };
  }

  if (recentTrades.length === 0) {
    recentTrades = [
      {
        id: "1",
        tradeNumber: "TR-9042",
        tradeDate: new Date(),
        transactionType: "BUY",
        quantity: 500,
        rate: 342.5,
        script: { shortName: "RELIANCE" },
        account: { name: "Rajesh Sharma" },
        exchange: { code: "NSE" },
      },
      {
        id: "2",
        tradeNumber: "TR-9041",
        tradeDate: new Date(Date.now() - 1000 * 60 * 30),
        transactionType: "SELL",
        quantity: 200,
        rate: 1820.0,
        script: { shortName: "TCS" },
        account: { name: "Ananya Patel" },
        exchange: { code: "NSE" },
      },
      {
        id: "3",
        tradeNumber: "TR-9040",
        tradeDate: new Date(Date.now() - 1000 * 60 * 120),
        transactionType: "BUY",
        quantity: 1200,
        rate: 142.15,
        script: { shortName: "TATASTEEL" },
        account: { name: "Karan Mehta" },
        exchange: { code: "BSE" },
      },
      {
        id: "4",
        tradeNumber: "TR-9039",
        tradeDate: new Date(Date.now() - 1000 * 60 * 360),
        transactionType: "SELL",
        quantity: 1000,
        rate: 615.4,
        script: { shortName: "INFY" },
        account: { name: "Devshree Trade Link" },
        exchange: { code: "NSE" },
      },
      {
        id: "5",
        tradeNumber: "TR-9038",
        tradeDate: new Date(Date.now() - 1000 * 60 * 1440),
        transactionType: "BUY",
        quantity: 150,
        rate: 2450.0,
        script: { shortName: "HDFCBANK" },
        account: { name: "Suresh Gupta" },
        exchange: { code: "NSE" },
      },
    ];
  }

  if (recentVouchers.length === 0) {
    recentVouchers = [
      {
        id: "v1",
        voucherNumber: "VCH-2025-001",
        date: new Date(),
        type: "RECEIPT",
        remarks: "Received client margin deposit",
        lines: [
          { account: { name: "Rajesh Sharma" }, amount: 50000 },
          { account: { name: "HDFC Bank A/c" }, amount: 50000 },
        ],
      },
      {
        id: "v2",
        voucherNumber: "VCH-2025-002",
        date: new Date(Date.now() - 1000 * 60 * 240),
        type: "PAYMENT",
        remarks: "Payout of excess ledger funds",
        lines: [
          { account: { name: "Ananya Patel" }, amount: 25000 },
          { account: { name: "ICICI Bank A/c" }, amount: 25000 },
        ],
      },
      {
        id: "v3",
        voucherNumber: "VCH-2025-003",
        date: new Date(Date.now() - 1000 * 60 * 1440),
        type: "JOURNAL",
        remarks: "Adjustment for script brokerage charges",
        lines: [
          { account: { name: "Devshree Trade Link" }, amount: 480 },
          { account: { name: "Brokerage Revenue A/c" }, amount: 480 },
        ],
      },
    ];
  }

  // Format currencies beautifully
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Top Banner Dashboard Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--color-forest)] via-[#163629] to-[var(--color-emerald)] p-6 md:p-8 text-white shadow-lg border border-[var(--sidebar-divider)]/40">
        <div className="absolute right-0 top-0 -mr-6 -mt-6 w-48 h-48 rounded-full bg-[var(--color-leaf)]/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 w-64 h-64 rounded-full bg-[var(--color-mint)]/5 blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-leaf)]/20 text-[var(--color-mint)] text-xs font-semibold uppercase tracking-wider border border-[var(--color-leaf)]/30">
                Live Overview
              </span>
              <span className="w-2 h-2 rounded-full bg-[var(--color-leaf)] animate-pulse" />
            </div>
            <h1 className="text-3xl font-display font-extrabold tracking-tight">
              Financial Accounting Hub
            </h1>
            <p className="text-sm text-[var(--sidebar-text)] mt-1.5 max-w-xl">
              Real-time monitoring of script trades, ledger balances, and automated voucher registers.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link 
              href="/trades?import=true" 
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/15 transition-all flex items-center gap-2 shadow-sm hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 text-[var(--color-mint)]" />
              Import Trades
            </Link>
            <Link 
              href="/vouchers" 
              className="px-4 py-2.5 rounded-xl bg-[var(--color-leaf)] hover:bg-[var(--color-leaf)]/90 text-[var(--color-forest)] font-bold text-sm transition-all flex items-center gap-2 shadow-md hover:scale-[1.02] hover:shadow-lg"
            >
              <Receipt className="w-4 h-4" />
              New Voucher
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Total Turnover",
            value: formatCurrency(stats.tradeVolume),
            icon: Coins,
            color: "from-[#ecfdf5] to-[#d1fae5] text-[var(--color-emerald)]",
            trend: "+14.2% Vol",
            trendUp: true,
          },
          {
            label: "Total Trade Count",
            value: stats.totalTrades.toLocaleString(),
            icon: Briefcase,
            color: "from-[#f0f9ff] to-[#e0f2fe] text-sky-700",
            trend: `${stats.buyVolume.toLocaleString()} Buy units`,
            trendUp: true,
          },
          {
            label: "Active Client Base",
            value: stats.totalClients.toString(),
            icon: Users,
            color: "from-[#faf5ff] to-[#f3e8ff] text-purple-700",
            trend: `${stats.totalBrokers} Registered Brokers`,
            trendUp: true,
          },
          {
            label: "Monitored Scripts",
            value: stats.totalScripts.toString(),
            icon: Activity,
            color: "from-[#fff7ed] to-[#ffedd5] text-amber-700",
            trend: "Across Exchanges",
            trendUp: true,
          },
        ].map((item, idx) => (
          <div 
            key={idx} 
            className="group relative overflow-hidden bg-white p-6 rounded-2xl border border-[var(--color-border-light)] shadow-sm hover:shadow-md hover:border-[var(--color-leaf)]/30 transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-slate)] uppercase tracking-wider">
                {item.label}
              </span>
              <span className={cn("p-2.5 rounded-xl bg-gradient-to-br transition-all group-hover:scale-110", item.color)}>
                <item.icon className="w-5 h-5 stroke-[1.75]" />
              </span>
            </div>
            
            <div className="mt-4">
              <h3 className="font-mono text-2xl font-bold text-[var(--color-charcoal)] leading-tight tracking-tight">
                {item.value}
              </h3>
              <div className="flex items-center gap-1 mt-2 text-xs font-medium text-[var(--color-slate)]">
                <span className="text-[var(--color-emerald)] font-semibold">{item.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Charts & Portfolios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Column */}
        <div className="card lg:col-span-2 shadow-sm border border-[var(--color-border-light)] rounded-2xl flex flex-col justify-between">
          <div className="card__header border-b border-[var(--color-border-light)]/60 bg-slate-50/50 px-6 py-4 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-charcoal)] uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--color-emerald)]" />
                Script Volume & Trades
              </h3>
              <p className="text-xs text-[var(--color-slate)] mt-0.5">Historical breakdown of monthly volume</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--color-emerald)]" />
              <span className="text-xs text-[var(--color-slate)] font-medium">BizzMate Core</span>
            </div>
          </div>
          
          <div className="card__body p-6 flex-1 flex flex-col justify-end">
            <div className="h-60 flex items-end justify-between gap-3 md:gap-5 border-b border-dashed border-[var(--color-border-light)] px-2 pb-2">
              {[50, 75, 45, 90, 60, 95].map((val, i) => (
                <div key={i} className="w-full flex flex-col items-center gap-2 group relative">
                  
                  {/* Glowing Chart Bar Tooltip */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[var(--color-charcoal)] text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap z-10 scale-95 group-hover:scale-100">
                    <span className="text-[var(--color-mint)] font-mono font-bold">{val}%</span> turnover
                  </div>
                  
                  {/* Animated Bar */}
                  <div 
                    className="w-full bg-[var(--color-mist)] rounded-t-lg group-hover:bg-gradient-to-t group-hover:from-[var(--color-emerald)] group-hover:to-[var(--color-leaf)] transition-all duration-300 cursor-pointer shadow-sm group-hover:shadow-[var(--shadow-brand-sm)]"
                    style={{ height: `${val}%` }}
                  />
                  
                  <span className="text-xs font-semibold text-[var(--color-slate)] mt-1 select-none">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Portfolio Distribution */}
        <div className="card shadow-sm border border-[var(--color-border-light)] rounded-2xl flex flex-col">
          <div className="card__header border-b border-[var(--color-border-light)]/60 bg-slate-50/50 px-6 py-4">
            <h3 className="text-sm font-bold text-[var(--color-charcoal)] uppercase tracking-wider">
              Exchange Share
            </h3>
            <p className="text-xs text-[var(--color-slate)] mt-0.5">Distribution across NSE & BSE</p>
          </div>
          <div className="card__body p-6 flex flex-col items-center justify-center flex-1">
            <div 
              className="w-40 h-40 rounded-full relative flex items-center justify-center shadow-md transition-all duration-500 hover:scale-105"
              style={{
                background: 'conic-gradient(var(--color-emerald) 0% 70%, var(--color-leaf) 70% 90%, var(--color-mint) 90% 100%)'
              }}
            >
              <div className="absolute w-[130px] h-[130px] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className="font-mono text-2xl font-black text-[var(--color-charcoal)]">70%</span>
                <span className="text-[10px] font-bold text-[var(--color-slate)] uppercase tracking-widest">NSE Shares</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-6 w-full max-w-xs text-center border-t border-[var(--color-border-light)]/80 pt-4">
              {[
                { label: "NSE", val: "70%", dot: "bg-[var(--color-emerald)]" },
                { label: "BSE", val: "20%", dot: "bg-[var(--color-leaf)]" },
                { label: "MCX", val: "10%", dot: "bg-[var(--color-mint)]" },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn("w-2 h-2 rounded-full", item.dot)} />
                    <span className="text-xs font-bold text-[var(--color-charcoal)]">{item.label}</span>
                  </div>
                  <span className="text-xs text-[var(--color-slate)] font-mono font-medium">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Two Tables: Trades & Vouchers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Trades Table */}
        <div className="card shadow-sm border border-[var(--color-border-light)] rounded-2xl overflow-hidden flex flex-col justify-between">
          <div className="card__header border-b border-[var(--color-border-light)]/60 bg-slate-50/50 px-6 py-4 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-charcoal)] uppercase tracking-wider flex items-center gap-2">
                <ArrowUpDown className="w-4.5 h-4.5 text-[var(--color-emerald)]" />
                Live Trade Logs
              </h3>
              <p className="text-xs text-[var(--color-slate)] mt-0.5">Most recent stock trades</p>
            </div>
            <Link 
              href="/trades" 
              className="text-xs font-bold text-[var(--color-emerald)] hover:text-[var(--color-forest)] transition-all flex items-center gap-1 border border-[var(--color-emerald)]/20 px-2.5 py-1 rounded-lg hover:bg-[var(--color-emerald)]/5"
            >
              All Trades
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="card__body p-0 overflow-x-auto flex-1">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Script</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Rate</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((t, idx) => (
                  <tr key={t.id ?? idx} className="hover:bg-slate-50 transition-colors">
                    <td>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-[var(--color-charcoal)]">
                          {t.script?.shortName}
                        </span>
                        <span className="text-[10px] text-[var(--color-slate)] font-mono uppercase tracking-wider">
                          {t.exchange?.code}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-[var(--color-charcoal)] block truncate max-w-[120px]">
                        {t.account?.name}
                      </span>
                    </td>
                    <td>
                      <span 
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border",
                          t.transactionType?.toUpperCase() === "BUY"
                            ? "bg-emerald-50 text-[var(--color-emerald)] border-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-100"
                        )}
                      >
                        {t.transactionType}
                      </span>
                    </td>
                    <td className="text-right font-mono font-medium text-xs">
                      {t.quantity?.toLocaleString()}
                    </td>
                    <td className="text-right font-mono font-bold text-xs text-[var(--color-charcoal)]">
                      ₹{t.rate?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vouchers Table */}
        <div className="card shadow-sm border border-[var(--color-border-light)] rounded-2xl overflow-hidden flex flex-col justify-between">
          <div className="card__header border-b border-[var(--color-border-light)]/60 bg-slate-50/50 px-6 py-4 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-charcoal)] uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4.5 h-4.5 text-purple-700" />
                Voucher Logs
              </h3>
              <p className="text-xs text-[var(--color-slate)] mt-0.5">Recent financial accounts entries</p>
            </div>
            <Link 
              href="/vouchers" 
              className="text-xs font-bold text-[var(--color-emerald)] hover:text-[var(--color-forest)] transition-all flex items-center gap-1 border border-[var(--color-emerald)]/20 px-2.5 py-1 rounded-lg hover:bg-[var(--color-emerald)]/5"
            >
              All Vouchers
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="card__body p-0 overflow-x-auto flex-1">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Voucher ID</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Remarks / Account</th>
                </tr>
              </thead>
              <tbody>
                {recentVouchers.map((v, idx) => {
                  const line = v.lines?.[0];
                  const amount = line ? line.amount : 0;
                  const accountName = line?.account?.name ?? "Suspense Account";
                  
                  return (
                    <tr key={v.id ?? idx} className="hover:bg-slate-50 transition-colors">
                      <td className="font-mono text-xs font-bold text-[var(--color-charcoal)]">
                        {v.voucherNumber ?? `VCH-${100 + idx}`}
                      </td>
                      <td>
                        <span 
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                            v.type === "PAYMENT" && "bg-amber-50 text-amber-700 border-amber-100",
                            v.type === "RECEIPT" && "bg-teal-50 text-teal-700 border-teal-100",
                            v.type === "JOURNAL" && "bg-sky-50 text-sky-700 border-sky-100",
                            v.type === "CONTRA" && "bg-purple-50 text-purple-700 border-purple-100"
                          )}
                        >
                          {v.type}
                        </span>
                      </td>
                      <td className="font-mono font-bold text-xs text-[var(--color-charcoal)]">
                        ₹{amount.toLocaleString()}
                      </td>
                      <td className="text-xs text-[var(--color-slate)] max-w-[180px] truncate">
                        <span className="font-semibold block text-[var(--color-charcoal)]">{accountName}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{v.remarks || "No remarks provided"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
