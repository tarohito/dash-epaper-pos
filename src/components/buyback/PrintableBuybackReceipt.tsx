import React from 'react';
import { BuybackItem, Tenant, StoreSettings } from '../../types';
import { GoldInvoiceDocument, ReceiptPaperSize } from '../common/GoldInvoiceDocument';

interface PrintableBuybackReceiptProps {
  receipt: BuybackItem | null;
  activeTenant?: Tenant;
  storeSettings?: StoreSettings;
  paperSize?: ReceiptPaperSize;
}

export const PrintableBuybackReceipt: React.FC<PrintableBuybackReceiptProps> = ({
  receipt,
  activeTenant,
  storeSettings,
  paperSize = 'a5',
}) => {
  if (!receipt) return null;

  return (
    <div id="printable-buyback-receipt" className="print-only">
      <GoldInvoiceDocument
        receipt={receipt}
        type="buyback"
        activeTenant={activeTenant}
        storeSettings={storeSettings}
        paperSize={paperSize}
      />
    </div>
  );
};
