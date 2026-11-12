export interface Product {
  id: number;
  sku: string;
  name: string;
  berat: number;
  harga: number;
  stok: number;
  category: string;
  image: string;
  isPromo?: boolean;
  promoDiscountPercent?: number;
  promoLabel?: string;
}

export interface PromoCampaign {
  id: string;
  name: string;
  code: string;
  discountPercent: number;
  label: string;
  startDate: string;
  endDate: string;
  productIds: number[];
  isActive: boolean;
  minPurchase?: number;
  description?: string;
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

export interface BuybackGoldItem {
  id: string;
  category: 'Logam Mulia Batangan' | 'Perhiasan';
  brandType: string;
  kadar: string;
  berat: number;
  serialNumber?: string;
  certYear?: string;
  kondisi: 'Baik / Utuh' | 'Kemasan Rusak' | 'Tanpa Sertifikat / Nota' | 'Patah / Cacat';
  hargaPerGram: number;
  subtotal: number;
}

export interface BuybackItem {
  id: string;
  invoiceNo: string;
  date: string;
  timeStr?: string;
  branchName?: string;
  cashierName?: string;
  customerName: string;
  customerPhone: string;
  customerNik?: string;
  customerNpwp?: string;
  customerAddress?: string;
  sourceNote: string;
  itemType: string;
  kadar: string;
  beratKotor: number;
  potonganBatu: number;
  beratBersih: number;
  hargaPerGram: number;
  biayaLebur: number;
  kondisi: string;
  totalKotor?: number;
  potonganBiaya?: number;
  pph22?: number;
  totalBayar: number;
  paymentMethod: 'cash' | 'transfer';
  bankName?: string;
  accountNo?: string;
  accountHolder?: string;
  catatan?: string;
  fotoKtp?: string;
  fotoEmas?: string;
  ttdNasabah?: string;
  ttdPetugas?: string;
  isAgreedLegal?: boolean;
  items?: BuybackGoldItem[];
}

export interface Tenant {
  id: string;
  name: string;
  code: string;
  branchName: string;
  address: string;
  city: string;
  plan: 'Basic Single-Store' | 'Pro Multi-Outlet' | 'Enterprise Multi-Tenant';
  cashierCount: number;
  productCount: number;
  phone: string;
  email: string;
  slug: string;
  logoInitial: string;
  databaseSchema: string;
  status: 'Aktif' | 'Trial' | 'Nonaktif';
}

export interface Customer {
  id: string;
  memberCode: string;
  name: string;
  phone: string;
  nik?: string;
  type: 'Reguler' | 'VIP' | 'Mitra / Toko';
  address?: string;
  preferredKadar?: string;
  ringSize?: string;
  notes?: string;
  createdAt: string;
  totalSpent?: number;
  totalTransactions?: number;
}

