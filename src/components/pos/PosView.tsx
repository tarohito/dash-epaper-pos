import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, Barcode, ShoppingCart, ArrowRight, X, Filter, ChevronDown, Loader2 } from 'lucide-react';
import { Product, CartItem } from '../../types';
import { ProductCard } from './ProductCard';
import { PromoCard } from './PromoCard';
import { CartPanel } from './CartPanel';
import { formatIDR } from '../../utils/formatters';

interface PosViewProps {
  products: Product[];
  filteredProducts: Product[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAutoScanCode: (code: string) => boolean;
  onOpenScanModal: () => void;
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateQty: (id: number, delta: number) => void;
  onRemoveItem: (id: number) => void;
  subtotal: number;
  tax: number;
  grandTotal: number;
  onOpenPaymentModal: () => void;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  filteredProducts,
  searchQuery,
  onSearchChange,
  onAutoScanCode,
  onOpenScanModal,
  cart,
  onAddToCart,
  onUpdateQty,
  onRemoveItem,
  subtotal,
  tax,
  grandTotal,
  onOpenPaymentModal,
}) => {
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');
  const [isPromoOnlyFilter, setIsPromoOnlyFilter] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

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

  const totalCartQty = useMemo(() => cart.reduce((acc, it) => acc + it.qty, 0), [cart]);
  const promoCount = useMemo(() => products.filter(p => p.isPromo).length, [products]);
  const availableCategories = useMemo(() => ['Semua', ...Array.from(new Set(products.map(p => p.category)))], [products]);

  // Filter dinamis dengan useMemo agar tidak dihitung ulang saat render yang tidak terkait
  const displayProducts = useMemo(() => {
    return filteredProducts.filter(p => {
      const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchesPromo = !isPromoOnlyFilter || p.isPromo;
      return matchesCategory && matchesPromo;
    });
  }, [filteredProducts, selectedCategory, isPromoOnlyFilter]);

  // Infinite Scroll / Chunked Lazy Loading: Hanya render batch pertama (30 item),
  // lalu tambah 30 item saat kasir scroll ke bawah. DOM tetap super ringan meski ada 10.000 produk!
  const [visibleCount, setVisibleCount] = useState(30);

  // Reset visibleCount saat filter atau pencarian berubah
  useEffect(() => {
    setVisibleCount(30);
  }, [searchQuery, selectedCategory, isPromoOnlyFilter]);

  const visibleProducts = useMemo(() => {
    return displayProducts.slice(0, visibleCount);
  }, [displayProducts, visibleCount]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver untuk trigger infinite scroll otomatis tanpa lag
  useEffect(() => {
    if (visibleCount >= displayProducts.length) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + 30, displayProducts.length));
        }
      },
      { rootMargin: '200px' }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [visibleCount, displayProducts.length]);

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full gap-2 sm:gap-3 relative overflow-hidden">
      {/* Mobile/Tablet Segmented View Switcher */}
      <div className="lg:hidden flex items-center p-1 bg-gray-200/80 rounded-md shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] ${
            mobileTab ==='catalog'
              ?'bg-white text-gray-900 shadow-xs'
              :'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>Katalog Produk</span>
          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full font-semibold">
            {filteredProducts.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] ${
            mobileTab ==='cart'
              ?'bg-white text-gray-900 shadow-xs'
              :'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ShoppingCart size={15} className={mobileTab ==='cart' ?'text-orange-500' :''} />
          <span>Keranjang</span>
          {totalCartQty > 0 && (
            <span className="text-xs px-2 py-0.5 bg-orange-500 text-white rounded-full font-bold font-mono">
              {totalCartQty}
            </span>
          )}
        </button>
      </div>

      {/* Catalog Panel: visible always on desktop, and on mobile when mobileTab ==='catalog' */}
      <div
        className={`flex-1 min-h-0 flex flex-col min-w-0 bg-white rounded-lg border border-gray-200 overflow-hidden ${
          mobileTab ==='cart' ?'hidden lg:flex' :'flex'
        }`}
      >
        {/* Search & Action Bar */}
        <div className="p-2.5 sm:p-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Button Simpel Filter Kategori (Di Samping Kiri Pencarian) */}
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
                    const count =
                      cat === 'Semua'
                        ? products.length
                        : products.filter(p => p.category === cat).length;
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
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="text"
              placeholder="Cari perhiasan atau scan barcode..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAutoScanCode(searchQuery);
                }
              }}
              className="h-9 w-full pl-9 sm:pl-10 pr-8 rounded-lg border border-gray-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-xs sm:text-sm font-medium bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                title="Hapus kata kunci"
              >
                <X size={14} />
              </button>
            )}
          </div>

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

        {/* Active Filters Banner (Category & Promo) */}
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
              <span className="text-xs text-gray-500">
                ({displayProducts.length} produk ditemukan)
              </span>
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

        {/* Product Grid (Responsive 2 columns on mobile, 3 on tablet, 3-4 on desktop) */}
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

          {visibleProducts.map(product => (
            <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
          ))}

          {/* Sentinel Element untuk auto-trigger load batch berikutnya saat scrolling */}
          {visibleCount < displayProducts.length && (
            <div ref={loadMoreRef} className="col-span-full py-6 flex items-center justify-center text-xs text-gray-400 gap-2">
              <Loader2 size={16} className="animate-spin text-orange-500" />
              <span>Memuat produk lainnya ({visibleProducts.length} dari {displayProducts.length})...</span>
            </div>
          )}

          {displayProducts.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-400">
              <p className="text-sm font-medium">Tidak ada produk yang cocok dengan pencarian.</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel: visible always on desktop, and on mobile when mobileTab ==='cart' */}
      <div className={`min-h-0 ${mobileTab ==='catalog' ?'hidden lg:flex lg:shrink-0 lg:h-full' :'flex-1 min-h-0 flex flex-col'}`}>
        <CartPanel
          cart={cart}
          onUpdateQty={onUpdateQty}
          onRemoveItem={onRemoveItem}
          subtotal={subtotal}
          tax={tax}
          grandTotal={grandTotal}
          onOpenPaymentModal={onOpenPaymentModal}
          onBackToCatalog={() => setMobileTab('catalog')}
        />
      </div>

      {/* Floating Bottom Cart Bar for Tablet & Mobile (when in catalog tab and cart has items) */}
      {mobileTab ==='catalog' && totalCartQty > 0 && (
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
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold bg-white text-orange-600 px-3 py-1.5 rounded-md">
              <span>Buka Keranjang</span>
              <ArrowRight size={14} />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
