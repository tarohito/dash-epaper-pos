import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { ShoppingCart, Scale, ReceiptText, Gem, Menu, AlertCircle, Loader2 } from 'lucide-react';
import { TooltipProvider } from './components/Tooltip';
import { useToast } from './contexts/ToastContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { PosView } from './components/pos/PosView';
import { PrintableReceipt } from './components/pos/PrintableReceipt';
import { ScanFeedbackToast } from './components/pos/ScanFeedbackToast';
import { PrintableBuybackReceipt } from './components/buyback/PrintableBuybackReceipt';
import { PrintableShiftReport } from './components/reports/PrintableShiftReport';
import { FallbackView } from './components/common/FallbackView';
import { LoginPage } from './components/auth/LoginPage';

import {
  AuthLoginResponse,
  Product,
  CartItem,
  Transaction,
  BuybackItem,
  BuybackCreatePayload,
  PromoCampaign,
  Tenant,
  Customer,
  UserAccount,
  UserRole,
  StoreSettings,
  ReceiptPaperSize,
  ShiftClosingRecord,
} from './types';
import { playScannerBeep, playCashRegisterChime } from './utils/audio';
import { extractBarcodeValue } from './utils/barcode';
import {
  clearAuthToken,
  getAuthToken,
  posApi,
  setUnauthorizedHandler,
} from './services/api';

// Code splitting (Lazy load secondary views & modals so Kasir POS initial load is fast & lightweight)
const DashboardView = lazy(() =>
  import('./components/dashboard/DashboardView').then(m => ({ default: m.DashboardView }))
);
const DailyTransactionsView = lazy(() =>
  import('./components/transactions/DailyTransactionsView').then(m => ({ default: m.DailyTransactionsView }))
);
const PromoManagementView = lazy(() =>
  import('./components/promo/PromoManagementView').then(m => ({ default: m.PromoManagementView }))
);
const ProductListView = lazy(() =>
  import('./components/inventory/ProductListView').then(m => ({ default: m.ProductListView }))
);
const CategoryListView = lazy(() =>
  import('./components/inventory/CategoryListView').then(m => ({ default: m.CategoryListView }))
);
const BuybackView = lazy(() =>
  import('./components/buyback/BuybackView').then(m => ({ default: m.BuybackView }))
);
const CustomerView = lazy(() =>
  import('./components/customer/CustomerView').then(m => ({ default: m.CustomerView }))
);
const TenantManagementView = lazy(() =>
  import('./components/tenant/TenantManagementView').then(m => ({ default: m.TenantManagementView }))
);
const UserManagementView = lazy(() =>
  import('./components/users/UserManagementView').then(m => ({ default: m.UserManagementView }))
);
const StoreSettingsView = lazy(() =>
  import('./components/settings/StoreSettingsView').then(m => ({ default: m.StoreSettingsView }))
);
const ShiftClosingView = lazy(() =>
  import('./components/reports/ShiftClosingView').then(m => ({ default: m.ShiftClosingView }))
);

const DEFAULT_STORE_SETTINGS: StoreSettings = {
  tenantId: 'tenant-tms-001',
  ppnPercent: 11,
  enablePpn: true,
  goldPrice24kBuyback: 2350000,
  goldPrice22kBuyback: 1950000,
  goldPrice18kBuyback: 1420000,
  goldPrice16kBuyback: 1180000,
  receiptTagline: 'GOLD & JEWELLERY',
  receiptFooterNote:
    'Simpan surat resmi ini dengan baik. Pembelian & buyback mengikuti ketentuan harga pasar emas berjalan.',
  receiptSaleTitle: 'FAKTUR PENJUALAN EMAS',
  receiptBuybackTitle: 'SURAT PEMBELIAN KEMBALI (BUYBACK)',
  receiptHeaderExtra: '',
  receiptTheme: 'classic_gold',
  receiptDefaultPaperSize: 'a5',
  receiptLogoPreset: 'crown',
  receiptCustomLogoUrl: '',
  receiptShowWatermark: true,
  receiptWatermarkOpacity: 6,
  receiptShowStoreAddress: true,
  receiptShowBarcode: true,
  receiptShowQrCode: true,
  receiptShowPhoto: true,
  receiptShowItemSku: true,
  receiptShowTaxLine: true,
  receiptShowCashierName: true,
  receiptShowTerms: true,
  receiptTermsTitle: 'Perhatian :',
  receiptTermsText: [
    'Wajib membawa surat ini saat jual kembali atau tukar tambah barang.',
    'Barang dari {TOKO} diterima kembali sesuai ketentuan harga & potongan toko.',
    'Jika rusak/cacat atau mata hilang dikenakan potongan tambahan sesuai kondisi.',
    'Pesanan khusus (custom order), batu, dan ongkos lebur tidak dapat dikembalikan.',
  ].join('\n'),
  receiptShowSignatures: true,
  receiptSignatureGreeting: 'Hormat Kami,',
  receiptCustomerSignLabel: 'Customer',
  receiptCashierSignLabel: 'Kasir / Gold Advisor',
  autoPrintReceipt: false,
  requireCustomerOnSale: false,
  updatedAt: '',
};

