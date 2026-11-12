import React from'react';
import { Gem } from 'lucide-react';
import { Product } from'../../types';

interface CategoryListViewProps {
  categories: string[];
  products: Product[];
  onOpenAddCategoryModal: () => void;
}

export const CategoryListView: React.FC<CategoryListViewProps> = ({
  categories,
  products,
  onOpenAddCategoryModal,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Daftar Kategori Perhiasan</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Pengelompokan etalase perhiasan emas berdasarkan jenis produk
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddCategoryModal}
          className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer self-stretch sm:self-auto shadow-xs active:scale-[0.98]"
        >
          Tambah Daftar Kategori
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
        {categories.map(cat => {
          const itemsInCat = products.filter(p => p.category === cat);
          const totalStok = itemsInCat.reduce((acc, it) => acc + it.stok, 0);
          const totalGram = itemsInCat.reduce((acc, it) => acc + it.berat * it.stok, 0);
          return (
            <div
              key={cat}
              className="bg-white p-5 rounded-lg border border-gray-200 hover:border-orange-500 transition-all shadow-xs"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-orange-50 text-orange-600 rounded-lg font-bold">
                  <Gem size={20} />
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full font-mono">
                  {itemsInCat.length} Model SKU
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-gray-900">{cat}</h3>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs sm:text-sm text-gray-500">
                <span>
                  Total Stok: <strong className="text-gray-800 font-mono">{totalStok} pcs</strong>
                </span>
                <span>
                  Gramasi: <strong className="text-orange-600 font-mono">{totalGram.toFixed(2)}g</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
