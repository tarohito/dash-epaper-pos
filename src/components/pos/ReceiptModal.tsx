import React from 'react';
import { CheckCircle2, X, Printer } from 'lucide-react';
import { Transaction } from '../../types';
import { GoldInvoiceDocument } from '../common/GoldInvoiceDocument';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Transaction | null;
  onPrint: () => void;
  onViewDailyTransactions: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  onPrint,
  onViewDailyTransactions,
}) => {
  if (!isOpen || !receipt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500 text-white rounded-md">
              <CheckCircle2 size={18} />
            </span>
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm">Nota Resmi Perhiasan & Logam Mulia</h3>
              <p className="text-[11px] text-gray-500">
                Surat bukti kepemilikan emas resmi dengan watermark pengaman
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Invoice Document Screen Preview */}
        <div className="p-2 sm:p-6 overflow-y-auto overflow-x-auto bg-gray-100/90 flex justify-center">
          <div className="min-w-0 w-full overflow-x-auto flex justify-center">
            <GoldInvoiceDocument receipt={receipt} type="sale" />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewDailyTransactions();
            }}
            className="px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer text-center min-h-[40px]"
          >
            Lihat Transaksi Harian
          </button>
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer text-center min-h-[40px]"
            >
              Transaksi Baru
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-extrabold text-xs rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Printer size={16} />
              Cetak Nota Emas (Print)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
