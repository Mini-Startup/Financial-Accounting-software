'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, X, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success' | 'security';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconColor: 'text-rose-600',
    aura: 'from-rose-200/50 via-rose-50/20 to-transparent',
    confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
    iconBg: 'bg-rose-50 border-rose-100',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    aura: 'from-amber-200/50 via-amber-50/20 to-transparent',
    confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200',
    iconBg: 'bg-amber-50 border-amber-100',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600',
    aura: 'from-blue-200/50 via-blue-50/20 to-transparent',
    confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
    iconBg: 'bg-blue-50 border-blue-100',
  },
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    aura: 'from-emerald-200/50 via-emerald-50/20 to-transparent',
    confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
    iconBg: 'bg-emerald-50 border-emerald-100',
  },
  security: {
    icon: ShieldAlert,
    iconColor: 'text-purple-600',
    aura: 'from-purple-200/50 via-purple-50/20 to-transparent',
    confirmBtn: 'bg-indigo-950 hover:bg-indigo-900 text-white shadow-indigo-200',
    iconBg: 'bg-purple-50 border-purple-100',
  },
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const config = variantConfig[variant] || variantConfig.danger;
  const IconComponent = config.icon;

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-999999 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
    >
      {/* Modal Container: Matching Image 3 Reference */}
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-sm sm:max-w-md shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-150">
        {/* Soft Ambient Radial Gradient Aura at Top (Matching Image 3) */}
        <div
          className={cn(
            'absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-44 rounded-full blur-2xl pointer-events-none bg-gradient-to-b opacity-80',
            config.aura
          )}
        />

        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer z-10 disabled:opacity-50"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Body */}
        <div className="px-6 pt-9 pb-6 text-center relative z-1">
          {/* Central Circular Icon Badge (Matching Image 3) */}
          <div className="w-14 h-14 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center mx-auto mb-4">
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center border', config.iconBg)}>
              <IconComponent className={cn('w-5 h-5 stroke-[2]', config.iconColor)} />
            </div>
          </div>

          {/* Centered Typography */}
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            {title}
          </h3>
          <div className="text-sm text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
            {message}
          </div>

          {/* Action Buttons: Clean Rounded Pills (Matching Image 3) */}
          <div className="mt-7 flex items-center justify-center gap-3">
            <button
              ref={cancelRef}
              onClick={onCancel}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                'px-6 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
                config.confirmBtn
              )}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Processing…
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}