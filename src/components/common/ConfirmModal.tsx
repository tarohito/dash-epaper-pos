import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import {
  ModalShell,
  MODAL_FOOTER_END_CLASS,
  MODAL_BTN_SECONDARY_CLASS,
} from './ModalShell';
import { CustomCheckbox } from './CustomCheckbox';

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
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      title={title}
      subtitle={variant === 'void' ? 'Konfirmasi pembatalan transaksi' : 'Konfirmasi penghapusan data'}
      disableEscapeClose={isLoading}
      footer={
        <div className={MODAL_FOOTER_END_CLASS}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className={MODAL_BTN_SECONDARY_CLASS}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void handleConfirmClick()}
            disabled={isLoading}
            className={`h-9 px-4 text-xs sm:text-sm font-semibold text-white rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center whitespace-nowrap shadow-xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
              variant === 'void'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isLoading ? loadingLabel : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
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
            <CustomCheckbox
              checked={checked}
              onChange={setChecked}
              className="mt-0.5"
            />
            <span className="text-xs font-semibold text-gray-800 select-none">{checkboxLabel}</span>
          </label>
        )}
      </div>
    </ModalShell>
  );
};
