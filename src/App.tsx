import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Scale, ReceiptText, Gem, Menu } from'lucide-react';
import { TooltipProvider } from'./components/Tooltip';
import { Header } from'./components/layout/Header';
import { Sidebar } from'./components/layout/Sidebar';
import { PosView } from'./components/pos/PosView';
import { BarcodeScannerModal } from'./components/pos/BarcodeScannerModal';
import { PaymentModal } from'./components/pos/PaymentModal';
import { ReceiptModal } from'./components/pos/ReceiptModal';
import { PrintableReceipt } from'./components/pos/PrintableReceipt';
import { ScanFeedbackToast } from'./components/pos/ScanFeedbackToast';
import { BuybackView } from'./components/buyback/BuybackView';
import { BuybackReceiptModal } from'./components/buyback/BuybackReceiptModal';
import { PrintableBuybackReceipt } from'./components/buyback/PrintableBuybackReceipt';
import { DailyTransactionsView } from'./components/transactions/DailyTransactionsView';
import { ProductListView } from'./components/inventory/ProductListView';
import { CategoryListView } from'./components/inventory/CategoryListView';
import { AddProductModal } from'./components/inventory/AddProductModal';
import { AddCategoryModal } from'./components/inventory/AddCategoryModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { CustomerView } from './components/customer/CustomerView';
import { PromoManagementView } from './components/promo/PromoManagementView';
import { TenantManagementView } from './components/tenant/TenantManagementView';
import { RegisterTenantModal } from './components/tenant/RegisterTenantModal';
import { FallbackView } from './components/common/FallbackView';

import { Product, CartItem, Transaction, BuybackItem, PromoCampaign, Tenant, Customer } from './types';
import { INITIAL_PRODUCTS, INITIAL_TRANSACTIONS, INITIAL_BUYBACKS, INITIAL_PROMOS, INITIAL_CUSTOMERS } from './data/initialData';
import { INITIAL_TENANTS } from './data/initialTenants';
import { DEFAULT_CATEGORIES } from './constants/kadar';
import { playScannerBeep, playCashRegisterChime } from './utils/audio';

