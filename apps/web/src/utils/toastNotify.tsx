'use client';

import React from 'react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { Check, AlertCircle, AlertTriangle, Info, UploadCloud, X } from 'lucide-react';

export type AlertStatus = 'success' | 'danger' | 'warning' | 'accent' | 'default';

export interface ToastOptions {
  description?: string;
  errors?: string[]; // Multiple error points formatted as clean bullets
  duration?: number;
  status?: AlertStatus;
  progress?: number; // 0 to 100
  actionLabel?: string;
  onAction?: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
  className?: string;
}

/**
 * Executive Alert Notification Toaster
 * Fixed dimensions: 380px width x 180px height.
 * Strict overflow prevention with scrollable content area, state-themed buttons,
 * soft blurred gradients, and clear typographic hierarchy.
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
    status: explicitStatus,
    progress,
    actionLabel,
    onAction,
    cancelLabel,
    onCancel,
    className: customClassName,
  } = options || {};

  // Map application type to Alert status
  const alertStatus: AlertStatus =
    explicitStatus ||
    (type === 'success'
      ? 'success'
      : type === 'error'
      ? 'danger'
      : type === 'warning'
      ? 'warning'
      : 'accent');

  // Status configuration
  const statusConfig = {
    success: {
      cardClass: 'border-2 border-emerald-300/90 bg-gradient-to-br from-emerald-50/90 via-white/95 to-emerald-50/80 shadow-emerald-950/5',
      badgeClass: 'bg-emerald-100 text-emerald-600 border border-emerald-200',
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white',
      indicatorText: 'text-emerald-700',
      indicatorDot: 'bg-emerald-500',
      indicatorLabel: 'System Success',
      progressBarClass: 'bg-emerald-500',
      icon: <Check className="w-3.5 h-3.5 stroke-[2.5]" />,
    },
    danger: {
      cardClass: 'border-2 border-rose-300/90 bg-gradient-to-br from-rose-50/90 via-white/95 to-rose-50/80 shadow-rose-950/5',
      badgeClass: 'bg-rose-100 text-rose-600 border border-rose-200',
      btnClass: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white',
      indicatorText: 'text-rose-700',
      indicatorDot: 'bg-rose-500',
      indicatorLabel: 'Validation Error',
      progressBarClass: 'bg-rose-500',
      icon: <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />,
    },
    warning: {
      cardClass: 'border-2 border-amber-300/90 bg-gradient-to-br from-amber-50/90 via-white/95 to-amber-50/80 shadow-amber-950/5',
      badgeClass: 'bg-amber-100 text-amber-600 border border-amber-200',
      btnClass: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white',
      indicatorText: 'text-amber-700',
      indicatorDot: 'bg-amber-500',
      indicatorLabel: 'Warning Notice',
      progressBarClass: 'bg-amber-500',
      icon: <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />,
    },
    accent: {
      cardClass: 'border-2 border-blue-300/90 bg-gradient-to-br from-blue-50/90 via-white/95 to-blue-50/80 shadow-blue-950/5',
      badgeClass: 'bg-blue-100 text-[#2652C8] border border-blue-200',
      btnClass: 'bg-[#2652C8] hover:bg-[#1E42A8] active:bg-[#183688] text-white',
      indicatorText: 'text-[#2652C8]',
      indicatorDot: 'bg-[#2652C8]',
      indicatorLabel: 'System Notice',
      progressBarClass: 'bg-[#2652C8]',
      icon: type === 'upload' ? <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" /> : <Info className="w-3.5 h-3.5 stroke-[2.5]" />,
    },
    default: {
      cardClass: 'border-2 border-slate-300/90 bg-gradient-to-br from-slate-50/90 via-white/95 to-slate-50/80 shadow-slate-900/5',
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
      btnClass: 'bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white',
      indicatorText: 'text-slate-700',
      indicatorDot: 'bg-slate-500',
      indicatorLabel: 'Notice',
      progressBarClass: 'bg-slate-700',
      icon: <Info className="w-3.5 h-3.5 stroke-[2.5]" />,
    },
  }[alertStatus];

  return toast.custom((t) => {
    return (
      <div className="w-[380px] min-w-[380px] max-w-[380px] h-[180px] min-h-[180px] max-h-[180px] select-none pointer-events-auto">
        <div
          className={cn(
            'relative h-full w-full overflow-hidden rounded-2xl border-2 p-3.5 flex flex-col justify-between shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in zoom-in-95',
            statusConfig.cardClass,
            customClassName
          )}
        >
          {/* Top Header */}
          <div className="flex items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className={cn(
                  'size-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs',
                  statusConfig.badgeClass
                )}
              >
                {statusConfig.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-snug truncate">
                  {title}
                </h4>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toast.dismiss(t)}
              className="p-1 -mr-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content Area — strictly prevents any overflow */}
          <div className="flex-1 my-1.5 min-h-0 overflow-y-auto pr-1">
            {description && (
              <p className="text-xs text-slate-600 font-normal leading-relaxed">
                {description}
              </p>
            )}

            {/* Error List with red X icons and balanced typography */}
            {errors && errors.length > 0 && (
              <ul className="space-y-1.5 text-xs text-slate-700">
                {errors.map((err, idx) => {
                  const colonIndex = err.indexOf(':');
                  const hasPrefix = colonIndex > 0 && colonIndex < 35;
                  const prefix = hasPrefix ? err.slice(0, colonIndex) : null;
                  const rest = hasPrefix ? err.slice(colonIndex + 1).trim() : err;

                  return (
                    <li key={idx} className="flex items-start gap-1.5 leading-snug">
                      <div className="size-3.5 rounded-full bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                        <X className="w-2.5 h-2.5 text-rose-600 stroke-[3]" />
                      </div>
                      <span className="break-words flex-1 text-slate-600">
                        {prefix ? (
                          <>
                            <span className="font-semibold text-slate-800">{prefix}:</span>{' '}
                            <span className="font-normal text-slate-600">{rest}</span>
                          </>
                        ) : (
                          <span className="font-normal text-slate-600">{err}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Bottom Footer with state-themed action button */}
          <div className="shrink-0 pt-2 border-t border-slate-200/60 flex items-center justify-between">
            {typeof progress === 'number' ? (
              <div className="w-full space-y-1">
                <div className="w-full h-1.5 bg-slate-100 rounded-md overflow-hidden">
                  <div
                    className={cn('h-full transition-all duration-300 rounded-md', statusConfig.progressBarClass)}
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>Processing</span>
                  <span>{progress}%</span>
                </div>
              </div>
            ) : (actionLabel || cancelLabel) ? (
              <div className="w-full flex items-center justify-end gap-2">
                {cancelLabel && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onCancel) onCancel();
                      toast.dismiss(t);
                    }}
                    className="h-7 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
                    className={cn(
                      'h-7 px-3.5 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer',
                      statusConfig.btnClass
                    )}
                  >
                    {actionLabel}
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig.indicatorDot)} />
                  <span className={statusConfig.indicatorText}>
                    {statusConfig.indicatorLabel}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => toast.dismiss(t)}
                  className={cn(
                    'h-7 px-3.5 text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer active:scale-95',
                    statusConfig.btnClass
                  )}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
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
  upload: (title: string, options?: ToastOptions) =>
    showExecutiveToast('upload', title, options),
  custom: (status: AlertStatus, title: string, options?: ToastOptions) =>
    showExecutiveToast('info', title, { ...options, status }),
};
