import React, { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, Trash2, X, AlertCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loadingLabel?: string;
  cancelLabel?: string;
  checkboxLabel?: string;
  defaultChecked?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputRequired?: boolean;
  variant?: 'danger' | 'void';
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: (checked: boolean, reason: string) => void | Promise<void>;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Hapus Data',
  loadingLabel = 'Memproses...',
  cancelLabel = 'Batal',
  checkboxLabel,
  defaultChecked = true,
  inputLabel,
  inputPlaceholder = 'Masukkan alasan...',
  inputRequired = false,
  variant = 'danger',
  isLoading = false,
  onCancel,
  onConfirm,
}) => {
  const [checked, setChecked] = useState(defaultChecked);
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setChecked(defaultChecked);
      setReason('');
      setLocalError(null);
    }
  }, [isOpen, defaultChecked]);

  if (!isOpen) return null;

  const handleConfirmClick = async () => {
    setLocalError(null);
    if (inputRequired && !reason.trim()) {
      const msg = `${inputLabel || 'Alasan'} wajib diisi terlebih dahulu.`;
      setLocalError(msg);
      showToast('error', msg, 'Validasi Konfirmasi');
      return;
    }
    try {
      await onConfirm(checked, reason.trim());
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Gagal memproses tindakan.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                variant === 'void' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
              }`}
            >
              <AlertTriangle size={18} />
            </span>
            <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {localError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{localError}</span>
            </div>
          )}

          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{description}</p>

          {inputLabel && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {inputLabel} {inputRequired && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => {
                  setReason(e.target.value);
                  if (localError) setLocalError(null);
                }}
                placeholder={inputPlaceholder}
                className="w-full h-9 px-3 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
          )}

          {checkboxLabel && (
            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/70 border border-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer shrink-0"
              />
              <span className="text-xs font-semibold text-gray-800 select-none">{checkboxLabel}</span>
            </label>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="h-9 px-4 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmClick()}
              disabled={isLoading}
              className={`h-9 px-4 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs ${
                variant === 'void'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {variant === 'void' ? <RotateCcw size={14} /> : <Trash2 size={14} />}
              <span>{isLoading ? loadingLabel : confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