const App: React.FC = () => {
  // Navigation & Layout State
  const [activeMenu, setActiveMenu] = useState('Kasir POS (Penjualan)');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProdukExpanded, setIsProdukExpanded] = useState(true);
  const [hasNotification, setHasNotification] = useState(true);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  // Products & Categories State (Persisted)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('epaper_pos_products');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_PRODUCTS;
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('epaper_pos_categories');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CATEGORIES;
  });

  // Transactions State (Persisted)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('epaper_pos_transactions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_TRANSACTIONS;
  });

  // Buyback State (Persisted)
  const [buybacks, setBuybacks] = useState<BuybackItem[]>(() => {
    try {
      const saved = localStorage.getItem('epaper_pos_buybacks');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_BUYBACKS;
  });

  // Promos State (Persisted)
  const [promos, setPromos] = useState<PromoCampaign[]>(() => {
    try {
      const saved = localStorage.getItem('epaper_pos_promos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_PROMOS;
  });

  useEffect(() => {
    localStorage.setItem('epaper_pos_promos', JSON.stringify(promos));
  }, [promos]);

  // Customers State (Persisted)
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('epaper_pos_customers');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_CUSTOMERS;
  });

  const [buybackInitialCustomer, setBuybackInitialCustomer] = useState<{
    name: string;
    phone: string;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem('epaper_pos_customers', JSON.stringify(customers));
  }, [customers]);

  const handleSaveCustomer = (savedCustomer: Customer) => {
    setCustomers(prev => {
      const index = prev.findIndex(c => c.id === savedCustomer.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = savedCustomer;
        return next;
      }
      return [savedCustomer, ...prev];
    });
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  // Multi-Tenant State (Persisted)
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    try {
      const saved = localStorage.getItem('epaper_pos_tenants');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_TENANTS;
  });

  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('epaper_pos_active_tenant_id');
      if (saved) return saved;
    } catch {}
    return INITIAL_TENANTS[0]?.id || 'tenant-tms-001';
  });

  const [isRegisterTenantOpen, setIsRegisterTenantOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('epaper_pos_tenants', JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    localStorage.setItem('epaper_pos_active_tenant_id', activeTenantId);
  }, [activeTenantId]);

  const activeTenant = tenants.find(t => t.id === activeTenantId) || tenants[0];

  const handleRegisterTenant = (newTenant: Tenant) => {
    setTenants(prev => [newTenant, ...prev]);
    setActiveTenantId(newTenant.id);
  };

  // Synchronize product promo flags dynamically with active promos (O(1) Map Lookup & Memoized)
  const productsWithPromo = useMemo(() => {
    const activePromos = promos.filter(p => p.isActive);
    if (activePromos.length === 0) {
      return products.map(product => ({
        ...product,
        isPromo: false,
        promoDiscountPercent: undefined,
        promoLabel: undefined,
      }));
    }

    const promoMap = new Map<number, PromoCampaign>();
    for (const promo of activePromos) {
      for (const prodId of promo.productIds) {
        if (!promoMap.has(prodId)) {
          promoMap.set(prodId, promo);
        }
      }
    }

    return products.map(product => {
      const applicablePromo = promoMap.get(product.id);
      if (applicablePromo) {
        return {
          ...product,
          isPromo: true,
          promoDiscountPercent: applicablePromo.discountPercent,
          promoLabel: applicablePromo.label,
        };
      }
      return {
        ...product,
        isPromo: false,
        promoDiscountPercent: undefined,
        promoLabel: undefined,
      };
    });
  }, [products, promos]);

  // Index map SKU & ID produk untuk O(1) scanner & lookup super instan
  const productLookupMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of productsWithPromo) {
      map.set(p.sku.toLowerCase(), p);
      map.set(p.name.toLowerCase(), p);
      map.set(p.id.toString(), p);
      const alphaNum = p.sku.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (alphaNum.length >= 3) {
        map.set(alphaNum, p);
      }
    }
    return map;
  }, [productsWithPromo]);

  const handleSavePromo = (savedPromo: PromoCampaign) => {
    setPromos(prev => {
      const index = prev.findIndex(p => p.id === savedPromo.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = savedPromo;
        return next;
      }
      return [savedPromo, ...prev];
    });
  };

  const handleDeletePromo = (id: string) => {
    setPromos(prev => prev.filter(p => p.id !== id));
  };

  const handleTogglePromoStatus = (id: string) => {
    setPromos(prev =>
      prev.map(p => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
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
  const [customerName, setCustomerName] = useState('Pelanggan Umum');
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Buyback Receipt Modal State
  const [selectedBuybackReceipt, setSelectedBuybackReceipt] = useState<BuybackItem | null>(null);
  const [isBuybackReceiptModalOpen, setIsBuybackReceiptModalOpen] = useState(false);

  // Inventory Modals State
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);

  // Responsive sidebar collapsing on tablet & mobile (< 1024px)
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

  // Cart Totals Calculation
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.harga * item.qty, 0), [cart]);
  const tax = useMemo(() => Math.round(subtotal * 0.11), [subtotal]);
  const grandTotal = useMemo(() => subtotal + tax, [subtotal, tax]);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query 200ms agar UI tidak freeze saat mengetik di dataset ribuan produk
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const filteredProducts = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return productsWithPromo;
    return productsWithPromo.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [productsWithPromo, debouncedSearchQuery]);

  // Cart Handlers
  const handleAddToCart = (product: Product) => {
    if (product.stok <= 0) {
      alert(`Stok produk ${product.name} habis.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stok) {
          alert(`Jumlah melebihi stok yang tersedia (${product.stok} pcs).`);
          return prev;
        }
        return prev.map(item => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const handleUpdateQty = (id: number, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.id === id) {
            const product = products.find(p => p.id === id);
            const maxStok = product ? product.stok : item.stok;
            const newQty = item.qty + delta;
            if (delta > 0 && newQty > maxStok) {
              alert(`Jumlah maksimal sesuai stok adalah ${maxStok} pcs.`);
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
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Barcode Auto-Scan Logic dengan O(1) Map Lookup
  const handleAutoScanCode = (code: string): boolean => {
    const clean = code.trim().toLowerCase();
    if (!clean) return false;

    let found = productLookupMap.get(clean);
    if (!found) {
      const alphaNum = clean.replace(/[^a-z0-9]/g, '');
      if (alphaNum.length >= 3) {
        found = productLookupMap.get(alphaNum);
      }
    }

    if (found) {
      handleAddToCart(found);
      playScannerBeep(isSoundEnabled);
      setScanCount(prev => prev + 1);
      setScanFeedback({
        product: found,
        time: new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' }),
      });
      setTimeout(() => setScanFeedback(null), 3000);
      setSearchQuery('');
      return true;
    }
    return false;
  };

  // Global Hardware Barcode Scanner Listener (Keystrokes with Enter)
  useEffect(() => {
    let scanBuffer ='';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const now = Date.now();
      const interval = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key ==='Enter') {
        const queryToScan = (scanBuffer.length >= 3 ? scanBuffer : searchQuery).trim();
        if (queryToScan) {
          const success = handleAutoScanCode(queryToScan);
          if (success) {
            e.preventDefault();
          }
        }
        scanBuffer ='';
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
  }, [searchQuery, products, isSoundEnabled]);

  // Payment Confirmation Handler
  const handleConfirmPayment = (paymentData: {
    method:'cash' |'debit' |'transfer' |'qris';
    cashReceived?: number;
    debitBank?: string;
    debitCardLast4?: string;
    debitApprovalCode?: string;
    transferBank?: string;
    transferRef?: string;
  }) => {
    const now = new Date();
    const dateNum = now.toISOString().slice(0, 10).replace(/-/g,'');
    const invoiceNo = `TRX-${dateNum}-${String(transactions.length + 1).padStart(3,'0')}`;

    const txItems = cart.map(item => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      berat: item.berat,
      harga: item.harga,
      qty: item.qty,
      subtotal: item.harga * item.qty,
      image: item.image,
    }));

    const totalQty = txItems.reduce((acc, item) => acc + item.qty, 0);
    const totalBerat = parseFloat(txItems.reduce((acc, item) => acc + item.berat * item.qty, 0).toFixed(2));

    const newTransaction: Transaction = {
      id: invoiceNo,
      invoiceNo,
      dateTime: now.toISOString(),
      dateStr: now.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }),
      timeStr: now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' }),
      cashier:'Administrator Kasir (Shift 1)',
      customerName: customerName.trim() ||'Pelanggan Umum',
      items: txItems,
      totalQty,
      totalBerat,
      subtotal,
      tax,
      grandTotal,
      paymentMethod: paymentData.method,
      paymentDetails: {
        cashReceived: paymentData.cashReceived,
        cashChange: paymentData.cashReceived ? Math.max(0, paymentData.cashReceived - grandTotal) : undefined,
        debitBank: paymentData.debitBank,
        debitCardLast4: paymentData.debitCardLast4,
        debitApprovalCode: paymentData.debitApprovalCode,
        transferBank: paymentData.transferBank,
        transferRef: paymentData.transferRef,
        qrisNmid: paymentData.method ==='qris' ?'ID102003928192' : undefined,
        qrisRrn: paymentData.method ==='qris' ? `RRN${Date.now().toString().slice(-8)}` : undefined,
      },
    };

    // Deduct stock in products
    setProducts(prevProducts => {
      const updated = prevProducts.map(p => {
        const cartMatch = cart.find(c => c.id === p.id);
        if (cartMatch) {
          return { ...p, stok: Math.max(0, p.stok - cartMatch.qty) };
        }
        return p;
      });
      try {
        localStorage.setItem('epaper_pos_products', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Save transaction
    setTransactions(prev => {
      const updated = [newTransaction, ...prev];
      try {
        localStorage.setItem('epaper_pos_transactions', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setCart([]);
    playCashRegisterChime(isSoundEnabled);
    setIsPaymentModalOpen(false);
    setSelectedReceipt(newTransaction);
    setIsReceiptModalOpen(true);
  };

  // Buyback Creation Handler
  const handleSaveBuyback = (newBuybackData: Omit<BuybackItem,'id' |'invoiceNo' |'date'>) => {
    const now = new Date();
    const dateStr =
      now.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) +
',' +
      now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    const invoiceNo = `BB-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2,'0')}${now .getDate() .toString() .padStart(2,'0')}-${(buybacks.length + 1).toString().padStart(3,'0')}`;

    const createdBuyback: BuybackItem = {
      ...newBuybackData,
      id: `bb-${Date.now()}`,
      invoiceNo,
      date: dateStr,
    };

    const updated = [createdBuyback, ...buybacks];
    setBuybacks(updated);
    try {
      localStorage.setItem('epaper_pos_buybacks', JSON.stringify(updated));
    } catch {}

    setSelectedBuybackReceipt(createdBuyback);
    setIsBuybackReceiptModalOpen(true);
  };

  // Inventory Save Product Handler
  const handleSaveProduct = (newProductData: Omit<Product,'id'>) => {
    const created: Product = {
      ...newProductData,
      id: Date.now(),
    };
    const updated = [created, ...products];
    setProducts(updated);
    try {
      localStorage.setItem('epaper_pos_products', JSON.stringify(updated));
    } catch {}
    setIsAddProductModalOpen(false);
  };

  // Inventory Save Category Handler
  const handleSaveCategory = (categoryName: string) => {
    if (categories.includes(categoryName)) {
      alert('Kategori tersebut sudah ada.');
      return;
    }
    const updated = [...categories, categoryName];
    setCategories(updated);
    try {
      localStorage.setItem('epaper_pos_categories', JSON.stringify(updated));
    } catch {}
    setIsAddCategoryModalOpen(false);
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
            onSelectTenant={setActiveTenantId}
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
              {activeMenu === 'Kasir POS (Penjualan)' || activeMenu === 'Kasir POS' ? (
                <PosView
                  products={productsWithPromo}
                  filteredProducts={filteredProducts}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onAutoScanCode={handleAutoScanCode}
                  onOpenScanModal={() => setIsScanModalOpen(true)}
                  cart={cart}
                  onAddToCart={handleAddToCart}
                  onUpdateQty={handleUpdateQty}
                  onRemoveItem={handleRemoveItem}
                  subtotal={subtotal}
                  tax={tax}
                  grandTotal={grandTotal}
                  onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
                />
              ) : activeMenu === 'Transaksi' || activeMenu === 'Transaksi Harian' ? (
                <DailyTransactionsView
                  transactions={transactions}
                  onSelectReceipt={tx => {
                    setSelectedReceipt(tx);
                    setIsReceiptModalOpen(true);
                  }}
                  onNavigateToPos={() => setActiveMenu('Kasir POS (Penjualan)')}
                />
              ) : activeMenu === 'Promo' ? (
                <PromoManagementView
                  promos={promos}
                  products={productsWithPromo}
                  onSavePromo={handleSavePromo}
                  onDeletePromo={handleDeletePromo}
                  onTogglePromoStatus={handleTogglePromoStatus}
                  onNavigateToPosWithPromo={() => setActiveMenu('Kasir POS (Penjualan)')}
                />
              ) : activeMenu === 'Daftar Barang' ? (
                <ProductListView
                  products={productsWithPromo}
                  onOpenAddModal={() => setIsAddProductModalOpen(true)}
                  onAddToCartAndOpenPos={p => {
                    handleAddToCart(p);
                    setActiveMenu('Kasir POS (Penjualan)');
                  }}
                />
              ) : activeMenu === 'Daftar Kategori' ? (
                <CategoryListView
                  categories={categories}
                  products={productsWithPromo}
                  onOpenAddCategoryModal={() => setIsAddCategoryModalOpen(true)}
                />
              ) : activeMenu === 'Buyback (Pembelian)' || activeMenu === 'Pembelian (buyback)' ? (
                <BuybackView
                  buybacks={buybacks}
                  onSaveBuyback={handleSaveBuyback}
                  onSelectReceipt={bb => {
                    setSelectedBuybackReceipt(bb);
                    setIsBuybackReceiptModalOpen(true);
                  }}
                  onBackToPos={() => setActiveMenu('Kasir POS (Penjualan)')}
                  initialCustomer={buybackInitialCustomer}
                />
              ) : activeMenu === 'Pelanggan' ? (
                <CustomerView
                  customers={customers}
                  transactions={transactions}
                  buybacks={buybacks}
                  onSaveCustomer={handleSaveCustomer}
                  onDeleteCustomer={handleDeleteCustomer}
                  onSelectCustomerForPOS={name => {
                    setCustomerName(name);
                    setActiveMenu('Kasir POS (Penjualan)');
                  }}
                  onSelectCustomerForBuyback={(name, phone) => {
                    setBuybackInitialCustomer({ name, phone });
                    setActiveMenu('Buyback (Pembelian)');
                  }}
                />
              ) : activeMenu === 'Dashboard' ? (
                <DashboardView
                  products={productsWithPromo}
                  transactions={transactions}
                  buybacks={buybacks}
                  activeTenant={activeTenant}
                  onNavigateTo={setActiveMenu}
                  onOpenRegisterTenant={() => setIsRegisterTenantOpen(true)}
                />
              ) : activeMenu === 'Multi-Tenant & Outlet' || activeMenu === 'Multi-Outlet' || activeMenu === 'Multi-Tenant' ? (
                <TenantManagementView
                  tenants={tenants}
                  activeTenantId={activeTenantId}
                  onSelectTenant={setActiveTenantId}
                  onOpenRegisterModal={() => setIsRegisterTenantOpen(true)}
                  onNavigateToPos={() => setActiveMenu('Kasir POS (Penjualan)')}
                />
              ) : (
                <FallbackView title={activeMenu} onBackToPos={() => setActiveMenu('Kasir POS (Penjualan)')} />
              )}
            </main>

          </div>
        </div>

        {/* Bottom Navigation for Tablet & Mobile (lg:hidden) - menus moved from top to bottom */}
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
              <ShoppingCart size={18} className={activeMenu === 'Kasir POS (Penjualan)' || activeMenu === 'Kasir POS' ? 'text-orange-600' : 'text-gray-500'} />
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
            <Scale size={18} className={activeMenu === 'Buyback (Pembelian)' || activeMenu === 'Pembelian (buyback)' ? 'text-orange-600' : 'text-gray-500'} />
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
            <ReceiptText size={18} className={activeMenu === 'Transaksi' || activeMenu === 'Transaksi Harian' ? 'text-orange-600' : 'text-gray-500'} />
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

        {/* Global Modals & Print Elements */}
        <BarcodeScannerModal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          products={productsWithPromo}
          onScanCode={handleAutoScanCode}
          isSoundEnabled={isSoundEnabled}
          onToggleSound={() => setIsSoundEnabled(!isSoundEnabled)}
          scanCount={scanCount}
          totalCartQty={cart.reduce((acc, it) => acc + it.qty, 0)}
        />

        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          cart={cart}
          subtotal={subtotal}
          tax={tax}
          grandTotal={grandTotal}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          onConfirmPayment={handleConfirmPayment}
        />

        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          receipt={selectedReceipt}
          onPrint={() => window.print()}
          onViewDailyTransactions={() => setActiveMenu('Transaksi')}
        />

        <BuybackReceiptModal
          isOpen={isBuybackReceiptModalOpen}
          onClose={() => setIsBuybackReceiptModalOpen(false)}
          receipt={selectedBuybackReceipt}
          onPrint={() => window.print()}
        />

        <AddProductModal
          isOpen={isAddProductModalOpen}
          onClose={() => setIsAddProductModalOpen(false)}
          categories={categories}
          onSaveProduct={handleSaveProduct}
        />

        <AddCategoryModal
          isOpen={isAddCategoryModalOpen}
          onClose={() => setIsAddCategoryModalOpen(false)}
          onSaveCategory={handleSaveCategory}
        />

        <RegisterTenantModal
          isOpen={isRegisterTenantOpen}
          onClose={() => setIsRegisterTenantOpen(false)}
          onSaveTenant={handleRegisterTenant}
        />

        <ScanFeedbackToast feedback={scanFeedback} />

        {/* Hidden Printable Elements for Thermal Printer (@media print) */}
        <PrintableReceipt receipt={selectedReceipt} />
        <PrintableBuybackReceipt receipt={selectedBuybackReceipt} />
      </div>
    </TooltipProvider>
  );
};

export default App;
