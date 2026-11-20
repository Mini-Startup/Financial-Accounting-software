'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Fatal Global Layout Error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-6 font-sans antialiased">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-6 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">System Level Error</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              A critical error prevented the application layout from mounting.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-left text-xs font-mono text-rose-300 max-h-24 overflow-auto">
            {error.message || 'Fatal layout crash'}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Reload App
            </button>
            <button
              type="button"
              onClick={() => reset()}
              className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Retry Layout
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
