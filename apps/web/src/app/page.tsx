import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-center px-4">
      {/* Decorative center glowing orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-multiply"></div>
      
      <div className="relative z-10 max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 mt-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm text-sm font-medium text-blue-600">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          System Online
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm">
          Unified Account <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">Ledger</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          The next-generation centralized framework orchestrating brokerage metrics, ledger synchronization, and robust financial identities continuously.
        </p>

        <div className="flex items-center justify-center gap-6 pt-6">
          <Link href="/brokers" className="px-8 py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 transition-all hover:scale-105 shadow-lg shadow-blue-200">
            Access Terminal
          </Link>
          <a href="#" className="px-8 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold text-lg hover:bg-gray-50 transition-all shadow-sm">
            View Analytics
          </a>
        </div>
      </div>
      
      {/* Grid Pattern Bottom */}
      <div className="absolute bottom-0 inset-x-0 h-[400px] bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_100%,#fff_70%,transparent_100%)] pointer-events-none -z-10"></div>
    </div>
  );
}
