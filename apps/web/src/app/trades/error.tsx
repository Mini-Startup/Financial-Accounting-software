'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { ActionButton } from '@/components/ui/ActionButton';

export default function TradesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Trades Page Error:', error);
  }, [error]);

  return (
    <div className="card p-8 border-2 border-rose-200 bg-rose-50/40 rounded-2xl text-center max-w-lg mx-auto my-12 space-y-5 shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
        <AlertCircle className="w-6 h-6 stroke-[2.2]" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-slate-900">Unable to Load Trades Blotter</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          The trade data service failed to return transactions. Please check your connectivity and retry.
        </p>
      </div>

      <div className="p-3 rounded-xl bg-white border border-rose-200/80 text-xs font-mono text-rose-700 text-left max-h-24 overflow-auto">
        {error.message || 'Failed to fetch trade records.'}
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <ActionButton
          variant="secondary"
          onClick={() => window.location.href = '/'}
          icon={<ArrowLeft className="w-3.5 h-3.5" />}
        >
          Dashboard
        </ActionButton>
        <ActionButton
          variant="primary"
          onClick={() => reset()}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Retry Blotter
        </ActionButton>
      </div>
    </div>
  );
}
