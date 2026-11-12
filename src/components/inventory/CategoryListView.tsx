import React from 'react';
import { Plus, Gem } from 'lucide-react';
import { Product } from '../../types';

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
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Daftar Kategori Perhiasan</h1>
          <p className="text-xs text-gray-500">
            Pengelompokan etalase perhiasan emas berdasarkan jenis produk
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddCategoryModal}
          className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} />
          Tambah Daftar Kategori
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map(cat => {
          const itemsInCat = products.filter(p => p.category === cat);
          const totalStok = itemsInCat.reduce((acc, it) => acc + it.stok, 0);
          const totalGram = itemsInCat.reduce((acc, it) => acc + it.berat * it.stok, 0);
          return (
            <div
              key={cat}
              className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-orange-500 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 bg-orange-50 text-orange-600 rounded-xl font-bold">
                  <Gem size={20} />
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                  {itemsInCat.length} Model SKU
                </span>
              </div>
              <h3 className="font-extrabold text-base text-gray-900">{cat}</h3>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Total Stok Fisik: <strong className="text-gray-800">{totalStok} pcs</strong>
                </span>
                <span>
                  Gramasi Total: <strong className="text-orange-600">{totalGram.toFixed(2)}g</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
