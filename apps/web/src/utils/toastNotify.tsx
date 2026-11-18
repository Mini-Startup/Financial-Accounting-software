'use client';

import { toast } from 'sonner';
import { Alert, Button, CloseButton } from '@heroui/react';
import { cn } from '@/utils/cn';

export type AlertStatus = 'success' | 'danger' | 'warning' | 'accent' | 'default';

export interface ToastOptions {
  description?: string;
  errors?: string[]; // Multiple error points formatted as clean bullets
  duration?: number;
  status?: AlertStatus;
  actionLabel?: string;
  onAction?: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
  className?: string;
}

/**
 * HeroUI v3 Executive Alert Notification Toaster
 * Built with @heroui/react (Alert, Button, CloseButton)
 * Features ambient glow, semantic statuses, action triggers, and custom styles.
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
    actionLabel,
    onAction,
    cancelLabel,
    onCancel,
    className: customClassName,
  } = options || {};

  // Map application type to HeroUI Alert status
  const alertStatus: AlertStatus =
    explicitStatus ||
    (type === 'success'
      ? 'success'
      : type === 'error'
      ? 'danger'
      : type === 'warning'
      ? 'warning'
      : 'accent');

  // Semantic styles for status-specific gradients and ambient auras
  const statusConfig = {
    success: {
      alertClass:
        'border-emerald-500/30 bg-gradient-to-br from-emerald-500/12 via-white to-slate-50 shadow-xl shadow-emerald-950/5',
      auraClass: 'bg-emerald-500/25',
      indicatorClass: 'text-emerald-600',
    },
    danger: {
      alertClass:
        'border-rose-500/30 bg-gradient-to-br from-rose-500/12 via-white to-slate-50 shadow-xl shadow-rose-950/5',
      auraClass: 'bg-rose-500/25',
      indicatorClass: 'text-rose-600',
    },
    warning: {
      alertClass:
        'border-amber-500/30 bg-gradient-to-br from-amber-500/12 via-white to-slate-50 shadow-xl shadow-amber-950/5',
      auraClass: 'bg-amber-500/25',
      indicatorClass: 'text-amber-600',
    },
    accent: {
      alertClass:
        'border-[#2652C8]/30 bg-gradient-to-br from-[#2652C8]/12 via-white to-slate-50 shadow-xl shadow-[#2652C8]/5',
      auraClass: 'bg-[#2652C8]/25',
      indicatorClass: 'text-[#2652C8]',
    },
    default: {
      alertClass:
        'border-slate-300 bg-gradient-to-br from-slate-100 via-white to-slate-50 shadow-xl shadow-slate-900/5',
      auraClass: 'bg-slate-400/20',
      indicatorClass: 'text-slate-600',
    },
  }[alertStatus];

  return toast.custom((t) => {
    return (
      <div className="w-[460px] sm:w-[500px] md:w-[540px] max-w-[calc(100vw-32px)] select-none">
        <Alert
          status={alertStatus}
          className={cn(
            'relative overflow-hidden rounded-2xl border shadow-xl p-4 sm:p-5 w-full',
            statusConfig.alertClass,
            customClassName
          )}
        >
          {/* Ambient blurred aura matching HeroUI design reference */}
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute -top-10 -right-10 size-36 rounded-full blur-2xl',
              statusConfig.auraClass
            )}
          />

          <Alert.Indicator className={cn('relative shrink-0 mt-0.5', statusConfig.indicatorClass)} />

          <Alert.Content className="relative min-w-0 pr-2 flex-1">
            <Alert.Title className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
              {title}
            </Alert.Title>

            {description && (
              <Alert.Description className="text-xs text-slate-600 font-normal leading-relaxed mt-1">
                {description}
              </Alert.Description>
            )}

            {errors && errors.length > 0 && (
              <div className="mt-2.5 text-xs">
                <ul className="list-inside list-disc space-y-1.5 text-slate-700 font-medium">
                  {errors.map((err, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mobile Actions */}
            {(actionLabel || cancelLabel) && (
              <div className="mt-3 flex items-center gap-2 sm:hidden">
                {cancelLabel && (
                  <Button
                    size="sm"
                    variant="tertiary"
                    onPress={() => {
                      if (onCancel) onCancel();
                      toast.dismiss(t);
                    }}
                  >
                    {cancelLabel}
                  </Button>
                )}
                {actionLabel && (
                  <Button
                    size="sm"
                    variant={alertStatus === 'danger' ? 'danger' : 'primary'}
                    onPress={() => {
                      if (onAction) onAction();
                      toast.dismiss(t);
                    }}
                  >
                    {actionLabel}
                  </Button>
                )}
              </div>
            )}
          </Alert.Content>

          {/* Desktop Actions */}
          {(actionLabel || cancelLabel) && (
            <div className="relative hidden shrink-0 sm:flex items-center gap-2 mr-2 self-center">
              {cancelLabel && (
                <Button
                  size="sm"
                  variant="tertiary"
                  onPress={() => {
                    if (onCancel) onCancel();
                    toast.dismiss(t);
                  }}
                >
                  {cancelLabel}
                </Button>
              )}
              {actionLabel && (
                <Button
                  size="sm"
                  variant={alertStatus === 'danger' ? 'danger' : 'primary'}
                  onPress={() => {
                    if (onAction) onAction();
                    toast.dismiss(t);
                  }}
                >
                  {actionLabel}
                </Button>
              )}
            </div>
          )}

          <CloseButton
            className="relative cursor-pointer shrink-0 self-start text-slate-400 hover:text-slate-700 transition"
            onPress={() => toast.dismiss(t)}
          />
        </Alert>
      </div>
    );
  }, { duration, unstyled: true });
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
