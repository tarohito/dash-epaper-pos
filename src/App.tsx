import React, { useState, useEffect } from 'react';
import { ShoppingCart, Scale, ReceiptText, Gem, Menu } from 'lucide-react';
import { TooltipProvider } from './components/Tooltip';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { PosView } from './components/pos/PosView';
import { BarcodeScannerModal } from './components/pos/BarcodeScannerModal';
import { PaymentModal } from './components/pos/PaymentModal';
import { ReceiptModal } from './components/pos/ReceiptModal';
import { PrintableReceipt } from './components/pos/PrintableReceipt';
import { ScanFeedbackToast } from './components/pos/ScanFeedbackToast';
import { BuybackView } from './components/buyback/BuybackView';
import { BuybackReceiptModal } from './components/buyback/BuybackReceiptModal';
import { PrintableBuybackReceipt } from './components/buyback/PrintableBuybackReceipt';
import { DailyTransactionsView } from './components/transactions/DailyTransactionsView';
import { ProductListView } from './components/inventory/ProductListView';
import { CategoryListView } from './components/inventory/CategoryListView';
import { AddProductModal } from './components/inventory/AddProductModal';
import { AddCategoryModal } from './components/inventory/AddCategoryModal';
import { FallbackView } from './components/common/FallbackView';

import { Product, CartItem, Transaction, BuybackItem } from './types';
import { INITIAL_PRODUCTS, INITIAL_TRANSACTIONS, INITIAL_BUYBACKS } from './data/initialData';
import { DEFAULT_CATEGORIES } from './constants/kadar';
import { playScannerBeep, playCashRegisterChime } from './utils/audio';