const BarcodeScannerModal = lazy(() =>
  import('./components/pos/BarcodeScannerModal').then(m => ({ default: m.BarcodeScannerModal }))
);
const PaymentModal = lazy(() =>
  import('./components/pos/PaymentModal').then(m => ({ default: m.PaymentModal }))
);
const ReceiptModal = lazy(() =>
  import('./components/pos/ReceiptModal').then(m => ({ default: m.ReceiptModal }))
);
const BuybackReceiptModal = lazy(() =>
  import('./components/buyback/BuybackReceiptModal').then(m => ({ default: m.BuybackReceiptModal }))
);
const AddProductModal = lazy(() =>
  import('./components/inventory/AddProductModal').then(m => ({ default: m.AddProductModal }))
);
const AddCategoryModal = lazy(() =>
  import('./components/inventory/AddCategoryModal').then(m => ({ default: m.AddCategoryModal }))
);
const RegisterTenantModal = lazy(() =>
  import('./components/tenant/RegisterTenantModal').then(m => ({ default: m.RegisterTenantModal }))
);

const ViewLoadingFallback: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg border border-gray-200 p-8 text-gray-500 min-h-[280px]">
    <Loader2 size={24} className="animate-spin text-orange-500 mb-2" />
    <p className="text-xs font-medium text-gray-500">Memuat tampilan...</p>
  </div>
);

