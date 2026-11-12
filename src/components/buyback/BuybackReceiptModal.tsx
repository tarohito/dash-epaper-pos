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
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h3 className="font-extrabold text-gray-900 text-sm">
              Nota Pembelian Emas (Buyback)
            </h3>
            <p className="text-[11px] text-gray-500 font-mono mt-0.5">
              {receipt.invoiceNo} &bull; {receipt.customerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer"
          >
            <X size={18} />
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
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-md transition-colors cursor-pointer text-center min-h-[40px]"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[40px] shadow-none"
          >
            <Printer size={15} />
            Cetak Nota Buyback
          </button>
        </div>
      </div>
    </div>
  );
};
