import Link from 'next/link';
import { Home, ArrowLeft, Search, FileSpreadsheet, Users, Coins, Receipt } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Glow & Badge */}
        <div className="relative inline-block">
          <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#2652C8] text-white shadow-xl border border-slate-700/50">
            <span className="text-4xl font-extrabold font-mono tracking-wider">404</span>
          </div>
        </div>

        {/* Text Copy */}
        <div className="space-y-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Page or Transaction Not Found
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            The ledger route, master record, or financial report you requested does not exist or has been archived.
          </p>
        </div>

        {/* Quick Recovery Navigation */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 text-left">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quick Navigation
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Link
              href="/"
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2652C8] group-hover:scale-105 transition-transform">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Executive Dashboard</div>
                <div className="text-[11px] text-slate-400">Main overview & metrics</div>
              </div>
            </Link>

            <Link
              href="/trades"
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Trades</div>
                <div className="text-[11px] text-slate-400">View & import trades</div>
              </div>
            </Link>

            <Link
              href="/clients"
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Client Accounts</div>
                <div className="text-[11px] text-slate-400">Debtors & party directory</div>
              </div>
            </Link>

            <Link
              href="/closing-rates"
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Closing Rates</div>
                <div className="text-[11px] text-slate-400">Daily settlement rates</div>
              </div>
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px]">K</kbd> to search anywhere</span>
            <Link
              href="/"
              className="inline-flex items-center gap-1 font-semibold text-[#2652C8] hover:text-[#1F42A3] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
