import React, { useState } from'react';
import { X } from 'lucide-react';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCategory: (categoryName: string) => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onSaveCategory,
}) => {
  const [categoryName, setCategoryName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = categoryName.trim();
    if (!trimmed) {
      alert('Harap masukkan nama kategori.');
      return;
    }
    onSaveCategory(trimmed);
    setCategoryName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight">Tambah Kategori Baru</h3>
            <p className="text-xs text-gray-500 mt-0.5">Klasifikasi etalase dan jenis perhiasan emas</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Nama Kategori Perhiasan</label>
            <input
              type="text"
              required
              autoFocus
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              placeholder="Cth: Cincin Tunangan, Gelang Kaki, dsb..."
              className="w-full px-4 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Kategori baru akan langsung tersedia di filter etalase dan formulir tambah produk.
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center shadow-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center shadow-xs active:scale-[0.98]"
            >
              Simpan Kategori
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
