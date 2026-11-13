import React from 'react';
import { Printer, ReceiptText, Plus } from 'lucide-react';
import { Transaction } from '../../types';
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
    <ModalShell
      isOpen={isOpen && Boolean(receipt)}
      onClose={onClose}
      size="2xl"
      title="Nota Penjualan Emas"
      subtitle={`${receipt.invoiceNo} • ${receipt.customerName || 'Pelanggan Umum'}`}
      bodyClassName="p-3 sm:p-5 overflow-y-auto overflow-x-auto bg-gray-100/90 flex-1 flex justify-center"
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
            <ReceiptText size={15} className="text-gray-500 shrink-0" />
            <span>Lihat Transaksi Harian</span>
          </button>
          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={MODAL_BTN_SECONDARY_CLASS}
            >
              <Plus size={15} className="text-gray-500 shrink-0" />
              <span>Transaksi Baru</span>
            </button>
            <button
              type="button"
              onClick={onPrint}
              className={MODAL_BTN_PRIMARY_CLASS}
            >
              <Printer size={15} className="shrink-0" />
              <span>Cetak Nota Emas</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="min-w-0 w-full overflow-x-auto flex justify-center">
        <GoldInvoiceDocument receipt={receipt} type="sale" />
      </div>
    </ModalShell>
  );
};
