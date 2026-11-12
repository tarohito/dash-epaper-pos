import React from 'react';
import { Transaction } from '../../types';
import { GoldInvoiceDocument } from '../common/GoldInvoiceDocument';

interface PrintableReceiptProps {
  receipt: Transaction | null;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ receipt }) => {
  if (!receipt) return null;

  return (
    <div id="printable-receipt" className="print-only">
      <GoldInvoiceDocument receipt={receipt} type="sale" />
    </div>
  );
};
