import React from 'react';
import { Printer } from 'lucide-react';
import { Transaction, Tenant, StoreSettings } from '../../types';
import { GoldInvoiceDocument } from '../common/GoldInvoiceDocument';
import {
  ModalShell,
  MODAL_BTN_SECONDARY_CLASS,
  MODAL_BTN_PRIMARY_CLASS,
} from '../common/ModalShell';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Transaction | null;
  activeTenant?: Tenant;
  storeSettings?: StoreSettings;
  paperSize: 'a5' | 'a6';
  onPaperSizeChange: (size: 'a5' | 'a6') => void;
  onPrint: () => void;
  onViewDailyTransactions: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  activeTenant,
  storeSettings,
  paperSize,
  onPaperSizeChange,
  onPrint,
  onViewDailyTransactions,
}) => {
  if (!isOpen || !receipt) return null;

  return (
    <ModalShell
      isOpen={isOpen && Boolean(receipt)}
      onClose={onClose}
      size="2xl"
      title="Nota Penjualan Emas"
      subtitle={`${receipt.invoiceNo} • ${receipt.customerName || 'Pelanggan Umum'}`}
      headerActions={
        <div className="inline-flex p-0.5 bg-gray-200/80 rounded-lg border border-gray-300/70">
          {(['a5', 'a6'] as const).map(size => (
            <button
              key={size}
              type="button"
              onClick={() => onPaperSizeChange(size)}
              className={`px-2.5 py-1 text-xs font-bold uppercase rounded-md transition-colors cursor-pointer ${
                paperSize === size
                  ? 'bg-white text-orange-600 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kertas {size.toUpperCase()}
            </button>
          ))}
        </div>
      }
      bodyClassName="p-3 sm:p-5 overflow-y-auto bg-gray-100/90 flex-1"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewDailyTransactions();
            }}
            className={MODAL_BTN_SECONDARY_CLASS}
          >
            Lihat Transaksi Harian
          </button>
          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={MODAL_BTN_SECONDARY_CLASS}
            >
              Transaksi Baru
            </button>
            <button
              type="button"
              onClick={onPrint}
              className={`${MODAL_BTN_PRIMARY_CLASS} gap-1.5`}
            >
              <Printer size={15} className="shrink-0" />
              <span>Cetak Nota ({paperSize.toUpperCase()})</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="w-full mx-auto flex justify-center">
        <GoldInvoiceDocument
          receipt={receipt}
          type="sale"
          activeTenant={activeTenant}
          storeSettings={storeSettings}
          paperSize={paperSize}
        />
      </div>
    </ModalShell>
  );
};
