'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, X, RefreshCw } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
    accentBorder: 'border-rose-200',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
    accentBorder: 'border-amber-200',
  },
  info: {
    icon: Info,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-700',
    confirmBtn: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    accentBorder: 'border-emerald-200',
  },
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const config = variantConfig[variant];
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
    >
      <div className={`bg-[var(--bg-card)] border ${config.accentBorder} rounded-2xl w-full max-w-md shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className="p-6 pb-4 flex items-start gap-4">
          <div className={`p-2.5 rounded-xl ${config.iconBg} shrink-0`}>
            <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-[var(--color-charcoal)]">{title}</h3>
            <div className="text-sm text-[var(--color-slate)] mt-1.5 leading-relaxed">
              {message}
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1.5 text-[var(--color-slate)] hover:text-[var(--color-charcoal)] rounded-lg hover:bg-[var(--color-mist)] transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={isLoading}
            className="btn btn--secondary text-sm px-4 py-2 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`text-sm px-4 py-2 rounded-xl font-semibold transition-all shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${config.confirmBtn}`}
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
    </div>,
    document.body
  );
}
