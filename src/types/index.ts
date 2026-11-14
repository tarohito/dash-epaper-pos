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
  salesCount?: number;
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
  category?: string;
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
  customerId?: string;
  customerMemberCode?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: TransactionItem[];
  totalQty: number;
  totalBerat: number;
  subtotal: number;
  tax: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'debit' | 'transfer' | 'qris';
  paymentDetails: PaymentDetails;
  status?: 'completed' | 'void';
  voidReason?: string;
  voidedAt?: string;
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
  customerId?: string;
  customerMemberCode?: string;
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
  status?: 'completed' | 'void';
  voidReason?: string;
  voidedAt?: string;
}

export type BuybackCreatePayload = Omit<BuybackItem, 'id' | 'invoiceNo' | 'date'> & {
  saveToCustomerMaster?: boolean;
};

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
  npwp?: string;
  type: 'Reguler' | 'VIP' | 'Mitra / Toko';
  address?: string;
  preferredKadar?: string;
  goldColor?: string;
  ringSize?: string;
  braceletSize?: string;
  birthDate?: string;
  notes?: string;
  createdAt: string;
  totalSpent?: number;
  totalTransactions?: number;
}

export interface CustomerWithStats extends Customer {
  computedSpent: number;
  computedTx: number;
  buybackCount: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductsPageResponse extends PaginatedResponse<Product> {
  promoCount: number;
  categoryCounts: Record<string, number>;
  totalAllProducts: number;
  totalStockQty?: number;
  totalWeightGrams?: number;
  totalInventoryValue?: number;
}

export interface TransactionStatsSummary {
  totalOmzetPenjualan: number;
  totalBeratTerjual: number;
  totalTransaksi: number;
  avgPerTransaksi: number;
}

export interface TransactionsPageResponse extends PaginatedResponse<Transaction> {
  stats: TransactionStatsSummary;
}

export interface BuybackStatsSummary {
  totalDanaDicairkan: number;
  totalBeratDiterima: number;
  totalTransaksi: number;
  avgPerTransaksi: number;
}

export interface BuybacksPageResponse extends PaginatedResponse<BuybackItem> {
  stats: BuybackStatsSummary;
}

export interface CustomerStatsSummary {
  totalPelanggan: number;
  totalVip: number;
  totalAkumulasiBelanja: number;
}

export interface CustomersPageResponse extends PaginatedResponse<CustomerWithStats> {
  stats: CustomerStatsSummary;
}

export interface PromoStatsSummary {
  totalPromos: number;
  activeCount: number;
  totalPromoProducts: number;
  avgDiscount: number;
}

export interface PromosPageResponse extends PaginatedResponse<PromoCampaign> {
  stats: PromoStatsSummary;
}

export interface CategoryStatsItem {
  count: number;
  totalStok: number;
  totalGram: number;
}

export interface CategoriesWithStatsResponse {
  categories: string[];
  stats: Record<string, CategoryStatsItem>;
}

export interface DashboardSummaryResponse {
  period: 'HARI' | 'BULAN';
  displayTotalPenjualan: number;
  displayPenjualanKotor: number;
  displayLabaKotor: number;
  displayPenerimaan: number;
  displayTransaksi: number;
  displayProduk: number;
  activeLabels: string[];
  salesData: number[];
  trxData: number[];
}

export type UserRole = 'owner' | 'branch_manager' | 'cashier';

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  shiftLabel: string;
  allowedTenantIds: string[];
  defaultTenantId?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserCreatePayload {
  username: string;
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
  shiftLabel: string;
  allowedTenantIds: string[];
  defaultTenantId?: string;
  isActive: boolean;
}

export interface UserUpdatePayload {
  email?: string;
  fullName?: string;
  password?: string;
  role?: UserRole;
  shiftLabel?: string;
  allowedTenantIds?: string[];
  defaultTenantId?: string;
  isActive?: boolean;
}

export interface UsersPageResponse extends PaginatedResponse<UserAccount> {
  stats: {
    totalUsers: number;
    activeUsers: number;
    managerCount: number;
    cashierCount: number;
  };
}

export interface AuthLoginResponse {
  token: string;
  user: UserAccount;
  tenants: Tenant[];
  activeTenantId: string;
}

export type ReceiptPaperSize = 'a5' | 'a6' | '80mm';
export type ReceiptTheme =
  | 'classic_gold'
  | 'royal_emerald'
  | 'midnight_navy'
  | 'rose_gold'
  | 'monochrome';
export type ReceiptLogoPreset = 'crown' | 'diamond' | 'monogram' | 'custom' | 'none';

export interface StoreSettings {
  tenantId: string;
  ppnPercent: number;
  enablePpn: boolean;
  goldPrice24kBuyback: number;
  goldPrice22kBuyback: number;
  goldPrice18kBuyback: number;
  goldPrice16kBuyback: number;
  receiptTagline: string;
  receiptFooterNote: string;
  receiptSaleTitle: string;
  receiptBuybackTitle: string;
  receiptHeaderExtra: string;
  receiptTheme: ReceiptTheme;
  receiptDefaultPaperSize: ReceiptPaperSize;
  receiptLogoPreset: ReceiptLogoPreset;
  receiptCustomLogoUrl: string;
  receiptShowWatermark: boolean;
  receiptWatermarkOpacity: number;
  receiptShowStoreAddress: boolean;
  receiptShowBarcode: boolean;
  receiptShowQrCode: boolean;
  receiptShowPhoto: boolean;
  receiptShowItemSku: boolean;
  receiptShowTaxLine: boolean;
  receiptShowCashierName: boolean;
  receiptShowTerms: boolean;
  receiptTermsTitle: string;
  receiptTermsText: string;
  receiptShowSignatures: boolean;
  receiptSignatureGreeting: string;
  receiptCustomerSignLabel: string;
  receiptCashierSignLabel: string;
  autoPrintReceipt: boolean;
  requireCustomerOnSale: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface StoreSettingsUpdatePayload {
  tenantProfile?: {
    name?: string;
    branchName?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    status?: 'Aktif' | 'Trial' | 'Nonaktif';
  };
  settings: Partial<Omit<StoreSettings, 'tenantId' | 'updatedAt' | 'updatedBy'>>;
}

export interface ShiftLiveSummary {
  date: string;
  scope: 'my' | 'outlet';
  cashierName?: string;
  totalSalesCount: number;
  totalSalesAmount: number;
  totalSalesGrams: number;
  salesCash: number;
  salesDebit: number;
  salesTransfer: number;
  salesQris: number;
  totalBuybackCount: number;
  totalBuybackAmount: number;
  totalBuybackGrams: number;
  buybackCash: number;
  buybackTransfer: number;
  voidSalesCount: number;
  voidBuybackCount: number;
  netCashMovement: number;
  alreadyClosedCount: number;
}

export interface ShiftClosingRecord {
  id: string;
  tenantId: string;
  shiftCode: string;
  shiftDate: string;
  shiftLabel: string;
  cashierId: string;
  cashierName: string;
  openingCash: number;
  totalSalesCount: number;
  totalSalesAmount: number;
  totalSalesGrams: number;
  salesCash: number;
  salesDebit: number;
  salesTransfer: number;
  salesQris: number;
  totalBuybackCount: number;
  totalBuybackAmount: number;
  totalBuybackGrams: number;
  buybackCash: number;
  buybackTransfer: number;
  voidSalesCount: number;
  voidBuybackCount: number;
  expectedCash: number;
  actualCash: number;
  cashVariance: number;
  notes?: string;
  status: 'closed';
  closedAt: string;
}

export interface ShiftClosingCreatePayload {
  shiftDate: string;
  shiftLabel?: string;
  scope?: 'my' | 'outlet';
  openingCash: number;
  actualCash: number;
  notes?: string;
}

export interface ShiftClosingsPageResponse extends PaginatedResponse<ShiftClosingRecord> {
  stats: {
    totalClosings: number;
    exactMatchCount: number;
    totalRecordedSales: number;
    totalVariance: number;
  };
}

export interface BootstrapPayload {
  user: UserAccount;
  categories: string[];
  tenants: Tenant[];
  activeTenantId: string;
  activePromos: PromoCampaign[];
  storeSettings: StoreSettings;
}

export type BroadcastAudienceMode = 'all' | 'segment' | 'selected';
export type BroadcastDeliveryMode = 'wa_me' | 'gateway';
export type BroadcastRecipientStatus = 'pending' | 'sent' | 'failed';

export interface BroadcastCustomerAudienceItem {
  id: string;
  memberCode: string;
  name: string;
  phone: string;
  waPhone: string;
  type: 'Reguler' | 'VIP' | 'Mitra / Toko';
  preferredKadar?: string;
  totalTxCount: number;
  hasTransacted: boolean;
}

export interface PromoBroadcastRecipient {
  id: string;
  broadcastId: string;
  customerId: string;
  customerName: string;
  memberCode: string;
  customerType: string;
  phone: string;
  waPhone: string;
  personalizedMessage: string;
  status: BroadcastRecipientStatus;
  errorMessage?: string;
  sentAt?: string;
}

export interface PromoBroadcastRecord {
  id: string;
  tenantId: string;
  promoId: string;
  promoName: string;
  promoCode: string;
  discountPercent: number;
  audienceMode: BroadcastAudienceMode;
  audienceSegment?: string;
  deliveryMode: BroadcastDeliveryMode;
  messageTemplate: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdBy: string;
  createdAt: string;
  isJobRunning?: boolean;
  recipients?: PromoBroadcastRecipient[];
}

export interface PromoBroadcastCreatePayload {
  promoId: string;
  audienceMode: BroadcastAudienceMode;
  audienceSegment?: 'VIP' | 'Reguler' | 'Mitra / Toko';
  customerIds?: string[];
  activeBuyersOnly?: boolean;
  deliveryMode: BroadcastDeliveryMode;
  messageTemplate: string;
  delayMinSec?: number;
  delayMaxSec?: number;
}

export interface PromoBroadcastConfig {
  gatewayConfigured: boolean;
  providerLabel: string;
  dailySafeLimit: number;
  dailySentCount: number;
  maxBatchSize: number;
  defaultDelayMinSec: number;
  defaultDelayMaxSec: number;
}


