'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw, Home, ShieldAlert } from 'lucide-react';
import { ActionButton } from '@/components/ui/ActionButton';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Root App Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border-2 border-rose-200/90 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Accent */}
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 p-6 text-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/25">
            <AlertCircle className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Application Error</h2>
            <p className="text-xs text-rose-100 mt-0.5">An unexpected error occurred during execution</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            The system encountered an unhandled exception while rendering this page. You can attempt to retry the failed operation or return to the main dashboard.
          </p>

          {/* Diagnostic Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1 text-slate-700 overflow-x-auto max-h-32">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">
              Diagnostic Details
            </div>
            <div className="text-rose-600 font-semibold">{error.message || 'Unknown runtime error'}</div>
            {error.digest && (
              <div className="text-slate-400 text-[10px]">Digest: {error.digest}</div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <ActionButton
              variant="secondary"
              icon={<Home className="w-3.5 h-3.5" />}
              onClick={() => router.push('/')}
            >
              Dashboard
            </ActionButton>
            <ActionButton
              variant="danger"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => reset()}
            >
              Try Again
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
