import React from 'react';
import { Printer } from 'lucide-react';
import { BuybackItem } from '../../types';
import { GoldInvoiceDocument } from '../common/GoldInvoiceDocument';
import {
  ModalShell,
  MODAL_FOOTER_END_CLASS,
  MODAL_BTN_PRIMARY_CLASS,
} from '../common/ModalShell';

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
    <ModalShell
      isOpen={isOpen && Boolean(receipt)}
      onClose={onClose}
      size="2xl"
      title="Nota Pembelian Emas (Buyback)"
      subtitle={`${receipt.invoiceNo} • ${receipt.customerName}`}
      bodyClassName="p-3 sm:p-5 overflow-y-auto overflow-x-auto bg-gray-100/90 flex-1 flex justify-center"
      footer={
        <div className={MODAL_FOOTER_END_CLASS}>
          <button
            type="button"
            onClick={onPrint}
            className={MODAL_BTN_PRIMARY_CLASS}
          >
            <Printer size={15} className="shrink-0" />
            <span>Cetak Nota Buyback</span>
          </button>
        </div>
      }
    >
      <div className="min-w-0 w-full overflow-x-auto flex justify-center">
        <GoldInvoiceDocument receipt={receipt} type="buyback" />
      </div>
    </ModalShell>
  );
};
