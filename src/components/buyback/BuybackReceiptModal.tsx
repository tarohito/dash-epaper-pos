import React from'react';
import { X, Printer } from 'lucide-react';
import { BuybackItem } from'../../types';
import { GoldInvoiceDocument } from'../common/GoldInvoiceDocument';

interface BuybackReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: BuybackItem | null;
  onPrint: () => void;
}

export const BuybackReceiptModal: React.FC<BuybackReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  onPrint,
}) => {
  if (!isOpen || !receipt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight">
              Nota Pembelian Emas (Buyback)
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              {receipt.invoiceNo} &bull; {receipt.customerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* Invoice Body Screen Preview */}
        <div className="p-2 sm:p-6 overflow-y-auto overflow-x-auto bg-gray-100/90 flex justify-center">
          <div className="min-w-0 w-full overflow-x-auto flex justify-center">
            <GoldInvoiceDocument receipt={receipt} type="buyback" />
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-3.5 sm:p-4 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center shadow-xs text-center"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Printer size={16} />
            Cetak Nota Buyback
          </button>
        </div>
      </div>
    </div>
  );
};
