import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`p-3.5 sm:p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-start gap-2.5 text-red-800">
        <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs sm:text-sm font-bold text-red-900">Gagal Memuat Data</p>
          <p className="text-xs text-red-700 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-8 px-3 bg-white hover:bg-red-100/70 text-red-700 border border-red-200 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <RefreshCw size={13} className="shrink-0" />
          <span>Muat Ulang</span>
        </button>
      )}
    </div>
  );
};
