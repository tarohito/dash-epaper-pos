import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, title?: string, durationMs?: number) => void;
  notifySuccess: (message: string, title?: string) => void;
  notifyError: (message: string, title?: string) => void;
  notifyWarning: (message: string, title?: string) => void;
  notifyInfo: (message: string, title?: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_TITLES: Record<ToastType, string> = {
  success: 'Berhasil',
  error: 'Terjadi Kesalahan',
  warning: 'Perhatian',
  info: 'Informasi',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, durationMs?: number) => {
      const cleanMessage = message.trim();
      if (!cleanMessage) return;

      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const timeout = durationMs ?? (type === 'error' || type === 'warning' ? 4800 : 3500);

      setToasts(prev => {
        // Deduplicate consecutive identical active messages so rapid clicks don't spam
        const filtered = prev.filter(t => !(t.type === type && t.message === cleanMessage));
        return [...filtered.slice(-3), { id, type, title, message: cleanMessage }];
      });

      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setToasts(prev => prev.filter(t => t.id !== id));
      }, timeout);
      timersRef.current.set(id, timer);
    },
    []
  );

  const notifySuccess = useCallback(
    (message: string, title?: string) => showToast('success', message, title),
    [showToast]
  );
  const notifyError = useCallback(
    (message: string, title?: string) => showToast('error', message, title),
    [showToast]
  );
  const notifyWarning = useCallback(
    (message: string, title?: string) => showToast('warning', message, title),
    [showToast]
  );
  const notifyInfo = useCallback(
    (message: string, title?: string) => showToast('info', message, title),
    [showToast]
  );

  // Global uncaught error & unhandled promise rejection handler
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason && typeof reason === 'object' && 'name' in reason && (reason as Error).name === 'AbortError') {
        return;
      }
      const msg =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
          ? reason
          : 'Terjadi kesalahan jaringan atau server yang tidak terduga.';
      showToast('error', msg, 'Kegagalan Proses');
    };

    const handleWindowError = (event: ErrorEvent) => {
      if (event.message?.includes('ResizeObserver')) return;
      if (event.message) {
        showToast('error', event.message, 'Kesalahan Aplikasi');
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{ showToast, notifySuccess, notifyError, notifyWarning, notifyInfo, dismissToast }}
    >
      {children}

      {/* Stacked Toast Container */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-atomic="true"
          className="fixed top-4 right-4 z-[90] flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
        >
          {toasts.map(toast => {
            const styles =
              toast.type === 'success'
                ? {
                    wrap: 'bg-white border-emerald-200 text-gray-900 shadow-lg shadow-emerald-950/5',
                    iconWrap: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                    titleColor: 'text-emerald-800',
                    Icon: CheckCircle2,
                  }
                : toast.type === 'error'
                ? {
                    wrap: 'bg-white border-red-200 text-gray-900 shadow-lg shadow-red-950/5',
                    iconWrap: 'bg-red-50 text-red-600 border-red-100',
                    titleColor: 'text-red-800',
                    Icon: AlertCircle,
                  }
                : toast.type === 'warning'
                ? {
                    wrap: 'bg-white border-amber-200 text-gray-900 shadow-lg shadow-amber-950/5',
                    iconWrap: 'bg-amber-50 text-amber-600 border-amber-100',
                    titleColor: 'text-amber-800',
                    Icon: AlertTriangle,
                  }
                : {
                    wrap: 'bg-white border-blue-200 text-gray-900 shadow-lg shadow-blue-950/5',
                    iconWrap: 'bg-blue-50 text-blue-600 border-blue-100',
                    titleColor: 'text-blue-800',
                    Icon: Info,
                  };

            const IconComponent = styles.Icon;

            return (
              <div
                key={toast.id}
                role="alert"
                className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-200 ${styles.wrap}`}
              >
                <span
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${styles.iconWrap}`}
                >
                  <IconComponent size={17} />
                </span>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className={`text-xs font-bold leading-tight ${styles.titleColor}`}>
                    {toast.title || DEFAULT_TITLES[toast.type]}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-snug break-words">
                    {toast.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                  aria-label="Tutup notifikasi"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
