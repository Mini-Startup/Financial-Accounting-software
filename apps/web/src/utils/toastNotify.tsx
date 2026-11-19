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
 * Built with precision layout, circular status badge, sleek progress indicator, and clean inline dismiss.
 * Matches executive design reference.
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
      cardClass: 'border-emerald-200/80 bg-white shadow-xl shadow-emerald-950/5',
      badgeClass: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80',
      progressBarClass: 'bg-emerald-500',
      icon: <Check className="w-4 h-4 stroke-[2.5]" />,
    },
    danger: {
      cardClass: 'border-rose-200/80 bg-white shadow-xl shadow-rose-950/5',
      badgeClass: 'bg-rose-50 text-rose-600 border border-rose-200/80',
      progressBarClass: 'bg-rose-500',
      icon: <AlertCircle className="w-4 h-4 stroke-[2.5]" />,
    },
    warning: {
      cardClass: 'border-amber-200/80 bg-white shadow-xl shadow-amber-950/5',
      badgeClass: 'bg-amber-50 text-amber-600 border border-amber-200/80',
      progressBarClass: 'bg-amber-500',
      icon: <AlertTriangle className="w-4 h-4 stroke-[2.5]" />,
    },
    accent: {
      cardClass: 'border-blue-200/80 bg-white shadow-xl shadow-[#2652C8]/5',
      badgeClass: 'bg-blue-50 text-[#2652C8] border border-blue-200/80',
      progressBarClass: 'bg-[#2652C8]',
      icon: type === 'upload' ? <UploadCloud className="w-4 h-4 stroke-[2.5]" /> : <Info className="w-4 h-4 stroke-[2.5]" />,
    },
    default: {
      cardClass: 'border-slate-200/80 bg-white shadow-xl shadow-slate-900/5',
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
      progressBarClass: 'bg-slate-700',
      icon: <Info className="w-4 h-4 stroke-[2.5]" />,
    },
  }[alertStatus];

  return toast.custom((t) => {
    return (
      <div className="w-fit max-w-[290px] select-none">
        <div
          className={cn(
            'relative overflow-hidden rounded-xl border p-3 sm:p-3.5 transition-all duration-200 animate-in fade-in zoom-in-95',
            statusConfig.cardClass,
            customClassName
          )}
        >
          <div className="flex items-start gap-3">
            {/* Status Icon Badge (rounded-xl, brand consistent) */}
            <div
              className={cn(
                'size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs',
                statusConfig.badgeClass
              )}
            >
              {statusConfig.icon}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900 tracking-tight leading-snug">
                  {title}
                </h4>
                <button
                  type="button"
                  onClick={() => toast.dismiss(t)}
                  className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {description && (
                <p className="text-[11px] text-slate-500 font-normal leading-relaxed mt-0.5">
                  {description}
                </p>
              )}

              {/* Progress Bar Display */}
              {typeof progress === 'number' && (
                <div className="mt-2.5 space-y-1">
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
              )}

              {/* Bulleted Error List */}
              {errors && errors.length > 0 && (
                <div className="mt-2 text-[11px]">
                  <ul className="space-y-1 text-slate-600">
                    {errors.map((err, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-tight">
                        <span className="w-1.5 h-1.5 rounded-xs bg-rose-500 shrink-0 mt-1" />
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              {(actionLabel || cancelLabel) && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
                  {cancelLabel && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onCancel) onCancel();
                        toast.dismiss(t);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
                        'px-3 py-1 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer',
                        alertStatus === 'danger'
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-[#2652C8] hover:bg-[#1F42A3] text-white'
                      )}
                    >
                      {actionLabel}
                    </button>
                  )}
                </div>
              )}
            </div>
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