function isMenuAllowedForRole(menu: string, role: UserRole): boolean {
  if (menu === 'Manajemen User') return role === 'owner';
  if (
    menu === 'Dashboard' ||
    menu === 'Promo' ||
    menu === 'Daftar Kategori' ||
    menu === 'Multi-Outlet' ||
    menu === 'Multi-Tenant' ||
    menu === 'Multi-Tenant & Outlet' ||
    menu === 'Laporan & Analitik' ||
    menu === 'Pengaturan'
  ) {
    return role === 'owner' || role === 'branch_manager';
  }
  return true;
}

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Navigation & Layout State
  const [activeMenu, setActiveMenu] = useState('Kasir POS (Penjualan)');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProdukExpanded, setIsProdukExpanded] = useState(true);
  const [hasNotification, setHasNotification] = useState(true);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  // Lightweight bootstrap metadata state (full tables are paginated per-view)
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string>('tenant-tms-001');
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [printingShift, setPrintingShift] = useState<ShiftClosingRecord | null>(null);
  const [receiptPaperSize, setReceiptPaperSize] = useState<ReceiptPaperSize>('a5');

  useEffect(() => {
    if (storeSettings.receiptDefaultPaperSize) {
      setReceiptPaperSize(storeSettings.receiptDefaultPaperSize);
    }
  }, [storeSettings.receiptDefaultPaperSize, storeSettings.tenantId]);

  // View-level invalidation counters so only active/affected views refresh from SQLite
  const [productsRefreshKey, setProductsRefreshKey] = useState(0);
  const [categoriesRefreshKey, setCategoriesRefreshKey] = useState(0);
  const [transactionsRefreshKey, setTransactionsRefreshKey] = useState(0);
  const [buybacksRefreshKey, setBuybacksRefreshKey] = useState(0);
  const [customersRefreshKey, setCustomersRefreshKey] = useState(0);
  const [promosRefreshKey, setPromosRefreshKey] = useState(0);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  // Toast feedback state from global ToastContext
  const { showToast } = useToast();

  const resetAuthSession = useCallback(() => {
    clearAuthToken();
    setCurrentUser(null);
    setCart([]);
    setCustomerId(undefined);
    setCustomerName('Pelanggan Umum');
    setIsAdminMenuOpen(false);
    setIsPaymentModalOpen(false);
    setIsReceiptModalOpen(false);
    setIsBuybackReceiptModalOpen(false);
    setIsAddProductModalOpen(false);
    setIsAddCategoryModalOpen(false);
    setIsRegisterTenantOpen(false);
    setIsScanModalOpen(false);
    setIsCheckingAuth(false);
    setIsLoadingData(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(resetAuthSession);
    return () => setUnauthorizedHandler(null);
  }, [resetAuthSession]);

  // Load lightweight bootstrap metadata (authenticated user, categories, accessible tenants, active tenant)
  const fetchBootstrapData = useCallback(async () => {
    if (!getAuthToken()) {
      setCurrentUser(null);
      setIsCheckingAuth(false);
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    setLoadError(null);
    try {
      const data = await posApi.bootstrap();
      setCurrentUser(data.user);
      setCategories(data.categories);
      setTenants(data.tenants);
      setActiveTenantId(data.activeTenantId);
      if (data.storeSettings) {
        setStoreSettings(data.storeSettings);
      }
      setActiveMenu(prev =>
        isMenuAllowedForRole(prev, data.user.role) ? prev : 'Kasir POS (Penjualan)'
      );
    } catch (err) {
      if (!getAuthToken()) {
        setCurrentUser(null);
      } else {
        const msg = err instanceof Error ? err.message : 'Gagal memuat data dari database SQLite.';
        setLoadError(msg);
        showToast('error', msg);
      }
    } finally {
      setIsCheckingAuth(false);
      setIsLoadingData(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchBootstrapData();
  }, [fetchBootstrapData]);

  const handleLoginSuccess = useCallback(
    async (auth: AuthLoginResponse) => {
      setCurrentUser(auth.user);
      setTenants(auth.tenants);
      setActiveTenantId(auth.activeTenantId);
      setActiveMenu('Kasir POS (Penjualan)');
      setCart([]);
      setCustomerId(undefined);
      setCustomerName('Pelanggan Umum');
      await fetchBootstrapData();
    },
    [fetchBootstrapData]
  );

  const handleLogout = useCallback(async () => {
    await posApi.logout();
    resetAuthSession();
    showToast('success', 'Anda telah keluar dari sesi.');
  }, [resetAuthSession, showToast]);

  // Customer CRUD
  const handleSaveCustomer = async (savedCustomer: Customer, isEdit?: boolean) => {
    try {
      if (isEdit) {
        const updated = await posApi.updateCustomer(savedCustomer.id, savedCustomer);
        showToast('success', `Data pelanggan "${updated.name}" diperbarui.`);
      } else {
        const created = await posApi.createCustomer(savedCustomer);
        showToast('success', `Pelanggan "${created.name}" ditambahkan ke database.`);
      }
      setCustomersRefreshKey(k => k + 1);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan pelanggan.');
      throw err;
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      await posApi.deleteCustomer(id);
      setCustomersRefreshKey(k => k + 1);
      showToast('success', 'Data pelanggan berhasil dihapus.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menghapus pelanggan.');
      throw err;
    }
  };

  // Multi-Tenant CRUD
  const [isRegisterTenantOpen, setIsRegisterTenantOpen] = useState(false);
  const activeTenant = tenants.find(t => t.id === activeTenantId) || tenants[0];

  const refreshActiveOutletViews = useCallback(() => {
    setProductsRefreshKey(k => k + 1);
    setCategoriesRefreshKey(k => k + 1);
    setTransactionsRefreshKey(k => k + 1);
    setBuybacksRefreshKey(k => k + 1);
    setPromosRefreshKey(k => k + 1);
    setDashboardRefreshKey(k => k + 1);
  }, []);

  const refreshTenantsMetadata = useCallback(async () => {
    try {
      const latest = await posApi.getTenants();
      setTenants(latest);
    } catch {
      // Abaikan jika refresh metadata tenant gagal sementara
    }
  }, []);

  const handleSelectTenant = async (tenantId: string) => {
    if (tenantId === activeTenantId) return;
    const prevId = activeTenantId;
    setActiveTenantId(tenantId);
    try {
      await posApi.setActiveTenant(tenantId);
      setCart([]);
      setCustomerId(undefined);
      setCustomerName('Pelanggan Umum');
      refreshActiveOutletViews();
      void refreshTenantsMetadata();
      void posApi.getStoreSettings().then(res => setStoreSettings(res.storeSettings)).catch(() => {});
      const selected = tenants.find(t => t.id === tenantId);
      showToast('success', `Berhasil beralih ke outlet "${selected?.name || tenantId}".`);
    } catch (err) {
      setActiveTenantId(prevId);
      showToast('error', err instanceof Error ? err.message : 'Gagal memilih outlet aktif.');
    }
  };

  const handleRegisterTenant = async (newTenant: Tenant) => {
    try {
      const created = await posApi.registerTenant(newTenant);
      setTenants(prev => [created, ...prev]);
      setActiveTenantId(created.id);
      setCart([]);
      setCustomerId(undefined);
      setCustomerName('Pelanggan Umum');
      refreshActiveOutletViews();
      void posApi.getStoreSettings().then(res => setStoreSettings(res.storeSettings)).catch(() => {});
      setIsRegisterTenantOpen(false);
      showToast('success', `Outlet "${created.name}" berhasil didaftarkan & diaktifkan.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mendaftarkan outlet.');
      throw err;
    }
  };

  // Promo CRUD
  const handleSavePromo = async (savedPromo: PromoCampaign, isEdit?: boolean) => {
    try {
      if (isEdit) {
        const updated = await posApi.updatePromo(savedPromo.id, savedPromo);
        showToast('success', `Promo "${updated.name}" diperbarui.`);
      } else {
        const created = await posApi.createPromo(savedPromo);
        showToast('success', `Promo "${created.name}" ditambahkan.`);
      }
      setPromosRefreshKey(k => k + 1);
      setProductsRefreshKey(k => k + 1);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan promo.');
      throw err;
    }
  };

  const handleDeletePromo = async (id: string) => {
    try {
      await posApi.deletePromo(id);
      setPromosRefreshKey(k => k + 1);
      setProductsRefreshKey(k => k + 1);
      showToast('success', 'Promo berhasil dihapus.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menghapus promo.');
      throw err;
    }
  };

  const handleTogglePromoStatus = async (id: string) => {
    try {
      const updated = await posApi.togglePromoStatus(id);
      setPromosRefreshKey(k => k + 1);
      setProductsRefreshKey(k => k + 1);
      showToast(
        'success',
        updated.isActive
          ? `Promo "${updated.name}" diaktifkan.`
          : `Promo "${updated.name}" dinonaktifkan.`
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mengubah status promo.');
    }
  };

  // Cart & POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [scanFeedback, setScanFeedback] = useState<{ product: Product; time: string } | null>(null);

  // Payment & Receipts Modals State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState('Pelanggan Umum');
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Buyback Receipt Modal State
  const [selectedBuybackReceipt, setSelectedBuybackReceipt] = useState<BuybackItem | null>(null);
  const [isBuybackReceiptModalOpen, setIsBuybackReceiptModalOpen] = useState(false);

  // Inventory Modals State (Create & Edit)
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.harga * item.qty, 0), [cart]);
  const tax = useMemo(
    () => (storeSettings.enablePpn ? Math.round(subtotal * (storeSettings.ppnPercent / 100)) : 0),
    [subtotal, storeSettings.enablePpn, storeSettings.ppnPercent]
  );
  const taxLabel = useMemo(
    () => (storeSettings.enablePpn ? `PPN (${storeSettings.ppnPercent}%)` : 'PPN (0% / Non-PKP)'),
    [storeSettings.enablePpn, storeSettings.ppnPercent]
  );
  const grandTotal = useMemo(() => subtotal + tax, [subtotal, tax]);

  const triggerIsolatedPrint = useCallback(
    (modeClass: 'printing-sale' | 'printing-buyback' | 'printing-shift') => {
      document.body.classList.remove('printing-sale', 'printing-buyback', 'printing-shift', 'printing-barcode');
      document.body.classList.add(modeClass);
      const cleanup = () => {
        document.body.classList.remove(modeClass);
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      window.requestAnimationFrame(() => {
        setTimeout(() => {
          window.print();
          setTimeout(cleanup, 1200);
        }, 80);
      });
    },
    []
  );

  const handlePrintSaleReceipt = useCallback(() => {
    triggerIsolatedPrint('printing-sale');
  }, [triggerIsolatedPrint]);

  const handlePrintBuybackReceipt = useCallback(() => {
    triggerIsolatedPrint('printing-buyback');
  }, [triggerIsolatedPrint]);

  const handlePrintShift = useCallback(
    (shift: ShiftClosingRecord) => {
      setPrintingShift(shift);
      triggerIsolatedPrint('printing-shift');
    },
    [triggerIsolatedPrint]
  );

  // Cart Handlers
  const handleAddToCart = useCallback(
    (product: Product) => {
      if (product.stok <= 0) {
        showToast('error', `Stok produk ${product.name} habis.`);
        return;
      }

      setCart(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
          if (existing.qty >= product.stok) {
            showToast('error', `Jumlah melebihi stok yang tersedia (${product.stok} pcs).`);
            return prev;
          }
          return prev.map(item => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
        }
        return [...prev, { ...product, qty: 1 }];
      });
    },
    [showToast]
  );

  const handleUpdateQty = (id: number, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.id === id) {
            const maxStok = item.stok;
            const newQty = item.qty + delta;
            if (delta > 0 && newQty > maxStok) {
              showToast('error', `Jumlah maksimal sesuai stok adalah ${maxStok} pcs.`);
              return item;
            }
            return newQty > 0 ? { ...item, qty: newQty } : item;
          }
          return item;
        })
        .filter(item => item.qty > 0)
    );
  };

  const handleRemoveItem = (id: number) => {
    const removed = cart.find(c => c.id === id);
    setCart(prev => prev.filter(item => item.id !== id));
    if (removed) {
      showToast('success', `"${removed.name}" dihapus dari keranjang.`);
    }
  };

  const handleClearCart = () => {
    setCart([]);
    showToast('success', 'Keranjang pesanan berhasil dikosongkan.');
  };

  // Indexed SQLite Lookup for Barcode / SKU / QR / Name Scan
  const handleAutoScanCode = useCallback(
    async (code: string): Promise<Product | null> => {
      const clean = extractBarcodeValue(code);
      if (!clean) {
        showToast('warning', 'Masukkan kode barcode atau SKU produk terlebih dahulu.');
        return null;
      }

      try {
        const found = await posApi.lookupProductByCode(clean);
        if (found.stok <= 0) {
          showToast('error', `Stok produk "${found.name}" (${found.sku}) sedang habis.`);
          return null;
        }
        handleAddToCart(found);
        playScannerBeep(isSoundEnabled);
        setScanCount(prev => prev + 1);
        setScanFeedback({
          product: found,
          time: new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        });
        setTimeout(() => setScanFeedback(null), 3000);
        setSearchQuery('');
        return found;
      } catch (err) {
        showToast(
          'error',
          err instanceof Error ? err.message : `Kode barcode / SKU "${clean}" tidak ditemukan.`
        );
        return null;
      }
    },
    [handleAddToCart, isSoundEnabled, showToast]
  );

  // Global Hardware Barcode Scanner Listener
  useEffect(() => {
    if (!currentUser) return;
    let scanBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const now = Date.now();
      const interval = now - lastKeyTime;
      lastKeyTime = now;

      const targetTag = (e.target as HTMLElement | null)?.tagName;
      const isInputFocused =
        targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT';

      if (e.key === 'Enter') {
        if (scanBuffer.length >= 3) {
          e.preventDefault();
          void handleAutoScanCode(scanBuffer.trim());
        } else if (!isInputFocused && searchQuery.trim()) {
          void handleAutoScanCode(searchQuery.trim());
        }
        scanBuffer = '';
      } else if (e.key.length === 1) {
        if (interval > 80) {
          scanBuffer = e.key;
        } else {
          scanBuffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, searchQuery, handleAutoScanCode]);

  // Payment Confirmation Handler (SQLite Atomic Checkout + Stock Deduction)
  const handleConfirmPayment = async (paymentData: {
    method: 'cash' | 'debit' | 'transfer' | 'qris';
    cashReceived?: number;
    debitBank?: string;
    debitCardLast4?: string;
    debitApprovalCode?: string;
    transferBank?: string;
    transferRef?: string;
  }) => {
    try {
      const result = await posApi.createTransaction({
        cashier: currentUser?.fullName || 'Kasir',
        customerId,
        customerName: customerName.trim() || 'Pelanggan Umum',
        items: cart.map(item => ({ id: item.id, qty: item.qty })),
        paymentMethod: paymentData.method,
        paymentDetails: {
          cashReceived: paymentData.cashReceived,
          debitBank: paymentData.debitBank,
          debitCardLast4: paymentData.debitCardLast4,
          debitApprovalCode: paymentData.debitApprovalCode,
          transferBank: paymentData.transferBank,
          transferRef: paymentData.transferRef,
        },
      });

      setCart([]);
      setCustomerId(undefined);
      setCustomerName('Pelanggan Umum');
      setProductsRefreshKey(k => k + 1);
      setTransactionsRefreshKey(k => k + 1);
      setCustomersRefreshKey(k => k + 1);
      setDashboardRefreshKey(k => k + 1);
      playCashRegisterChime(isSoundEnabled);
      setIsPaymentModalOpen(false);
      setSelectedBuybackReceipt(null);
      setIsBuybackReceiptModalOpen(false);
      setSelectedReceipt(result.transaction);
      setIsReceiptModalOpen(true);
      showToast('success', `Transaksi ${result.transaction.invoiceNo} berhasil disimpan.`);
      if (storeSettings.autoPrintReceipt) {
        setTimeout(() => {
          handlePrintSaleReceipt();
        }, 250);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal memproses pembayaran.');
      throw err;
    }
  };

  // Transaction Void (Immutable Financial Ledger — Edit & Hard Delete Prohibited)
  const handleVoidTransaction = async (id: string, reason: string, restoreStock: boolean) => {
    try {
      const voided = await posApi.voidTransaction(id, { reason, restoreStock });
      setTransactionsRefreshKey(k => k + 1);
      if (restoreStock) {
        setProductsRefreshKey(k => k + 1);
      }
      setDashboardRefreshKey(k => k + 1);
      setCustomersRefreshKey(k => k + 1);
      showToast(
        'success',
        restoreStock
          ? `Transaksi ${voided.invoiceNo} di-void & stok barang dikembalikan ke inventaris.`
          : `Transaksi ${voided.invoiceNo} berhasil di-void.`
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mem-void transaksi.');
      throw err;
    }
  };

  // Buyback Create & Void (Immutable Financial Payout & KYC Voucher)
  const handleSaveBuyback = async (buybackData: BuybackCreatePayload) => {
    try {
      const created = await posApi.createBuyback(buybackData);
      setBuybacksRefreshKey(k => k + 1);
      setDashboardRefreshKey(k => k + 1);
      setCustomersRefreshKey(k => k + 1);
      setSelectedBuybackReceipt(created);
      setIsBuybackReceiptModalOpen(true);
      showToast('success', `Nota buyback ${created.invoiceNo} berhasil disimpan.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan transaksi buyback.');
      throw err;
    }
  };

  const handleVoidBuyback = async (id: string, reason: string) => {
    try {
      const voided = await posApi.voidBuyback(id, { reason });
      setBuybacksRefreshKey(k => k + 1);
      setDashboardRefreshKey(k => k + 1);
      setCustomersRefreshKey(k => k + 1);
      showToast('success', `Nota buyback ${voided.invoiceNo} berhasil di-void.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mem-void transaksi buyback.');
      throw err;
    }
  };

  // Inventory Product CRUD
  const handleSaveProduct = async (productData: Omit<Product, 'id'>, editId?: number) => {
    try {
      if (editId !== undefined) {
        const updated = await posApi.updateProduct(editId, productData);
        if (!categories.includes(updated.category)) {
          setCategories(prev => [...prev, updated.category]);
        }
        setProductsRefreshKey(k => k + 1);
        setCategoriesRefreshKey(k => k + 1);
        setDashboardRefreshKey(k => k + 1);
        setEditingProduct(null);
        setIsAddProductModalOpen(false);
        showToast('success', `Barang "${updated.name}" berhasil diperbarui.`);
      } else {
        const created = await posApi.createProduct(productData);
        if (!categories.includes(created.category)) {
          setCategories(prev => [...prev, created.category]);
        }
        setProductsRefreshKey(k => k + 1);
        setCategoriesRefreshKey(k => k + 1);
        setDashboardRefreshKey(k => k + 1);
        void refreshTenantsMetadata();
        setIsAddProductModalOpen(false);
        showToast('success', `Barang "${created.name}" ditambahkan ke inventaris.`);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan data barang.');
      throw err;
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      await posApi.deleteProduct(id);
      setCart(prev => prev.filter(c => c.id !== id));
      setProductsRefreshKey(k => k + 1);
      setCategoriesRefreshKey(k => k + 1);
      setDashboardRefreshKey(k => k + 1);
      void refreshTenantsMetadata();
      showToast('success', 'Barang berhasil dihapus dari inventaris.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menghapus barang.');
      throw err;
    }
  };

  // Inventory Category CRUD
  const handleSaveCategory = async (categoryName: string, oldName?: string) => {
    try {
      if (oldName) {
        const res = await posApi.renameCategory(oldName, categoryName);
        setCategories(res.categories);
        setCategoriesRefreshKey(k => k + 1);
        setProductsRefreshKey(k => k + 1);
        setEditingCategory(null);
        setIsAddCategoryModalOpen(false);
        showToast('success', `Kategori "${oldName}" diubah menjadi "${res.newName}".`);
      } else {
        const res = await posApi.createCategory(categoryName);
        setCategories(res.categories);
        setCategoriesRefreshKey(k => k + 1);
        setIsAddCategoryModalOpen(false);
        showToast('success', `Kategori "${res.name}" berhasil ditambahkan.`);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan kategori.');
      throw err;
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    try {
      const res = await posApi.deleteCategory(categoryName);
      setCategories(res.categories);
      setCategoriesRefreshKey(k => k + 1);
      showToast('success', `Kategori "${categoryName}" berhasil dihapus.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menghapus kategori.');
      throw err;
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 size={28} className="animate-spin text-orange-500 mb-3" />
        <p className="text-sm font-semibold text-gray-700">Memeriksa sesi login...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const isOwner = currentUser.role === 'owner';
  const canManageOperations = currentUser.role === 'owner' || currentUser.role === 'branch_manager';

  const handleGuardedSelectMenu = (menu: string) => {
    if (!isMenuAllowedForRole(menu, currentUser.role)) {
      showToast('warning', 'Menu tersebut hanya dapat diakses oleh Owner atau Kepala Cabang.');
      return;
    }
    setActiveMenu(menu);
  };

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex flex-col h-full h-[100dvh] font-sans text-gray-800 overflow-hidden bg-gray-100">
        {/* Header */}
        <Header
          onSelectMenu={handleGuardedSelectMenu}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          hasNotification={hasNotification}
          onToggleNotification={() => setHasNotification(!hasNotification)}
          isAdminMenuOpen={isAdminMenuOpen}
          onToggleAdminMenu={() => setIsAdminMenuOpen(prev => !prev)}
          onCloseAdminMenu={() => setIsAdminMenuOpen(false)}
          currentUser={currentUser}
          activeTenant={activeTenant}
          onLogout={handleLogout}
        />

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            activeMenu={activeMenu}
            onSelectMenu={handleGuardedSelectMenu}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isProdukExpanded={isProdukExpanded}
            onToggleProdukExpanded={() => {
              if (isSidebarCollapsed) {
                setIsSidebarCollapsed(false);
                setIsProdukExpanded(true);
              } else {
                setIsProdukExpanded(!isProdukExpanded);
              }
            }}
            tenants={tenants}
            activeTenantId={activeTenantId}
            onSelectTenant={handleSelectTenant}
            onOpenRegisterModal={() => setIsRegisterTenantOpen(true)}
            userRole={currentUser.role}
          />

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 flex flex-col min-w-0 relative bg-gray-100 overflow-hidden">
            <main
              className={`flex-1 min-h-0 flex flex-col ${
                activeMenu === 'Kasir POS (Penjualan)' || activeMenu === 'Kasir POS'
                  ? 'p-2 sm:p-3 overflow-hidden'
                  : 'p-2 sm:p-4 pb-20 md:pb-4 overflow-y-auto'
              }`}
            >
              {isLoadingData ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg border border-gray-200 p-8 text-gray-500">
                  <Loader2 size={28} className="animate-spin text-orange-500 mb-3" />
                  <p className="text-sm font-semibold text-gray-700">Memuat data dari database SQLite...</p>
                </div>
              ) : loadError ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg border border-red-200 p-8 text-center">
                  <AlertCircle size={32} className="text-red-500 mb-2" />
                  <p className="text-sm font-bold text-gray-900">Gagal terhubung ke database SQLite</p>
                  <p className="text-xs text-gray-500 mt-1 mb-4">{loadError}</p>
                  <button
                    type="button"
                    onClick={fetchBootstrapData}
                    className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Coba Muat Ulang
                  </button>
                </div>
              ) : activeMenu === 'Kasir POS (Penjualan)' || activeMenu === 'Kasir POS' ? (
                <PosView
                  categories={categories}
                  refreshTrigger={productsRefreshKey}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onAutoScanCode={handleAutoScanCode}
                  onOpenScanModal={() => setIsScanModalOpen(true)}
                  cart={cart}
                  onAddToCart={handleAddToCart}
                  onUpdateQty={handleUpdateQty}
                  onRemoveItem={handleRemoveItem}
                  onClearCart={handleClearCart}
                  subtotal={subtotal}
                  tax={tax}
                  taxLabel={taxLabel}
                  grandTotal={grandTotal}
                  onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
                />
              ) : (
                <Suspense fallback={<ViewLoadingFallback />}>
                  {activeMenu === 'Transaksi' || activeMenu === 'Transaksi Harian' ? (
                    <DailyTransactionsView
                      refreshTrigger={transactionsRefreshKey}
                      onSelectReceipt={tx => {
                        setSelectedBuybackReceipt(null);
                        setIsBuybackReceiptModalOpen(false);
                        setSelectedReceipt(tx);
                        setIsReceiptModalOpen(true);
                      }}
                      onVoidTransaction={handleVoidTransaction}
                      onNavigateToPos={() => setActiveMenu('Kasir POS (Penjualan)')}
                      canVoid={canManageOperations}
                    />
                  ) : activeMenu === 'Promo' && canManageOperations ? (
                    <PromoManagementView
                      refreshTrigger={promosRefreshKey}
                      storeName={activeTenant?.name}
                      onSavePromo={handleSavePromo}
                      onDeletePromo={handleDeletePromo}
                      onTogglePromoStatus={handleTogglePromoStatus}
                    />
                  ) : activeMenu === 'Daftar Barang' ? (
                    <ProductListView
                      refreshTrigger={productsRefreshKey}
                      onOpenAddModal={() => {
                        setEditingProduct(null);
                        setIsAddProductModalOpen(true);
                      }}
                      onEditProduct={product => {
                        setEditingProduct(product);
                        setIsAddProductModalOpen(true);
                      }}
                      onDeleteProduct={handleDeleteProduct}
                      canManageInventory={canManageOperations}
                    />
                  ) : activeMenu === 'Daftar Kategori' && canManageOperations ? (
                    <CategoryListView
                      refreshTrigger={categoriesRefreshKey}
                      onOpenAddCategoryModal={() => {
                        setEditingCategory(null);
                        setIsAddCategoryModalOpen(true);
                      }}
                      onEditCategory={cat => {
                        setEditingCategory(cat);
                        setIsAddCategoryModalOpen(true);
                      }}
                      onDeleteCategory={handleDeleteCategory}
                    />
                  ) : activeMenu === 'Buyback (Pembelian)' || activeMenu === 'Pembelian (buyback)' ? (
                    <BuybackView
                      refreshTrigger={buybacksRefreshKey}
                      branchName={activeTenant?.branchName}
                      cashierName={currentUser.fullName}
                      canVoid={canManageOperations}
                      onSaveBuyback={handleSaveBuyback}
                      onVoidBuyback={handleVoidBuyback}
                      onSelectReceipt={bb => {
                        setSelectedReceipt(null);
                        setIsReceiptModalOpen(false);
                        setSelectedBuybackReceipt(bb);
                        setIsBuybackReceiptModalOpen(true);
                      }}
                      onBackToPos={() => setActiveMenu('Kasir POS (Penjualan)')}
                    />
                  ) : activeMenu === 'Pelanggan' ? (
                    <CustomerView
                      refreshTrigger={customersRefreshKey}
                      onSaveCustomer={handleSaveCustomer}
                      onDeleteCustomer={handleDeleteCustomer}
                      canDelete={canManageOperations}
                    />
                  ) : activeMenu === 'Dashboard' && canManageOperations ? (
                    <DashboardView
                      refreshTrigger={dashboardRefreshKey}
                      activeTenant={activeTenant}
                      onNavigateTo={handleGuardedSelectMenu}
                      onOpenRegisterTenant={() => setIsRegisterTenantOpen(true)}
                    />
                  ) : (activeMenu === 'Multi-Tenant & Outlet' ||
                      activeMenu === 'Multi-Outlet' ||
                      activeMenu === 'Multi-Tenant') &&
                    canManageOperations ? (
                    <TenantManagementView
                      tenants={tenants}
                      activeTenantId={activeTenantId}
                      onSelectTenant={handleSelectTenant}
                      onOpenRegisterModal={() => setIsRegisterTenantOpen(true)}
                      onNavigateToPos={() => setActiveMenu('Kasir POS (Penjualan)')}
                      canCreateOutlet={isOwner}
                    />
                  ) : activeMenu === 'Manajemen User' && isOwner ? (
                    <UserManagementView currentUser={currentUser} tenants={tenants} />
                  ) : activeMenu === 'Pengaturan' && canManageOperations ? (
                    <StoreSettingsView
                      activeTenant={activeTenant}
                      storeSettings={storeSettings}
                      userRole={currentUser.role}
                      onSettingsSaved={({ tenant, storeSettings: saved }) => {
                        setTenants(prev => prev.map(t => (t.id === tenant.id ? tenant : t)));
                        setStoreSettings(saved);
                      }}
                    />
                  ) : activeMenu === 'Rekap Shift' ||
                    (activeMenu === 'Laporan & Analitik' && canManageOperations) ? (
                    <ShiftClosingView
                      currentUser={currentUser}
                      activeTenant={activeTenant}
                      onPrintShift={handlePrintShift}
                    />
                  ) : (
                    <FallbackView title={activeMenu} onBackToPos={() => setActiveMenu('Kasir POS (Penjualan)')} />
                  )}
                </Suspense>
              )}
            </main>
          </div>
        </div>

        {/* Bottom Navigation for Tablet & Mobile (lg:hidden) */}
        <nav className="lg:hidden shrink-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-1.5 sm:px-3 py-0.5 flex items-center justify-around z-30 min-h-[48px]">
          <button
            type="button"
            onClick={() => setActiveMenu('Kasir POS (Penjualan)')}
            className={`flex flex-col items-center justify-center py-0.5 px-1.5 rounded-md transition-all min-w-[48px] min-h-[40px] cursor-pointer active:scale-95 ${
              activeMenu === 'Kasir POS (Penjualan)' || activeMenu === 'Kasir POS'
                ? 'text-orange-600 font-bold bg-orange-50/80'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="relative">
              <ShoppingCart
                size={18}
                className={
                  activeMenu === 'Kasir POS (Penjualan)' || activeMenu === 'Kasir POS'
                    ? 'text-orange-600'
                    : 'text-gray-500'
                }
              />
              {cart.reduce((a, b) => a + b.qty, 0) > 0 && (
                <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center font-mono">
                  {cart.reduce((a, b) => a + b.qty, 0)}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold mt-0.5 leading-none">Kasir</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('Buyback (Pembelian)')}
            className={`flex flex-col items-center justify-center py-0.5 px-1.5 rounded-md transition-all min-w-[48px] min-h-[40px] cursor-pointer active:scale-95 ${
              activeMenu === 'Buyback (Pembelian)' || activeMenu === 'Pembelian (buyback)'
                ? 'text-orange-600 font-bold bg-orange-50/80'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Scale
              size={18}
              className={
                activeMenu === 'Buyback (Pembelian)' || activeMenu === 'Pembelian (buyback)'
                  ? 'text-orange-600'
                  : 'text-gray-500'
              }
            />
            <span className="text-xs font-semibold mt-0.5 leading-none">Buyback</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('Transaksi')}
            className={`flex flex-col items-center justify-center py-0.5 px-1.5 rounded-md transition-all min-w-[48px] min-h-[40px] cursor-pointer active:scale-95 ${
              activeMenu === 'Transaksi' || activeMenu === 'Transaksi Harian'
                ? 'text-orange-600 font-bold bg-orange-50/80'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ReceiptText
              size={18}
              className={
                activeMenu === 'Transaksi' || activeMenu === 'Transaksi Harian'
                  ? 'text-orange-600'
                  : 'text-gray-500'
              }
            />
            <span className="text-xs font-semibold mt-0.5 leading-none">Transaksi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('Daftar Barang')}
            className={`flex flex-col items-center justify-center py-0.5 px-1.5 rounded-md transition-all min-w-[48px] min-h-[40px] cursor-pointer active:scale-95 ${
              activeMenu === 'Daftar Barang'
                ? 'text-orange-600 font-bold bg-orange-50/80'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Gem size={18} className={activeMenu === 'Daftar Barang' ? 'text-orange-600' : 'text-gray-500'} />
            <span className="text-xs font-semibold mt-0.5 leading-none">Barang</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="flex flex-col items-center justify-center py-0.5 px-1.5 rounded-md transition-all text-gray-600 hover:text-gray-900 min-w-[48px] min-h-[40px] cursor-pointer active:scale-95"
          >
            <Menu size={18} />
            <span className="text-xs font-semibold mt-0.5 leading-none">Menu</span>
          </button>
        </nav>

        {/* Lazy Global Modals (only loaded on demand when opened) */}
        <Suspense fallback={null}>
          {isScanModalOpen && (
            <BarcodeScannerModal
              isOpen={isScanModalOpen}
              onClose={() => setIsScanModalOpen(false)}
              onScanCode={handleAutoScanCode}
              isSoundEnabled={isSoundEnabled}
              onToggleSound={() => setIsSoundEnabled(!isSoundEnabled)}
              scanCount={scanCount}
              totalCartQty={cart.reduce((acc, it) => acc + it.qty, 0)}
            />
          )}

          {isPaymentModalOpen && (
            <PaymentModal
              isOpen={isPaymentModalOpen}
              onClose={() => setIsPaymentModalOpen(false)}
              cart={cart}
              subtotal={subtotal}
              tax={tax}
              taxLabel={taxLabel}
              requireCustomer={storeSettings.requireCustomerOnSale}
              grandTotal={grandTotal}
              customerId={customerId}
              customerName={customerName}
              onCustomerChange={cust => {
                setCustomerId(cust.id);
                setCustomerName(cust.name);
              }}
              onCustomerCreated={() => setCustomersRefreshKey(k => k + 1)}
              onConfirmPayment={handleConfirmPayment}
            />
          )}

          {isReceiptModalOpen && (
            <ReceiptModal
              isOpen={isReceiptModalOpen}
              onClose={() => setIsReceiptModalOpen(false)}
              receipt={selectedReceipt}
              activeTenant={activeTenant}
              storeSettings={storeSettings}
              paperSize={receiptPaperSize}
              onPaperSizeChange={setReceiptPaperSize}
              onPrint={handlePrintSaleReceipt}
              onViewDailyTransactions={() => setActiveMenu('Transaksi')}
            />
          )}

          {isBuybackReceiptModalOpen && (
            <BuybackReceiptModal
              isOpen={isBuybackReceiptModalOpen}
              onClose={() => setIsBuybackReceiptModalOpen(false)}
              receipt={selectedBuybackReceipt}
              activeTenant={activeTenant}
              storeSettings={storeSettings}
              paperSize={receiptPaperSize}
              onPaperSizeChange={setReceiptPaperSize}
              onPrint={handlePrintBuybackReceipt}
            />
          )}

          {isAddProductModalOpen && (
            <AddProductModal
              isOpen={isAddProductModalOpen}
              onClose={() => {
                setIsAddProductModalOpen(false);
                setEditingProduct(null);
              }}
              categories={categories}
              editingProduct={editingProduct}
              onSaveProduct={handleSaveProduct}
            />
          )}

          {isAddCategoryModalOpen && (
            <AddCategoryModal
              isOpen={isAddCategoryModalOpen}
              onClose={() => {
                setIsAddCategoryModalOpen(false);
                setEditingCategory(null);
              }}
              editingCategory={editingCategory}
              onSaveCategory={handleSaveCategory}
            />
          )}

          {isRegisterTenantOpen && (
            <RegisterTenantModal
              isOpen={isRegisterTenantOpen}
              onClose={() => setIsRegisterTenantOpen(false)}
              onSaveTenant={handleRegisterTenant}
            />
          )}
        </Suspense>

        <ScanFeedbackToast feedback={scanFeedback} />

        {/* Hidden Printable Elements for Thermal Printer (@media print) */}
        <PrintableReceipt
          receipt={selectedReceipt}
          activeTenant={activeTenant}
          storeSettings={storeSettings}
          paperSize={receiptPaperSize}
        />
        <PrintableBuybackReceipt
          receipt={selectedBuybackReceipt}
          activeTenant={activeTenant}
          storeSettings={storeSettings}
          paperSize={receiptPaperSize}
        />
        <PrintableShiftReport shift={printingShift} activeTenant={activeTenant} />
      </div>
    </TooltipProvider>
  );
};

export default App;
