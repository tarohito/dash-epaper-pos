import React from 'react';
import { Receipt, Boxes, Gem, Trash2, Minus, Plus, CreditCard } from 'lucide-react';
import { CartItem } from '../../types';
import { formatIDR } from '../../utils/formatters';
import Tooltip from '../Tooltip';

interface CartPanelProps {
  cart: CartItem[];
  onUpdateQty: (id: number, delta: number) => void;
  onRemoveItem: (id: number) => void;
  subtotal: number;
  tax: number;
  grandTotal: number;
  onOpenPaymentModal: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  cart,
  onUpdateQty,
  onRemoveItem,
  subtotal,
  tax,
  grandTotal,
  onOpenPaymentModal,
}) => {
  const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div className="w-[360px] bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden shrink-0">
      {/* Cart Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-gray-800 text-sm">
          Keranjang Pesanan
        </h2>
        <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 text-[11px] font-bold rounded-full">
          {totalQty} Item
        </span>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-3">
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
                className="p-3 bg-white border border-gray-100 rounded-xl flex gap-3 group relative"
              >
                <div className="w-12 h-12 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center shrink-0">
                  <Gem size={20} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-gray-400 truncate mb-0.5">
                    {item.sku} &bull; {item.berat.toFixed(2)}g
                  </div>
                  <div className="text-xs font-semibold text-gray-800 truncate mb-1">{item.name}</div>
                  <div className="text-sm font-extrabold text-orange-600">{formatIDR(item.harga)}</div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <Tooltip content="Hapus" side="left" sideOffset={6}>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onRemoveItem(item.id);
                      }}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </Tooltip>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-0.5 mt-2">
                    <Tooltip content="Kurang" side="top" sideOffset={4}>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onUpdateQty(item.id, -1);
                        }}
                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-white rounded-md transition-all cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                    </Tooltip>
                    <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                    <Tooltip content="Tambah" side="top" sideOffset={4}>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onUpdateQty(item.id, 1);
                        }}
                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-white rounded-md transition-all cursor-pointer"
                      >
                        <Plus size={12} />
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
      <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 font-medium">Subtotal</span>
            <span className="text-gray-800 font-bold">{formatIDR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 font-medium">PPN (11%)</span>
            <span className="text-gray-800 font-bold">{formatIDR(tax)}</span>
          </div>
          <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
            <span className="text-gray-800 font-bold text-xs">Total Tagihan</span>
            <span className="text-lg font-extrabold text-orange-600">{formatIDR(grandTotal)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenPaymentModal}
          disabled={cart.length === 0}
          className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold rounded-xl transition-all flex justify-center items-center cursor-pointer disabled:cursor-not-allowed text-xs"
        >
          Proses Pembayaran ({totalQty} Item)
        </button>
      </div>
    </div>
  );
};
