import React, { useState } from'react';
import { FolderTree, X } from'lucide-react';

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
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-orange-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500 text-white flex items-center justify-center">
              <FolderTree size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">Tambah Kategori Baru</h3>
              <p className="text-xs text-gray-500">Buat klasifikasi etalase perhiasan emas baru</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Nama Kategori Perhiasan</label>
            <input
              type="text"
              required
              autoFocus
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              placeholder="Cth: Cincin Tunangan, Gelang Kaki, dsb..."
              className="w-full px-4 py-3 text-sm font-semibold bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              Kategori baru akan langsung tersedia di filter etalase dan formulir tambah produk.
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-xs rounded-md transition-all cursor-pointer"
            >
              Simpan Kategori
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
