import React from 'react';
import { BuybackItem, Tenant, StoreSettings } from '../../types';
import { GoldInvoiceDocument } from '../common/GoldInvoiceDocument';

interface PrintableBuybackReceiptProps {
  receipt: BuybackItem | null;
  activeTenant?: Tenant;
  storeSettings?: StoreSettings;
}

export const PrintableBuybackReceipt: React.FC<PrintableBuybackReceiptProps> = ({
  receipt,
  activeTenant,
  storeSettings,
}) => {
  if (!receipt) return null;

  return (
    <div id="printable-buyback-receipt" className="print-only">
      <GoldInvoiceDocument
        receipt={receipt}
        type="buyback"
        activeTenant={activeTenant}
        storeSettings={storeSettings}
      />
    </div>
  );
};
