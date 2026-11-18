'use client';

import { toast } from 'sonner';
import { Check, X, AlertTriangle, AlertCircle, Info, UploadCloud, ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ToastOptions {
  description?: string;
  errors?: string[]; // Multiple error points formatted as clean bullets
  duration?: number;
  progress?: number; // 0 to 100 (matching Image 2 progress bar)
  progressLabel?: string;
  cancelLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  onCancel?: () => void;
}

/**
 * Executive Toast Notification matching Image 2 reference design:
 * - Rounded-2xl card with soft ambient aura in top-left
 * - Elevated circular disc containing the colored status badge
 * - Clean title & description typography
 * - Top-right dismiss 'x' positioned neatly inside card padding
 * - Optional progress bar and actions (Cancel / Action)
 */
export function showExecutiveToast(
  type: 'success' | 'error' | 'warning' | 'info' | 'upload',
  title: string,
  options?: ToastOptions
) {
  const {
    description,
    errors,
    duration = errors && errors.length > 0 ? 7000 : 4500,
    progress,
    progressLabel,
    cancelLabel,
    actionLabel,
    onAction,
    onCancel,
  } = options || {};

  return toast.custom((t) => {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_20px_45px_-8px_rgba(15,23,42,0.14),0_4px_16px_rgba(15,23,42,0.05)] p-4 sm:p-4.5 w-[370px] sm:w-[440px] flex flex-col gap-2 relative overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200 select-none">
        
        {/* Ambient Top-Left Aura (Matching Image 2) */}
        <div
          className={cn(
            'absolute -top-12 -left-12 w-48 h-36 rounded-full blur-2xl pointer-events-none',
            type === 'success' && 'bg-emerald-400/20',
            type === 'error' && 'bg-rose-400/20',
            type === 'warning' && 'bg-amber-400/20',
            (type === 'info' || type === 'upload') && 'bg-blue-400/20'
          )}
        />

        {/* Clean Top-Right Dismiss 'x' inside card (Matching Image 2) */}
        <button
          type="button"
          onClick={() => toast.dismiss(t)}
          className="absolute top-3.5 right-3.5 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-lg transition-colors cursor-pointer z-10"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Row: Elevated Disc Icon + Title & Description (Matching Image 2) */}
        <div className="flex items-start gap-3.5 pr-6 relative z-1">
          {/* Elevated Circular Disc */}
          <div className="w-11 h-11 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center shrink-0">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0',
                type === 'success' && 'bg-emerald-500',
                type === 'error' && 'bg-rose-500',
                type === 'warning' && 'bg-amber-500',
                type === 'upload' && 'bg-[#2652C8]',
                type === 'info' && 'bg-[#2652C8]'
              )}
            >
              {type === 'success' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              {type === 'error' && <AlertCircle className="w-3.5 h-3.5 stroke-[3]" />}
              {type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 stroke-[3]" />}
              {type === 'upload' && <ArrowUp className="w-3.5 h-3.5 stroke-[3]" />}
              {type === 'info' && <Info className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>

          {/* Title & Description */}
          <div className="min-w-0 pt-0.5">
            <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
              {title}
            </h4>
            {description && (
              <p className="text-xs text-slate-500 font-normal leading-relaxed mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Multi-Error List Card (Matching user error notification request) */}
        {errors && errors.length > 0 && (
          <div className="mt-2 space-y-1.5 bg-rose-50/70 border border-rose-100/90 rounded-xl p-3 text-xs relative z-1">
            {errors.map((err, idx) => (
              <div key={idx} className="flex items-start gap-2 text-rose-800">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                <span className="leading-snug font-medium">{err}</span>
              </div>
            ))}
          </div>
        )}

        {/* Progress Bar (Matching Image 2 Reference) */}
        {typeof progress === 'number' && (
          <div className="space-y-1.5 pt-1.5 relative z-1">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300 rounded-full',
                  progress >= 100
                    ? 'bg-emerald-500'
                    : type === 'error'
                    ? 'bg-rose-500'
                    : 'bg-blue-600'
                )}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono font-medium">
              <span>{progressLabel || `${progress}% completed...`}</span>
            </div>
          </div>
        )}

        {/* Action / Cancel links at bottom (Matching Image 2) */}
        {(cancelLabel || actionLabel) && (
          <div className="flex items-center gap-4 pt-1.5 text-xs relative z-1">
            {cancelLabel && (
              <button
                type="button"
                onClick={() => {
                  if (onCancel) onCancel();
                  toast.dismiss(t);
                }}
                className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer transition-colors"
              >
                {cancelLabel}
              </button>
            )}
            {actionLabel && (
              <button
                type="button"
                onClick={() => {
                  if (onAction) onAction();
                  toast.dismiss(t);
                }}
                className="text-[#2652C8] hover:text-blue-800 font-bold cursor-pointer transition-colors"
              >
                {actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }, { duration });
}

export const notify = {
  success: (title: string, options?: string | ToastOptions) => {
    if (typeof options === 'string') {
      return showExecutiveToast('success', title, { description: options });
    }
    return showExecutiveToast('success', title, options);
  },
  error: (title: string, options?: string | ToastOptions) => {
    if (typeof options === 'string') {
      return showExecutiveToast('error', title, { description: options });
    }
    return showExecutiveToast('error', title, options);
  },
  info: (title: string, options?: string | ToastOptions) => {
    if (typeof options === 'string') {
      return showExecutiveToast('info', title, { description: options });
    }
    return showExecutiveToast('info', title, options);
  },
  warning: (title: string, options?: string | ToastOptions) => {
    if (typeof options === 'string') {
      return showExecutiveToast('warning', title, { description: options });
    }
    return showExecutiveToast('warning', title, options);
  },
  upload: (title: string, progress?: number, options?: ToastOptions) =>
    showExecutiveToast('upload', title, { progress, ...options }),
};
