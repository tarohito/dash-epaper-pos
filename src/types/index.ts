export interface Product {
  id: number;
  sku: string;
  name: string;
  berat: number;
  harga: number;
  stok: number;
  category: string;
  image: string;
}

export interface CartItem extends Product {
  qty: number;
}

export interface TransactionItem {
  id: number;
  sku: string;
  name: string;
  berat: number;
  harga: number;
  qty: number;
  subtotal: number;
  image?: string;
}

export interface PaymentDetails {
  cashReceived?: number;
  cashChange?: number;
  debitBank?: string;
  debitCardLast4?: string;
  debitApprovalCode?: string;
  transferBank?: string;
  transferAccountNo?: string;
  transferRef?: string;
  qrisNmid?: string;
  qrisRrn?: string;
}

export interface Transaction {
  id: string;
  invoiceNo: string;
  dateTime: string;
  dateStr: string;
  timeStr: string;
  cashier: string;
  customerName: string;
  items: TransactionItem[];
  totalQty: number;
  totalBerat: number;
  subtotal: number;
  tax: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'debit' | 'transfer' | 'qris';
  paymentDetails: PaymentDetails;
}

export interface BuybackItem {
  id: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  customerPhone: string;
  sourceNote: string;
  itemType: string;
  kadar: string;
  beratKotor: number;
  potonganBatu: number;
  beratBersih: number;
  hargaPerGram: number;
  biayaLebur: number;
  kondisi: string;
  totalBayar: number;
  paymentMethod: 'cash' | 'transfer';
  bankName?: string;
  accountNo?: string;
  catatan?: string;
}
