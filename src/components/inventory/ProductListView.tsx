import React from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { Product } from'../../types';
import { formatIDR } from'../../utils/formatters';

interface ProductListViewProps {
  products: Product[];
  onOpenAddModal: () => void;
  onAddToCartAndOpenPos: (product: Product) => void;
}

export const ProductListView: React.FC<ProductListViewProps> = ({
  products,
  onOpenAddModal,
  onAddToCartAndOpenPos,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-5 sm:p-6 rounded-lg border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Daftar Barang & Inventaris Perhiasan</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manajemen stok fisik perhiasan emas, gramasi, kadar karat, dan penyesuaian harga jual
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddModal}
          className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer self-stretch sm:self-auto shadow-xs active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>Tambah Barang</span>
        </button>
      </div>

      {/* MOBILE LIST CARDS (md:hidden) */}
      <div className="md:hidden space-y-3">
        {products.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <img
                src={p.image}
                alt={p.name}
                className="w-14 h-14 rounded-md object-cover border border-gray-200 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-orange-600 text-xs sm:text-sm">{p.sku}</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-semibold text-xs">
                    {p.category}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 truncate">{p.name}</h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                  <span>Berat: <strong className="text-gray-800 font-mono">{p.berat.toFixed(2)}g</strong></span>
                  <span>Stok: <strong className={p.stok > 0 ? 'text-emerald-700 font-mono' : 'text-red-600 font-mono'}>{p.stok} pcs</strong></span>
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 font-medium block">Harga Jual</span>
                <span className="text-base font-bold text-gray-900 font-mono tabular-nums">{formatIDR(p.harga)}</span>
              </div>
              <button
                type="button"
                onClick={() => onAddToCartAndOpenPos(p)}
                disabled={p.stok <= 0}
                className="px-3.5 py-2 bg-orange-50 hover:bg-orange-500 hover:text-white disabled:bg-gray-100 disabled:text-gray-400 text-orange-600 font-semibold rounded-md text-xs sm:text-sm transition-colors cursor-pointer min-h-[38px] inline-flex items-center justify-center gap-1.5"
              >
                <ShoppingCart size={14} />
                <span>Masukkan Kasir</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* TABLET & DESKTOP TABLE (hidden md:block) */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase font-semibold tracking-wider text-xs">
              <tr>
                <th className="py-3.5 px-5">Foto & Nama Barang</th>
                <th className="py-3.5 px-4">SKU / Barcode</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Berat Emas</th>
                <th className="py-3.5 px-4">Stok Tersedia</th>
                <th className="py-3.5 px-4 text-right">Harga Jual</th>
                <th className="py-3.5 px-5 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-10 h-10 rounded-md object-cover border border-gray-200 shrink-0"
                      />
                      <span className="font-semibold text-gray-900 text-xs sm:text-sm">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-orange-600 text-xs sm:text-sm">{p.sku}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md font-semibold text-xs">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-800 font-mono text-xs sm:text-sm">{p.berat.toFixed(2)} gram</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${p.stok > 5 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : p.stok > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/60' : 'bg-red-50 text-red-700 border border-red-200/60'}`}
                    >
                      {p.stok} pcs {p.stok <= 3 && '(Menipis)'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-sm sm:text-base text-gray-900 font-mono tabular-nums">{formatIDR(p.harga)}</td>
                  <td className="py-3.5 px-5 text-center">
                    <button
                      type="button"
                      onClick={() => onAddToCartAndOpenPos(p)}
                      className="h-8 px-3 bg-orange-50 hover:bg-orange-500 hover:text-white text-orange-600 font-semibold rounded-md text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart size={13} />
                      <span>Masukkan Kasir</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
