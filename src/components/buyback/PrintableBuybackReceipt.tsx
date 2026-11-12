import React from'react';
import { BuybackItem } from'../../types';
import { GoldInvoiceDocument } from'../common/GoldInvoiceDocument';

interface PrintableBuybackReceiptProps {
  receipt: BuybackItem | null;
}

export const PrintableBuybackReceipt: React.FC<PrintableBuybackReceiptProps> = ({ receipt }) => {
  if (!receipt) return null;

  return (
    <div id="printable-buyback-receipt" className="print-only">
      <GoldInvoiceDocument receipt={receipt} type="buyback" />
    </div>
  );
};
