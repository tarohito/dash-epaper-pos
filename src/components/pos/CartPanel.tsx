import React from'react';
import { Receipt, Boxes, Gem, Trash2, Minus, Plus, CreditCard } from'lucide-react';
import { CartItem } from'../../types';
import { formatIDR } from'../../utils/formatters';
import Tooltip from'../Tooltip';

interface CartPanelProps {
  cart: CartItem[];
  onUpdateQty: (id: number, delta: number) => void;
  onRemoveItem: (id: number) => void;
  subtotal: number;
  tax: number;
  grandTotal: number;
  onOpenPaymentModal: () => void;
  onBackToCatalog?: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  cart,
  onUpdateQty,
  onRemoveItem,
  subtotal,
  tax,
  grandTotal,
  onOpenPaymentModal,
  onBackToCatalog,
}) => {
  const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div className="w-full lg:w-[340px] xl:w-[370px] bg-white rounded-lg border border-gray-200 flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Cart Header */}
      <div className="p-3 sm:p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/60">
        <div className="flex items-center gap-2">
          {onBackToCatalog && (
            <button
              type="button"
              onClick={onBackToCatalog}
              className="lg:hidden p-1.5 -ml-1 text-gray-500 hover:text-orange-600 rounded-md min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
              title="Kembali ke Katalog"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <h2 className="font-bold text-gray-900 text-sm sm:text-base">
            Keranjang Pesanan
          </h2>
        </div>
        <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded">
          {totalQty} Item
        </span>
      </div>

      {/* Cart Items */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Boxes size={48} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">Belum ada produk di keranjang</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cart.map(item => (
              <div
                key={item.id}
                className="p-3 bg-white border border-gray-100 rounded-md flex gap-3 group relative"
              >
                <div className="w-12 h-12 bg-gray-50 rounded-md border border-gray-100 flex items-center justify-center shrink-0">
                  <Gem size={20} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="text-xs font-mono font-medium text-gray-500 truncate mb-0.5">
                    {item.sku} &bull; {item.berat.toFixed(2)}g
                  </div>
                  <div className="text-sm font-semibold text-gray-900 truncate mb-1">{item.name}</div>
                  <div className="text-sm font-bold font-mono text-orange-600">{formatIDR(item.harga)}</div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <Tooltip content="Hapus" side="left" sideOffset={6}>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onRemoveItem(item.id);
                      }}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
                      aria-label="Hapus item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </Tooltip>
                  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-md p-1 mt-1.5">
                    <Tooltip content="Kurang" side="top" sideOffset={4}>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onUpdateQty(item.id, -1);
                        }}
                        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white rounded transition-all cursor-pointer active:scale-95"
                        aria-label="Kurang satu"
                      >
                        <Minus size={13} />
                      </button>
                    </Tooltip>
                    <span className="text-sm font-bold font-mono w-6 text-center tabular-nums">{item.qty}</span>
                    <Tooltip content="Tambah" side="top" sideOffset={4}>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onUpdateQty(item.id, 1);
                        }}
                        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white rounded transition-all cursor-pointer active:scale-95"
                        aria-label="Tambah satu"
                      >
                        <Plus size={13} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Totals */}
      <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <div className="space-y-1 sm:space-y-1.5 mb-2.5 sm:mb-3">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-600 font-medium">Subtotal</span>
            <span className="text-gray-900 font-semibold font-mono tabular-nums">{formatIDR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-600 font-medium">PPN (11%)</span>
            <span className="text-gray-900 font-semibold font-mono tabular-nums">{formatIDR(tax)}</span>
          </div>
          <div className="pt-1.5 sm:pt-2 border-t border-gray-200 flex justify-between items-center">
            <span className="text-gray-900 font-bold text-sm sm:text-base">Total Tagihan</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-orange-600 tabular-nums">{formatIDR(grandTotal)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenPaymentModal}
          disabled={cart.length === 0}
          className="w-full h-11 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold rounded-lg transition-all inline-flex justify-center items-center cursor-pointer disabled:cursor-not-allowed text-sm active:scale-[0.99] shadow-xs"
        >
          <CreditCard size={18} className="mr-2 shrink-0" />
          <span>Proses Pembayaran ({totalQty} Item)</span>
        </button>
      </div>
    </div>
  );
};