const App: React.FC = () => {
  // Navigation & Layout State
  const [activeMenu, setActiveMenu] = useState('Kasir POS');
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
  const subtotal = cart.reduce((sum, item) => sum + item.harga * item.qty, 0);
  const tax = Math.round(subtotal * 0.11);
  const grandTotal = subtotal + tax;

  const filteredProducts = products.filter(
    p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Barcode Auto-Scan Logic
  const handleAutoScanCode = (code: string): boolean => {
    const clean = code.trim().toLowerCase();
    if (!clean) return false;

    let found = products.find(p => p.sku.toLowerCase() === clean);
    if (!found) {
      found = products.find(p => p.name.toLowerCase() === clean);
    }
    if (!found) {
      const alphaNum = clean.replace(/[^a-z0-9]/g, '');
      if (alphaNum.length >= 4) {
        found = products.find(p => p.sku.toLowerCase().replace(/[^a-z0-9]/g, '') === alphaNum);
      }
    }

    if (found) {
      handleAddToCart(found);
      playScannerBeep(isSoundEnabled);
      setScanCount(prev => prev + 1);
      setScanFeedback({
        product: found,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
      setTimeout(() => setScanFeedback(null), 3000);
      setSearchQuery('');
      return true;
    }
    return false;
  };

  // Global Hardware Barcode Scanner Listener (Keystrokes with Enter)
  useEffect(() => {
    let scanBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const now = Date.now();
      const interval = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        const queryToScan = (scanBuffer.length >= 3 ? scanBuffer : searchQuery).trim();
        if (queryToScan) {
          const success = handleAutoScanCode(queryToScan);
          if (success) {
            e.preventDefault();
          }
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
  }, [searchQuery, products, isSoundEnabled]);

  // Payment Confirmation Handler
  const handleConfirmPayment = (paymentData: {
    method: 'cash' | 'debit' | 'transfer' | 'qris';
    cashReceived?: number;
    debitBank?: string;
    debitCardLast4?: string;
    debitApprovalCode?: string;
    transferBank?: string;
    transferRef?: string;
  }) => {
    const now = new Date();
    const dateNum = now.toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNo = `TRX-${dateNum}-${String(transactions.length + 1).padStart(3, '0')}`;

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
      dateStr: now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      timeStr: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cashier: 'Administrator Kasir (Shift 1)',
      customerName: customerName.trim() || 'Pelanggan Umum',
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
        qrisNmid: paymentData.method === 'qris' ? 'ID102003928192' : undefined,
        qrisRrn: paymentData.method === 'qris' ? `RRN${Date.now().toString().slice(-8)}` : undefined,
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
  const handleSaveBuyback = (newBuybackData: Omit<BuybackItem, 'id' | 'invoiceNo' | 'date'>) => {
    const now = new Date();
    const dateStr =
      now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' +
      now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const invoiceNo = `BB-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now .getDate() .toString() .padStart(2, '0')}-${(buybacks.length + 1).toString().padStart(3, '0')}`;

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
  const handleSaveProduct = (newProductData: Omit<Product, 'id'>) => {
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
          />

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 flex flex-col min-w-0 relative bg-gray-100 overflow-hidden">
            <main
              className={`flex-1 min-h-0 flex flex-col ${
                activeMenu === 'Kasir POS'
                  ? 'p-2 sm:p-3 overflow-hidden'
                  : 'p-2 sm:p-4 pb-20 md:pb-4 overflow-y-auto'
              }`}
            >
              {activeMenu === 'Kasir POS' ? (
                <PosView
                  products={products}
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
              ) : activeMenu === 'Transaksi Harian' ? (
                <DailyTransactionsView
                  transactions={transactions}
                  onSelectReceipt={tx => {
                    setSelectedReceipt(tx);
                    setIsReceiptModalOpen(true);
                  }}
                  onNavigateToPos={() => setActiveMenu('Kasir POS')}
                />
              ) : activeMenu === 'Daftar Barang' ? (
                <ProductListView
                  products={products}
                  onOpenAddModal={() => setIsAddProductModalOpen(true)}
                  onAddToCartAndOpenPos={p => {
                    handleAddToCart(p);
                    setActiveMenu('Kasir POS');
                  }}
                />
              ) : activeMenu === 'Daftar Kategori' ? (
                <CategoryListView
                  categories={categories}
                  products={products}
                  onOpenAddCategoryModal={() => setIsAddCategoryModalOpen(true)}
                />
              ) : activeMenu === 'Pembelian (buyback)' ? (
                <BuybackView
                  buybacks={buybacks}
                  onSaveBuyback={handleSaveBuyback}
                  onSelectReceipt={bb => {
                    setSelectedBuybackReceipt(bb);
                    setIsBuybackReceiptModalOpen(true);
                  }}
                  onBackToPos={() => setActiveMenu('Kasir POS')}
                />
              ) : (
                <FallbackView title={activeMenu} onBackToPos={() => setActiveMenu('Kasir POS')} />
              )}
            </main>

          </div>
        </div>

        {/* Bottom Navigation for Tablet & Mobile (lg:hidden) - menus moved from top to bottom */}
        <nav className="lg:hidden shrink-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-1.5 sm:px-3 py-1 flex items-center justify-around shadow-lg z-30 min-h-[56px]">
          <button
            type="button"
            onClick={() => setActiveMenu('Kasir POS')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] min-h-[46px] cursor-pointer active:scale-95 ${
              activeMenu === 'Kasir POS'
                ? 'text-orange-600 font-bold bg-orange-50/80 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <div className="relative">
              <ShoppingCart size={19} className={activeMenu === 'Kasir POS' ? 'text-orange-600' : 'text-gray-500'} />
              {cart.reduce((a, b) => a + b.qty, 0) > 0 && (
                <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {cart.reduce((a, b) => a + b.qty, 0)}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 leading-none">Kasir</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('Pembelian (buyback)')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] min-h-[46px] cursor-pointer active:scale-95 ${
              activeMenu === 'Pembelian (buyback)'
                ? 'text-orange-600 font-bold bg-orange-50/80 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Scale size={19} className={activeMenu === 'Pembelian (buyback)' ? 'text-orange-600' : 'text-gray-500'} />
            <span className="text-[10px] mt-0.5 leading-none">Buyback</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('Transaksi Harian')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] min-h-[46px] cursor-pointer active:scale-95 ${
              activeMenu === 'Transaksi Harian'
                ? 'text-orange-600 font-bold bg-orange-50/80 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <ReceiptText size={19} className={activeMenu === 'Transaksi Harian' ? 'text-orange-600' : 'text-gray-500'} />
            <span className="text-[10px] mt-0.5 leading-none">Transaksi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMenu('Daftar Barang')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] min-h-[46px] cursor-pointer active:scale-95 ${
              activeMenu === 'Daftar Barang'
                ? 'text-orange-600 font-bold bg-orange-50/80 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Gem size={19} className={activeMenu === 'Daftar Barang' ? 'text-orange-600' : 'text-gray-500'} />
            <span className="text-[10px] mt-0.5 leading-none">Barang</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all text-gray-500 hover:text-gray-900 min-w-[56px] min-h-[46px] cursor-pointer active:scale-95"
          >
            <Menu size={19} />
            <span className="text-[10px] mt-0.5 leading-none">Menu</span>
          </button>
        </nav>

        {/* Global Modals & Print Elements */}
        <BarcodeScannerModal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          products={products}
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
          onViewDailyTransactions={() => setActiveMenu('Transaksi Harian')}
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

        <ScanFeedbackToast feedback={scanFeedback} />

        {/* Hidden Printable Elements for Thermal Printer (@media print) */}
        <PrintableReceipt receipt={selectedReceipt} />
        <PrintableBuybackReceipt receipt={selectedBuybackReceipt} />
      </div>
    </TooltipProvider>
  );
};

export default App;
