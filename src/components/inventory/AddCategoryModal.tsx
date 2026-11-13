import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategory?: string | null;
  onSaveCategory: (categoryName: string, oldName?: string) => Promise<void> | void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  editingCategory,
  onSaveCategory,
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setCategoryName(editingCategory || '');
      setErrorMsg(null);
    }
  }, [isOpen, editingCategory]);

  if (!isOpen) return null;

  const failValidation = (msg: string) => {
    setErrorMsg(msg);
    showToast('error', msg, 'Validasi Form Kategori');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = categoryName.trim();
    if (!trimmed) {
      failValidation('Nama kategori wajib diisi.');
      return;
    }
    if (trimmed.length < 2) {
      failValidation('Nama kategori minimal 2 karakter.');
      return;
    }
    if (editingCategory && trimmed === editingCategory) {
      failValidation('Nama kategori baru tidak boleh sama dengan nama sebelumnya.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSaveCategory(trimmed, editingCategory || undefined);
      setCategoryName('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan kategori.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight">
              {editingCategory ? 'Edit Nama Kategori' : 'Tambah Kategori Baru'}
            </h3>
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
        <form noValidate onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

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
              {editingCategory
                ? 'Perubahan nama kategori akan otomatis diperbarui pada seluruh produk terkait.'
                : 'Kategori baru akan langsung tersedia di filter etalase dan formulir tambah produk.'}
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center shadow-xs"
            >
              <X size={15} className="mr-1.5 text-gray-500" />
              <span>Batal</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98]"
            >
              <Save size={15} />
              <span>{isSubmitting ? 'Menyimpan...' : editingCategory ? 'Simpan Perubahan' : 'Simpan Kategori'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
