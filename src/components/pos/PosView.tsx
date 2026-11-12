import React, { useState } from 'react';
import { Search, Barcode, ShoppingCart, ArrowRight } from 'lucide-react';
import { Product, CartItem } from '../../types';
import { ProductCard } from './ProductCard';
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
  const totalCartQty = cart.reduce((acc, it) => acc + it.qty, 0);

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full gap-2 sm:gap-3 relative overflow-hidden">
      {/* Mobile/Tablet Segmented View Switcher */}
      <div className="lg:hidden flex items-center p-1 bg-gray-200/80 rounded-xl shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] ${
            mobileTab === 'catalog'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>Katalog Produk</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-gray-100 rounded-full font-semibold">
            {filteredProducts.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] ${
            mobileTab === 'cart'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ShoppingCart size={14} className={mobileTab === 'cart' ? 'text-orange-500' : ''} />
          <span>Keranjang</span>
          {totalCartQty > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 bg-orange-500 text-white rounded-full font-bold">
              {totalCartQty}
            </span>
          )}
        </button>
      </div>

      {/* Catalog Panel: visible always on desktop, and on mobile when mobileTab === 'catalog' */}
      <div
        className={`flex-1 min-h-0 flex flex-col min-w-0 bg-white rounded-2xl border border-gray-200 overflow-hidden ${
          mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Search & Action Bar */}
        <div className="p-2.5 sm:p-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2 sm:gap-2.5 shrink-0">
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
              className="w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 rounded-xl border border-gray-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-xs font-medium bg-white"
            />
          </div>
          <button
            type="button"
            onClick={onOpenScanModal}
            className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-white border border-gray-200 hover:border-orange-500 hover:text-orange-600 rounded-xl text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 min-h-[38px]"
            title="Buka Scanner Barcode"
          >
            <Barcode size={16} className="text-orange-500" />
            <span className="hidden sm:inline">Scan Barcode</span>
            <span className="sm:hidden text-[11px]">Scan</span>
          </button>
        </div>

        {/* Product Grid (Responsive 2 columns on mobile, 3 on tablet, 3-4 on desktop) */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3.5 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3.5 auto-rows-max ${
            totalCartQty > 0 ? 'pb-20 lg:pb-3.5' : ''
          }`}
        >
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-400">
              <p className="text-sm font-medium">Tidak ada produk yang cocok dengan pencarian.</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel: visible always on desktop, and on mobile when mobileTab === 'cart' */}
      <div className={`min-h-0 ${mobileTab === 'catalog' ? 'hidden lg:flex lg:shrink-0 lg:h-full' : 'flex-1 min-h-0 flex flex-col'}`}>
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
      {mobileTab === 'catalog' && totalCartQty > 0 && (
        <div className="lg:hidden absolute bottom-2 inset-x-2 z-30 animate-in slide-in-from-bottom duration-200">
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xs">
                {totalCartQty}
              </div>
              <div className="text-left">
                <p className="text-[10px] text-orange-100 font-semibold leading-none">Total Tagihan ({totalCartQty} item)</p>
                <p className="text-sm font-black tracking-tight">{formatIDR(grandTotal)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold bg-white text-orange-600 px-3 py-1.5 rounded-xl shadow-xs">
              <span>Buka Keranjang</span>
              <ArrowRight size={14} />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
