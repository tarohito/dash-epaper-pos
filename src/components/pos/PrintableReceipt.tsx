import React from 'react';
import { Transaction, Tenant, StoreSettings } from '../../types';
import { GoldInvoiceDocument, ReceiptPaperSize } from '../common/GoldInvoiceDocument';

interface PrintableReceiptProps {
  receipt: Transaction | null;
  activeTenant?: Tenant;
  storeSettings?: StoreSettings;
  paperSize?: ReceiptPaperSize;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({
  receipt,
  activeTenant,
  storeSettings,
  paperSize = 'a5',
}) => {
  if (!receipt) return null;

  return (
    <div id="printable-receipt" className="print-only">
      <GoldInvoiceDocument
        receipt={receipt}
        type="sale"
        activeTenant={activeTenant}
        storeSettings={storeSettings}
        paperSize={paperSize}
      />
    </div>
  );
};
