import React from 'react';
import { Scale, X, Printer } from 'lucide-react';
import { BuybackItem } from '../../types';
import { GoldInvoiceDocument } from '../common/GoldInvoiceDocument';

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
      <div className="bg-white rounded-3xl border border-gray-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center">
              <Scale size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm">Nota Resmi Pembelian Emas (Buyback)</h3>
              <p className="text-[10px] text-gray-500 font-mono">
                Faktur Buyback Resmi &bull; {receipt.invoiceNo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Invoice Body Screen Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-gray-100/90 flex justify-center">
          <GoldInvoiceDocument receipt={receipt} type="buyback" />
        </div>

        {/* Footer Modal */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer size={15} />
            Cetak Nota Buyback
          </button>
        </div>
      </div>
    </div>
  );
};
