import React from 'react';
import { Search, Barcode } from 'lucide-react';
import { Product, CartItem } from '../../types';
import { ProductCard } from './ProductCard';
import { CartPanel } from './CartPanel';

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
  return (
    <div className="flex h-full gap-4">
      {/* Left Panel: Catalog */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Search & Action Bar */}
        <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2.5 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari perhiasan atau scan barcode SKU... (Enter untuk scan)"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAutoScanCode(searchQuery);
                }
              }}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-xs font-medium bg-white"
            />
          </div>
          <button
            type="button"
            onClick={onOpenScanModal}
            className="px-3.5 py-2.5 bg-white border border-gray-200 hover:border-orange-500 hover:text-orange-600 rounded-xl text-gray-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Buka Scanner Barcode (Kamera & Tag)"
          >
            <Barcode size={16} className="text-orange-500" />
            <span>Scan Barcode</span>
          </button>
        </div>

        {/* Product Grid (Dinamis Otomatis Menyesuaikan Ukuran Lebar Layar) */}
        <div className="flex-1 overflow-y-auto p-3.5 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5 auto-rows-max">
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

      {/* Right Panel: Cart */}
      <CartPanel
        cart={cart}
        onUpdateQty={onUpdateQty}
        onRemoveItem={onRemoveItem}
        subtotal={subtotal}
        tax={tax}
        grandTotal={grandTotal}
        onOpenPaymentModal={onOpenPaymentModal}
      />
    </div>
  );
};
