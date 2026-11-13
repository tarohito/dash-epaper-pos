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
import { FallbackView } from './components/common/FallbackView';

import {
  Product,
  CartItem,
  Transaction,
  BuybackItem,
  BuybackCreatePayload,
  PromoCampaign,
  Tenant,
  Customer,
} from './types';
import { playScannerBeep, playCashRegisterChime } from './utils/audio';
import { extractBarcodeValue } from './utils/barcode';
import { posApi } from './services/api';

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

const App: React.FC = () => {
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

  // Load lightweight bootstrap metadata (categories, tenants, active tenant)
  const fetchBootstrapData = useCallback(async () => {
    setIsLoadingData(true);
    setLoadError(null);
    try {
      const data = await posApi.bootstrap();
      setCategories(data.categories);
      setTenants(data.tenants);
      setActiveTenantId(data.activeTenantId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data dari database SQLite.';
      setLoadError(msg);
      showToast('error', msg);
    } finally {
      setIsLoadingData(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBootstrapData();
  }, [fetchBootstrapData]);

  const [buybackInitialCustomer, setBuybackInitialCustomer] = useState<{
    id?: string;
    name: string;
    phone: string;
    nik?: string;
    address?: string;
  } | null>(null);

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

  const handleSelectTenant = async (tenantId: string) => {
    const prevId = activeTenantId;
    setActiveTenantId(tenantId);
    try {
      await posApi.setActiveTenant(tenantId);
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
      setIsRegisterTenantOpen(false);
      showToast('success', `Outlet "${created.name}" berhasil didaftarkan.`);
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
  const tax = useMemo(() => Math.round(subtotal * 0.11), [subtotal]);
  const grandTotal = useMemo(() => subtotal + tax, [subtotal, tax]);

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
  }, [searchQuery, handleAutoScanCode]);

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
        cashier: 'Administrator Kasir (Shift 1)',
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
      setSelectedReceipt(result.transaction);
      setIsReceiptModalOpen(true);
      showToast('success', `Transaksi ${result.transaction.invoiceNo} berhasil disimpan.`);
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
      setBuybackInitialCustomer(null);
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

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex flex-col h-full h-[100dvh] font-sans text-gray-800 overflow-hidden bg-gray-100">
        {/* Header */}
        <Header
          activeMenu={activeMenu}
          onSelectMenu={setActiveMenu}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          hasNotification={hasNotification}
          onToggleNotification={() => setHasNotification(!hasNotification)}
          isAdminMenuOpen={isAdminMenuOpen}
          onToggleAdminMenu={() => setIsAdminMenuOpen(prev => !prev)}
          onCloseAdminMenu={() => setIsAdminMenuOpen(false)}
        />

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            activeMenu={activeMenu}
            onSelectMenu={setActiveMenu}
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
                  grandTotal={grandTotal}
                  onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
                />
              ) : (
                <Suspense fallback={<ViewLoadingFallback />}>
                  {activeMenu === 'Transaksi' || activeMenu === 'Transaksi Harian' ? (
                    <DailyTransactionsView
                      refreshTrigger={transactionsRefreshKey}
                      onSelectReceipt={tx => {
                        setSelectedReceipt(tx);
                        setIsReceiptModalOpen(true);
                      }}
                      onVoidTransaction={handleVoidTransaction}
                      onNavigateToPos={() => setActiveMenu('Kasir POS (Penjualan)')}
                    />
                  ) : activeMenu === 'Promo' ? (
                    <PromoManagementView
                      refreshTrigger={promosRefreshKey}
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
                    />
                  ) : activeMenu === 'Daftar Kategori' ? (
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
                      onSaveBuyback={handleSaveBuyback}
                      onVoidBuyback={handleVoidBuyback}
                      onSelectReceipt={bb => {
                        setSelectedBuybackReceipt(bb);
                        setIsBuybackReceiptModalOpen(true);
                      }}
                      onBackToPos={() => setActiveMenu('Kasir POS (Penjualan)')}
                      initialCustomer={buybackInitialCustomer}
                    />
                  ) : activeMenu === 'Pelanggan' ? (
                    <CustomerView
                      refreshTrigger={customersRefreshKey}
                      onSaveCustomer={handleSaveCustomer}
                      onDeleteCustomer={handleDeleteCustomer}
                      onSelectCustomerForPOS={cust => {
                        setCustomerId(cust.id);
                        setCustomerName(cust.name);
                        setActiveMenu('Kasir POS (Penjualan)');
                      }}
                      onSelectCustomerForBuyback={cust => {
                        setBuybackInitialCustomer(cust);
                        setActiveMenu('Buyback (Pembelian)');
                      }}
                    />
                  ) : activeMenu === 'Dashboard' ? (
                    <DashboardView
                      refreshTrigger={dashboardRefreshKey}
                      activeTenant={activeTenant}
                      onNavigateTo={setActiveMenu}
                      onOpenRegisterTenant={() => setIsRegisterTenantOpen(true)}
                    />
                  ) : activeMenu === 'Multi-Tenant & Outlet' ||
                    activeMenu === 'Multi-Outlet' ||
                    activeMenu === 'Multi-Tenant' ? (
                    <TenantManagementView
                      tenants={tenants}
                      activeTenantId={activeTenantId}
                      onSelectTenant={handleSelectTenant}
                      onOpenRegisterModal={() => setIsRegisterTenantOpen(true)}
                      onNavigateToPos={() => setActiveMenu('Kasir POS (Penjualan)')}
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
                <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center font-mono">
                  {cart.reduce((a, b) => a + b.qty, 0)}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold mt-0.5 leading-none">Kasir</span>
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
            <span className="text-[11px] font-semibold mt-0.5 leading-none">Buyback</span>
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
            <span className="text-[11px] font-semibold mt-0.5 leading-none">Transaksi</span>
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
            <span className="text-[11px] font-semibold mt-0.5 leading-none">Barang</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="flex flex-col items-center justify-center py-0.5 px-1.5 rounded-md transition-all text-gray-600 hover:text-gray-900 min-w-[48px] min-h-[40px] cursor-pointer active:scale-95"
          >
            <Menu size={18} />
            <span className="text-[11px] font-semibold mt-0.5 leading-none">Menu</span>
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
              onPrint={() => window.print()}
              onViewDailyTransactions={() => setActiveMenu('Transaksi')}
            />
          )}

          {isBuybackReceiptModalOpen && (
            <BuybackReceiptModal
              isOpen={isBuybackReceiptModalOpen}
              onClose={() => setIsBuybackReceiptModalOpen(false)}
              receipt={selectedBuybackReceipt}
              onPrint={() => window.print()}
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
        <PrintableReceipt receipt={selectedReceipt} />
        <PrintableBuybackReceipt receipt={selectedBuybackReceipt} />
      </div>
    </TooltipProvider>
  );
};

export default App;
