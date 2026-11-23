import type { Metadata } from "next";
import { prisma } from "@/database";
import {
  TrendingUp,
  Users,
  Briefcase,
  Activity,
  ArrowUpDown,
  Coins,
  Receipt,
  ChevronRight,
  Plus,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Scale,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Clock,
  Building2,
  FolderOpen
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils/cn";

export const metadata: Metadata = {
  title: "Dashboard | BizzMate Accounting",
  description: "Executive financial intelligence hub, real-time trades, counterparty risk, and settlement analytics.",
};

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // Safe defaults
  let stats = {
    totalTrades: 0,
    totalClients: 0,
    totalBrokers: 0,
    totalScripts: 0,
    grossTurnover: 0,
    buyTurnover: 0,
    sellTurnover: 0,
    buyUnits: 0,
    sellUnits: 0,
    buyCount: 0,
    sellCount: 0,
    avgTradeSize: 0,
    closingRatesCount: 0,
    latestClosingRateDate: null as string | null,
  };

  let topScripts: Array<{
    shortName: string;
    fullName: string;
    exchangeCode: string;
    tradeCount: number;
    turnover: number;
    units: number;
    buyUnits: number;
    sellUnits: number;
    percentShare: number;
  }> = [];

  let exchangeDistribution: Array<{
    code: string;
    name: string;
    tradeCount: number;
    turnover: number;
    percentShare: number;
  }> = [];

  let recentTrades: any[] = [];
  let recentVouchers: any[] = [];

  try {
    // 1. Fetch real statistics & comprehensive trade records
    const [
      totalTrades,
      totalClients,
      totalBrokers,
      totalScripts,
      allTrades,
      recentTradesData,
      vouchersData,
      closingRatesCount,
      latestClosingRate,
    ] = await Promise.all([
      prisma.trade.count({ where: { isDeleted: false } }),
      prisma.account.count({
        where: { group: { name: "Sundry Debtors" }, isDeleted: false },
      }),
      prisma.account.count({
        where: { group: { name: "Sundry Creditors" }, isDeleted: false },
      }),
      prisma.script.count({ where: { isDeleted: false } }),
      prisma.trade.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          quantity: true,
          rate: true,
          transactionType: true,
          script: { select: { shortName: true, fullName: true } },
          exchange: { select: { code: true, name: true } },
        },
      }),
      prisma.trade.findMany({
        where: { isDeleted: false },
        take: 6,
        include: {
          script: true,
          account: true,
          broker: true,
          exchange: true,
        },
        orderBy: { tradeDate: "desc" },
      }),
      prisma.voucher.findMany({
        where: { isDeleted: false },
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
      prisma.closingRate.count({ where: { isDeleted: false } }),
      prisma.closingRate.findFirst({
        where: { isDeleted: false },
        orderBy: { rateDate: "desc" },
        select: { rateDate: true },
      }),
    ]);

    // 2. Perform deep analytical aggregations across all trades
    let gross = 0;
    let buyTurn = 0;
    let sellTurn = 0;
    let buyQty = 0;
    let sellQty = 0;
    let buyTrades = 0;
    let sellTrades = 0;

    const scriptMap: Record<
      string,
      {
        shortName: string;
        fullName: string;
        exchangeCode: string;
        tradeCount: number;
        turnover: number;
        units: number;
        buyUnits: number;
        sellUnits: number;
      }
    > = {};

    const exchangeMap: Record<
      string,
      {
        code: string;
        name: string;
        tradeCount: number;
        turnover: number;
      }
    > = {};

    allTrades.forEach((t) => {
      const q = Number(t.quantity) || 0;
      const r = Number(t.rate) || 0;
      const val = q * r;
      gross += val;

      const isBuy = t.transactionType?.toUpperCase() === "BUY";
      if (isBuy) {
        buyTurn += val;
        buyQty += q;
        buyTrades += 1;
      } else {
        sellTurn += val;
        sellQty += q;
        sellTrades += 1;
      }

      // Aggregate Script performance
      const sKey = t.script?.shortName || "OTHER";
      if (!scriptMap[sKey]) {
        scriptMap[sKey] = {
          shortName: sKey,
          fullName: t.script?.fullName || sKey,
          exchangeCode: t.exchange?.code || "EXCH",
          tradeCount: 0,
          turnover: 0,
          units: 0,
          buyUnits: 0,
          sellUnits: 0,
        };
      }
      scriptMap[sKey].tradeCount += 1;
      scriptMap[sKey].turnover += val;
      scriptMap[sKey].units += q;
      if (isBuy) scriptMap[sKey].buyUnits += q;
      else scriptMap[sKey].sellUnits += q;

      // Aggregate Exchange distribution
      const eKey = t.exchange?.code || "OTHER";
      if (!exchangeMap[eKey]) {
        exchangeMap[eKey] = {
          code: eKey,
          name: t.exchange?.name || eKey,
          tradeCount: 0,
          turnover: 0,
        };
      }
      exchangeMap[eKey].tradeCount += 1;
      exchangeMap[eKey].turnover += val;
    });

    const avgSize = totalTrades > 0 ? gross / totalTrades : 0;

    // Calculate percent shares for top scripts
    topScripts = Object.values(scriptMap)
      .sort((a, b) => b.turnover - a.turnover)
      .slice(0, 5)
      .map((s) => ({
        ...s,
        percentShare: gross > 0 ? (s.turnover / gross) * 100 : 0,
      }));

    // Calculate percent shares for exchanges
    exchangeDistribution = Object.values(exchangeMap)
      .sort((a, b) => b.turnover - a.turnover)
      .map((e) => ({
        ...e,
        percentShare: gross > 0 ? (e.turnover / gross) * 100 : 0,
      }));

    stats = {
      totalTrades,
      totalClients,
      totalBrokers,
      totalScripts,
      grossTurnover: gross,
      buyTurnover: buyTurn,
      sellTurnover: sellTurn,
      buyUnits: buyQty,
      sellUnits: sellQty,
      buyCount: buyTrades,
      sellCount: sellTrades,
      avgTradeSize: avgSize,
      closingRatesCount,
      latestClosingRateDate: latestClosingRate?.rateDate
        ? new Date(latestClosingRate.rateDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : null,
    };

    recentTrades = recentTradesData;
    recentVouchers = vouchersData;
  } catch (error) {
    console.error("Dashboard database query failed:", error);
  }

  // Format currency with Indian locale
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const buyTurnPercent =
    stats.grossTurnover > 0
      ? Math.round((stats.buyTurnover / stats.grossTurnover) * 100)
      : 50;
  const sellTurnPercent = 100 - buyTurnPercent;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      {/* <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-white via-[#EFF4FF] to-[#5F8AEC]/20 p-6 sm:p-8 text-slate-900 shadow-xl shadow-blue-500/5 border border-blue-200/80">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#5F8AEC]/15 blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 -bottom-20 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 top-1/2 w-48 h-48 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold tracking-wide shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Trading Session Active
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 border border-blue-200/80 text-blue-800 text-xs font-mono shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Double-Entry Ledger Engine
              </span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-display">
                Financial Intelligence Hub
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Central executive cockpit for trade transactions, mark-to-market valuations, client ledger exposures, and automated financial settlements.
              </p>
            </div>

           
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-slate-500">Gross Trades:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(stats.grossTurnover)}
                </span>
              </div>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-slate-500">Traded Volume:</span>
                <span className="font-mono font-bold text-slate-900">
                  {stats.totalTrades} Executions ({stats.buyUnits + stats.sellUnits} Units)
                </span>
              </div>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-slate-500">Latest MTM:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {stats.latestClosingRateDate || "Sync Pending"}
                </span>
              </div>
            </div>
          </div>

          
          <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto">
            <Link
              href="/trades?import=true"
              className="group relative inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-full bg-white hover:bg-blue-50/70 text-slate-700 hover:text-blue-800 text-xs font-semibold border border-slate-200/90 hover:border-blue-300 shadow-2xs transition-all duration-200 active:scale-95"
            >
              <span>Import Trades</span>
              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
            </Link>

            <Link
              href="/closing-rates?import=true"
              className="group relative inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-full bg-white hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-800 text-xs font-semibold border border-slate-200/90 hover:border-emerald-300 shadow-2xs transition-all duration-200 active:scale-95"
            >
              <span>Import Rates</span>
              <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
            </Link>

            <Link
              href="/vouchers"
              className="group relative inline-flex items-center justify-between gap-3 px-5 py-2.5 rounded-full bg-[#2652C8] hover:bg-[#1F42A3] text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all duration-200 active:scale-95"
            >
              <span>New Voucher</span>
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:scale-110">
                <Receipt className="w-3.5 h-3.5 text-white" />
              </span>
            </Link>
          </div>
        </div>
      </div> 
      */}

      {/* ─────────────────────────────────────────────────────────────
          2. DOUBLE-BEZEL FINANCIAL KPI MATRIX (REAL DATA)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: Gross Trading Turnover */}
        <div className="bg-slate-100/70 p-1.5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="bg-white p-5 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Gross Turnover
                </span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center">
                  <Coins className="w-4 h-4 stroke-[2]" />
                </span>
              </div>
              <div className="mt-3">
                <div className="font-mono text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight leading-tight">
                  {formatCurrency(stats.grossTurnover)}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">
                  Avg Ticket: <span className="font-mono font-semibold text-slate-700">{formatCurrency(stats.avgTradeSize)}</span>
                </div>
              </div>
            </div>

            {/* Buy / Sell Visual Split Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                <span className="text-emerald-700 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {buyTurnPercent}% Buy
                </span>
                <span className="text-rose-700 flex items-center gap-1 font-mono">
                  {sellTurnPercent}% Sell
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${buyTurnPercent}%` }}
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${sellTurnPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI 2: Execution Volumes & Trade Count */}
        <div className="bg-slate-100/70 p-1.5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="bg-white p-5 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Trade Executions
                </span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/70 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 stroke-[2]" />
                </span>
              </div>
              <div className="mt-3">
                <div className="font-mono text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight leading-tight flex items-baseline gap-2">
                  <span>{stats.totalTrades}</span>
                  <span className="text-xs text-slate-400 font-sans font-medium">Orders</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">
                  Traded Volume: <span className="font-mono font-semibold text-slate-700">{stats.buyUnits + stats.sellUnits} Units</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 font-medium">Distribution</span>
              <div className="flex items-center gap-2 text-[11px] font-mono font-semibold">
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  {stats.buyCount} Buy
                </span>
                <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
                  {stats.sellCount} Sell
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3: Counterparty Network (Debtors & Creditors) */}
        <div className="bg-slate-100/70 p-1.5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="bg-white p-5 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Active Parties
                </span>
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/70 flex items-center justify-center">
                  <Users className="w-4 h-4 stroke-[2]" />
                </span>
              </div>
              <div className="mt-3">
                <div className="font-mono text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight leading-tight flex items-baseline gap-2">
                  <span>{stats.totalClients}</span>
                  <span className="text-xs text-slate-400 font-sans font-medium">Clients</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">
                  Clearing Brokers: <span className="font-mono font-semibold text-slate-700">{stats.totalBrokers} Accounts</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 font-medium">Ledger Registry</span>
              <Link
                href="/clients"
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-0.5"
              >
                <span>Parties</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* KPI 4: Traded Securities & MTM Sync Status */}
        <div className="bg-slate-100/70 p-1.5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="bg-white p-5 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Securities & MTM
                </span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center">
                  <Activity className="w-4 h-4 stroke-[2]" />
                </span>
              </div>
              <div className="mt-3">
                <div className="font-mono text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight leading-tight flex items-baseline gap-2">
                  <span>{stats.totalScripts}</span>
                  <span className="text-xs text-slate-400 font-sans font-medium">Scripts</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">
                  Closing Rates: <span className="font-mono font-semibold text-slate-700">{stats.closingRatesCount} Records</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 font-medium">MTM Valuation</span>
              <Link
                href="/closing-rates"
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 hover:bg-emerald-100 transition-colors flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Rates Ready</span>
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. REAL ANALYTICS & MARKET INTELLIGENCE (SCRIPTS & EXCHANGES)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Real Traded Securities Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
          {/* Card Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#2652C8]" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Traded Securities & Volume Leaderboard
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real turnover aggregation and lot volume distribution computed across active trade orders.
              </p>
            </div>
            <Link
              href="/reports/net-position"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 bg-blue-50/80 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200/60"
            >
              <span>Net Position</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Leaderboard Body */}
          <div className="p-6 flex-1 flex flex-col justify-center">
            {topScripts.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No Traded Securities Logged</p>
                <p className="text-[11px] text-slate-400">Import trade files to visualize script turnover.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topScripts.map((script, idx) => {
                  const maxTurnover = topScripts[0]?.turnover || 1;
                  const barWidth = Math.max(10, Math.round((script.turnover / maxTurnover) * 100));

                  return (
                    <div
                      key={script.shortName}
                      className="group p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-slate-100 font-mono text-[10px] font-bold text-slate-600 flex items-center justify-center shrink-0">
                            0{idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                              {script.shortName}
                            </span>
                            <span className="ml-2 text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500 uppercase border border-slate-200/60">
                              {script.exchangeCode}
                            </span>
                          </div>
                        </div>

                        {/* Turnover Value & Share */}
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(script.turnover)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {script.percentShare.toFixed(1)}% of total • {script.units} Units
                          </div>
                        </div>
                      </div>

                      {/* Visual Proportional Volume Bar with Buy/Sell Tint */}
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-linear-to-r from-blue-600 to-[#3B6BDF] rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Real Exchange Liquidity Share */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
          {/* Card Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/40">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Exchange Share & Flow
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live trade turnover distribution across connected market bourses.
            </p>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            {exchangeDistribution.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No exchange trade activity registered.
              </div>
            ) : (
              <div className="space-y-5">
                {/* Visual Stacked Exchange Multi-Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
                    <span>Portfolio Bourses</span>
                    <span className="font-mono text-[11px] font-bold text-slate-700">
                      {exchangeDistribution.length} Active
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden p-0.5 gap-0.5">
                    {exchangeDistribution.map((ex, i) => {
                      const colors = [
                        "bg-[#2652C8]",
                        "bg-blue-400",
                        "bg-sky-300",
                        "bg-indigo-500",
                        "bg-slate-400",
                      ];
                      return (
                        <div
                          key={ex.code}
                          title={`${ex.code}: ${ex.percentShare.toFixed(1)}%`}
                          className={cn("h-full rounded-xs transition-all duration-500", colors[i % colors.length])}
                          style={{ width: `${Math.max(4, ex.percentShare)}%` }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Exchange Item Cards */}
                <div className="space-y-3">
                  {exchangeDistribution.map((ex, idx) => {
                    const dotColors = [
                      "bg-[#2652C8]",
                      "bg-blue-400",
                      "bg-sky-300",
                      "bg-indigo-500",
                      "bg-slate-400",
                    ];
                    return (
                      <div
                        key={ex.code}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-white hover:border-slate-200 transition-all duration-150"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dotColors[idx % dotColors.length])} />
                          <div>
                            <span className="font-bold text-slate-900 text-xs">{ex.code}</span>
                            <span className="block text-[10px] text-slate-400">{ex.tradeCount} Trades</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-xs font-bold text-slate-900">
                            {formatCurrency(ex.turnover)}
                          </div>
                          <div className="text-[10px] font-mono font-semibold text-blue-700">
                            {ex.percentShare.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Market Sentinel Card */}
                <div className="p-3.5 rounded-2xl bg-linear-to-br from-slate-900 to-slate-800 text-white">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-300">Net Flow Balance</span>
                    <span className="font-mono text-emerald-400">
                      {stats.buyCount >= stats.sellCount ? "Accumulation" : "Distribution"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Client orders show balanced liquidity. Daily mark-to-market positions are ready for end-of-day settlement.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. OPERATIONAL ACTIVITY (TRADES & VOUCHERS)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Trades Table Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/70 flex items-center justify-center shrink-0">
                <ArrowUpDown className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Live Trades
                </h3>
                <p className="text-xs text-slate-400">Most recent executed trades from broker orders</p>
              </div>
            </div>
            <Link
              href="/trades"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200/60"
            >
              <span>All Trades ({stats.totalTrades})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-0 overflow-x-auto flex-1">
            {recentTrades.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#2652C8] flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800">No Trades Recorded Yet</div>
                  <div className="text-[11px] text-slate-400">Import your broker trade file to see live trades.</div>
                </div>
                <Link
                  href="/trades?import=true"
                  className="px-4 py-2 rounded-xl bg-[#2652C8] hover:bg-[#1F42A3] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Import Trades</span>
                </Link>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Script</th>
                    <th className="py-3 px-4">Party</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Qty</th>
                    <th className="py-3 px-4 text-right">Rate</th>
                    <th className="py-3 px-4 text-right">Net Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTrades.map((t, idx) => {
                    const isBuy = t.transactionType?.toUpperCase() === "BUY";
                    const totalVal = (Number(t.quantity) || 0) * (Number(t.rate) || 0);

                    return (
                      <tr key={t.id ?? idx} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {t.script?.shortName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono uppercase">
                              {t.exchange?.code}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-800 block truncate max-w-32">
                            {t.account?.name || "Client"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {t.broker?.name || "Broker"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border",
                              isBuy
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            )}
                          >
                            {isBuy ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {t.transactionType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                          {t.quantity?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                          ₹{t.rate?.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(totalVal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Vouchers Table Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/70 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Voucher & Cash Ledger
                </h3>
                <p className="text-xs text-slate-400">Recent double-entry payment and receipt logs</p>
              </div>
            </div>
            <Link
              href="/vouchers"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200/60"
            >
              <span>All Vouchers</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-0 overflow-x-auto flex-1">
            {recentVouchers.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center">
                  <Receipt className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800">No Vouchers Recorded</div>
                  <div className="text-[11px] text-slate-400">Post client payments, receipts, or journal vouchers.</div>
                </div>
                <Link
                  href="/vouchers"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Voucher</span>
                </Link>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Voucher No</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Account / Narration</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentVouchers.map((v, idx) => {
                    const line = v.lines?.[0];
                    const amount = line ? line.amount : 0;
                    const accountName = line?.account?.name ?? "General Suspense";

                    return (
                      <tr key={v.id ?? idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {v.voucherNumber ?? `VCH-${100 + idx}`}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border",
                              v.type === "PAYMENT" && "bg-amber-50 text-amber-700 border-amber-200",
                              v.type === "RECEIPT" && "bg-teal-50 text-teal-700 border-teal-200",
                              v.type === "JOURNAL" && "bg-sky-50 text-sky-700 border-sky-200",
                              v.type === "CONTRA" && "bg-purple-50 text-purple-700 border-purple-200"
                            )}
                          >
                            {v.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-48 truncate">
                          <span className="font-semibold text-slate-900 block truncate">{accountName}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{v.remarks || "Standard entry"}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. QUICK OPERATIONS & AUDIT WORKSPACE (BENTO GRID)
          ───────────────────────────────────────────────────────────── */}
      <div className="pt-2">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Quick Financial Operations & Ledger Hub
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct entry points for high-frequency daily accounting workflows.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Trade Import Wizard",
              description: "Bulk CSV/Excel trade mapping with pre-parse format checks",
              icon: FileSpreadsheet,
              href: "/trades?import=true",
              badge: "Trades",
              badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
            },
            {
              title: "Daily Closing Rates",
              description: "Ingest settlement prices & mark-to-market rate valuations",
              icon: TrendingUp,
              href: "/closing-rates?import=true",
              badge: "Valuation",
              badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
            },
            {
              title: "Net Position Report",
              description: "Real-time open exposures, quantity aggregates & P&L",
              icon: PieChart,
              href: "/reports/net-position",
              badge: "Risk & Exposure",
              badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
            },
            {
              title: "Trial Balance Ledger",
              description: "Double-entry ledger verification across asset & liability accounts",
              icon: Scale,
              href: "/trial-balance",
              badge: "Audit Report",
              badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
            },
          ].map((op, idx) => {
            const Icon = op.icon;
            return (
              <Link
                key={idx}
                href={op.href}
                className="group relative p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200/60 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200 flex items-center justify-center transition-colors">
                      <Icon className="w-5 h-5 text-slate-700 group-hover:text-blue-700 transition-colors" />
                    </span>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", op.badgeColor)}>
                      {op.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    {op.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {op.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="group-hover:text-blue-700 transition-colors font-semibold">Launch Flow</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
