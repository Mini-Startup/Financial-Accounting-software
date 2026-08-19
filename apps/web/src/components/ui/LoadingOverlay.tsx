'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export function LoadingOverlay({
  message = 'Loading...',
  description,
  fullScreen = false,
  className,
}: {
  message?: string;
  description?: string;
  fullScreen?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs z-40 p-6 rounded-xl transition-all duration-200',
        fullScreen ? 'fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm' : 'absolute inset-0',
        className
      )}
    >
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center max-w-xs animate-in fade-in zoom-in-95 duration-150">
        <Loader2 className="w-9 h-9 text-emerald-600 animate-spin mb-3 stroke-[2.5]" />
        <p className="text-sm font-bold text-slate-800 font-display">{message}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-1 font-medium">{description}</p>
        )}
      </div>
    </div>
  );
}
