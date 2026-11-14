import React from 'react';
import { Printer } from 'lucide-react';
import { BuybackItem, Tenant, StoreSettings } from '../../types';
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
  activeTenant?: Tenant;
  storeSettings?: StoreSettings;
  paperSize: 'a5' | 'a6';
  onPaperSizeChange: (size: 'a5' | 'a6') => void;
  onPrint: () => void;
}

export const BuybackReceiptModal: React.FC<BuybackReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  activeTenant,
  storeSettings,
  paperSize,
  onPaperSizeChange,
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
      headerActions={
        <div className="inline-flex p-0.5 bg-gray-200/80 rounded-lg border border-gray-300/70">
          {(['a5', 'a6'] as const).map(size => (
            <button
              key={size}
              type="button"
              onClick={() => onPaperSizeChange(size)}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-md transition-colors cursor-pointer ${
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
        <div className={MODAL_FOOTER_END_CLASS}>
          <button
            type="button"
            onClick={onPrint}
            className={`${MODAL_BTN_PRIMARY_CLASS} gap-1.5`}
          >
            <Printer size={15} className="shrink-0" />
            <span>Cetak Nota ({paperSize.toUpperCase()})</span>
          </button>
        </div>
      }
    >
      <div className="w-full mx-auto flex justify-center">
        <GoldInvoiceDocument
          receipt={receipt}
          type="buyback"
          activeTenant={activeTenant}
          storeSettings={storeSettings}
          paperSize={paperSize}
        />
      </div>
    </ModalShell>
  );
};
