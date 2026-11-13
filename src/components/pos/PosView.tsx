import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Barcode, X, Filter, ChevronDown, Loader2 } from 'lucide-react';
import { Product, CartItem } from '../../types';
import { ProductCard } from './ProductCard';
import { PromoCard } from './PromoCard';
import { CartPanel } from './CartPanel';
import { formatIDR } from '../../utils/formatters';
import { posApi } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { SearchInput } from '../common/SearchInput';
import { ConfirmModal } from '../common/ConfirmModal';
import { ErrorBanner } from '../common/ErrorBanner';
import { useToast } from '../../contexts/ToastContext';

interface PosViewProps {
  categories: string[];
  refreshTrigger: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAutoScanCode: (code: string) => Promise<Product | null>;
  onOpenScanModal: () => void;
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateQty: (id: number, delta: number) => void;
  onRemoveItem: (id: number) => void;
  onClearCart?: () => void;
  subtotal: number;
  tax: number;
  taxLabel?: string;
  grandTotal: number;
  onOpenPaymentModal: () => void;
}

const POS_PAGE_SIZE = 24;

export const PosView: React.FC<PosViewProps> = ({
  categories,
  refreshTrigger,
  searchQuery,
  onSearchChange,
  onAutoScanCode,
  onOpenScanModal,
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  subtotal,
  tax,
  taxLabel,
  grandTotal,
  onOpenPaymentModal,
}) => {
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');
  const [isPromoOnlyFilter, setIsPromoOnlyFilter] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(searchQuery, 200);

  // Server-side paginated catalog state
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [promoCount, setPromoCount] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pendingRemoveItem, setPendingRemoveItem] = useState<CartItem | null>(null);
  const [isConfirmClearCart, setIsConfirmClearCart] = useState(false);
  const { showToast } = useToast();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryDropdownOpen]);

  // Fetch page 1 whenever filters, search, or refreshTrigger changes
  useEffect(() => {
    const controller = new AbortController();
    setIsInitialLoading(true);
    setFetchError(null);
    setPage(1);

    posApi
      .getProducts(
        {
          page: 1,
          pageSize: POS_PAGE_SIZE,
          search: debouncedSearch,
          category: selectedCategory,
          promoOnly: isPromoOnlyFilter,
        },
        controller.signal
      )
      .then(res => {
        setProducts(res.items);
        setTotalFiltered(res.total);
        setTotalPages(res.totalPages);
        setPromoCount(res.promoCount);
        setCategoryCounts(res.categoryCounts);
        setIsInitialLoading(false);
      })
      .catch(err => {
        if ((err as Error).name !== 'AbortError') {
          const msg = err instanceof Error ? err.message : 'Gagal memuat katalog produk.';
          setFetchError(msg);
          setIsInitialLoading(false);
          showToast('error', msg);
        }
      });

    return () => controller.abort();
  }, [debouncedSearch, selectedCategory, isPromoOnlyFilter, refreshTrigger, retryCount, showToast]);

  const loadNextPage = useCallback(async () => {
    if (isLoadingMore || isInitialLoading || page >= totalPages) return;
    const nextPage = page + 1;
    setIsLoadingMore(true);
    try {
      const res = await posApi.getProducts({
        page: nextPage,
        pageSize: POS_PAGE_SIZE,
        search: debouncedSearch,
        category: selectedCategory,
        promoOnly: isPromoOnlyFilter,
      });
      setProducts(prev => {
        const seen = new Set(prev.map(p => p.id));
        const uniqueNext = res.items.filter(p => !seen.has(p.id));
        return [...prev, ...uniqueNext];
      });
      setPage(nextPage);
      setTotalFiltered(res.total);
      setTotalPages(res.totalPages);
      setPromoCount(res.promoCount);
      setCategoryCounts(res.categoryCounts);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        showToast('error', err instanceof Error ? err.message : 'Gagal memuat halaman produk berikutnya.');
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, isInitialLoading, page, totalPages, debouncedSearch, selectedCategory, isPromoOnlyFilter, showToast]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (page >= totalPages || isInitialLoading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [page, totalPages, isInitialLoading, loadNextPage]);

  const totalCartQty = useMemo(() => cart.reduce((acc, it) => acc + it.qty, 0), [cart]);
  const availableCategories = useMemo(
    () => ['Semua', ...Array.from(new Set([...categories, ...Object.keys(categoryCounts).filter(k => k !== 'Semua')]))],
    [categories, categoryCounts]
  );

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full gap-2 sm:gap-3 relative overflow-hidden">
      {/* Mobile/Tablet Segmented View Switcher */}
      <div className="lg:hidden flex items-center p-1 bg-gray-200/80 rounded-md shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] ${
            mobileTab === 'catalog'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>Katalog Produk</span>
          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full font-semibold">
            {totalFiltered}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] ${
            mobileTab === 'cart'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>Keranjang</span>
          {totalCartQty > 0 && (
            <span className="text-xs px-2 py-0.5 bg-orange-500 text-white rounded-full font-bold font-mono">
              {totalCartQty}
            </span>
          )}
        </button>
      </div>

      {/* Catalog Panel */}
      <div
        className={`flex-1 min-h-0 flex flex-col min-w-0 bg-white rounded-lg border border-gray-200 overflow-hidden ${
          mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Search & Action Bar */}
        <div className="p-2.5 sm:p-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Button Filter Kategori */}
          <div className="relative" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className={`h-9 px-3 rounded-lg border text-xs sm:text-sm font-semibold inline-flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                selectedCategory !== 'Semua'
                  ? 'bg-orange-50 border-orange-300 text-orange-600'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-orange-400 hover:text-orange-600'
              }`}
              title="Filter Kategori Perhiasan"
            >
              <Filter size={13} className="mr-1.5 shrink-0 opacity-70" />
              <span className="max-w-[70px] sm:max-w-[110px] truncate">
                {selectedCategory === 'Semua' ? 'Kategori' : selectedCategory}
              </span>
              <ChevronDown size={13} className="ml-1 shrink-0 opacity-60" />
            </button>

            {/* Dropdown Menu Kategori */}
            {isCategoryDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-48 bg-white rounded-lg border border-gray-200 py-1 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 flex items-center justify-between">
                  <span>Pilih Kategori</span>
                  {selectedCategory !== 'Semua' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('Semua');
                        setIsCategoryDropdownOpen(false);
                      }}
                      className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {availableCategories.map(cat => {
                    const count = categoryCounts[cat] ?? 0;
                    const isSelected = selectedCategory === cat;

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-xs sm:text-sm flex items-center justify-between text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-orange-50 text-orange-600 font-bold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate">{cat === 'Semua' ? 'Semua Kategori' : cat}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            isSelected
                              ? 'bg-orange-200/80 text-orange-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Search Input */}
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Cari perhiasan atau scan barcode..."
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void onAutoScanCode(searchQuery);
              }
            }}
          />

          {/* Scan Barcode Button */}
          <button
            type="button"
            onClick={onOpenScanModal}
            className="h-9 px-3.5 bg-white border border-gray-200 hover:border-orange-500 hover:text-orange-600 rounded-lg text-gray-700 text-xs sm:text-sm font-semibold inline-flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
            title="Buka Scanner Barcode"
          >
            <Barcode size={16} className="mr-1.5 text-orange-600 shrink-0" />
            <span className="hidden sm:inline">Scan Barcode</span>
            <span className="sm:hidden text-xs">Scan</span>
          </button>
        </div>

        {/* Active Filters Banner */}
        {(selectedCategory !== 'Semua' || isPromoOnlyFilter) && (
          <div className="bg-orange-50/70 border-b border-orange-100 px-3 py-2 flex items-center justify-between text-xs sm:text-sm text-orange-950 shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-500 font-medium">Filter Aktif:</span>
              {selectedCategory !== 'Semua' && (
                <span className="inline-flex items-center gap-1 bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded text-xs font-semibold">
                  Kategori: {selectedCategory}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('Semua')}
                    className="hover:text-red-500 ml-0.5 cursor-pointer"
                    title="Hapus filter kategori"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {isPromoOnlyFilter && (
                <span className="inline-flex items-center gap-1 bg-yellow-400 text-gray-950 px-2 py-0.5 rounded text-xs font-bold">
                  Khusus Promo ({promoCount} item)
                  <button
                    type="button"
                    onClick={() => setIsPromoOnlyFilter(false)}
                    className="hover:text-red-600 ml-0.5 cursor-pointer"
                    title="Hapus filter promo"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              <span className="text-xs text-gray-500">({totalFiltered} produk ditemukan)</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedCategory('Semua');
                setIsPromoOnlyFilter(false);
              }}
              className="text-xs font-semibold text-orange-600 hover:text-orange-800 hover:underline cursor-pointer"
            >
              Reset Semua Filter
            </button>
          </div>
        )}

        {/* Product Grid */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3.5 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3.5 auto-rows-max ${
            totalCartQty > 0 ? 'pb-20 lg:pb-3.5' : ''
          }`}
        >
          {/* Card Promo Kuning Solid */}
          <PromoCard
            promoCount={promoCount}
            isActiveFilter={isPromoOnlyFilter}
            onToggleFilter={() => setIsPromoOnlyFilter(!isPromoOnlyFilter)}
          />

          {isInitialLoading && products.length === 0 ? (
            <div className="col-span-full py-12 flex items-center justify-center text-xs text-gray-400 gap-2">
              <Loader2 size={18} className="animate-spin text-orange-500" />
              <span>Memuat katalog perhiasan...</span>
            </div>
          ) : (
            products.map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
            ))
          )}

          {/* Sentinel Element untuk auto-load halaman berikutnya dari server */}
          {page < totalPages && !isInitialLoading && (
            <div ref={loadMoreRef} className="col-span-full py-6 flex items-center justify-center text-xs text-gray-400 gap-2">
              <Loader2 size={16} className="animate-spin text-orange-500" />
              <span>
                Memuat produk lainnya ({products.length} dari {totalFiltered})...
              </span>
            </div>
          )}

          {fetchError && (
            <div className="col-span-full">
              <ErrorBanner message={fetchError} onRetry={() => setRetryCount(c => c + 1)} />
            </div>
          )}

          {!isInitialLoading && !fetchError && products.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-400">
              <p className="text-sm font-medium">Tidak ada produk yang cocok dengan pencarian.</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div className={`min-h-0 ${mobileTab === 'catalog' ? 'hidden lg:flex lg:shrink-0 lg:h-full' : 'flex-1 min-h-0 flex flex-col'}`}>
        <CartPanel
          cart={cart}
          onUpdateQty={onUpdateQty}
          onRemoveItem={id => {
            const target = cart.find(c => c.id === id);
            if (target) setPendingRemoveItem(target);
          }}
          onClearCart={onClearCart ? () => setIsConfirmClearCart(true) : undefined}
          subtotal={subtotal}
          tax={tax}
          taxLabel={taxLabel}
          grandTotal={grandTotal}
          onOpenPaymentModal={onOpenPaymentModal}
          onBackToCatalog={() => setMobileTab('catalog')}
        />
      </div>

      {/* Floating Bottom Cart Bar for Tablet & Mobile */}
      {mobileTab === 'catalog' && totalCartQty > 0 && (
        <div className="lg:hidden absolute bottom-2 inset-x-2 z-30 animate-in slide-in-from-bottom duration-200">
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 rounded-lg flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center font-bold text-xs sm:text-sm font-mono">
                {totalCartQty}
              </div>
              <div className="text-left">
                <p className="text-xs text-orange-100 font-semibold leading-none">Total Tagihan ({totalCartQty} item)</p>
                <p className="text-base font-bold font-mono tracking-tight mt-0.5">{formatIDR(grandTotal)}</p>
              </div>
            </div>
            <div className="flex items-center text-xs sm:text-sm font-semibold bg-white text-orange-600 px-3 py-1.5 rounded-md">
              Buka Keranjang
            </div>
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={!!pendingRemoveItem}
        title="Hapus Item dari Keranjang"
        description={
          pendingRemoveItem
            ? `Apakah Anda yakin ingin menghapus "${pendingRemoveItem.name}" (${pendingRemoveItem.qty} pcs) dari keranjang pesanan?`
            : ''
        }
        confirmLabel="Ya, Hapus Item"
        onCancel={() => setPendingRemoveItem(null)}
        onConfirm={() => {
          if (pendingRemoveItem) {
            onRemoveItem(pendingRemoveItem.id);
            setPendingRemoveItem(null);
          }
        }}
      />

      <ConfirmModal
        isOpen={isConfirmClearCart}
        title="Kosongkan Keranjang Pesanan"
        description={`Apakah Anda yakin ingin menghapus seluruh ${totalCartQty} item dari keranjang pesanan?`}
        confirmLabel="Ya, Kosongkan"
        onCancel={() => setIsConfirmClearCart(false)}
        onConfirm={() => {
          onClearCart?.();
          setIsConfirmClearCart(false);
        }}
      />
    </div>
  );
};
