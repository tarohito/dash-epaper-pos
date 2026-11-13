import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import {
  ModalShell,
  MODAL_FOOTER_END_CLASS,
  MODAL_BTN_SECONDARY_CLASS,
  MODAL_BTN_PRIMARY_CLASS,
} from '../common/ModalShell';

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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
      subtitle="Kelompokkan jenis perhiasan di etalase"
      disableEscapeClose={isSubmitting}
      footer={
        <div className={MODAL_FOOTER_END_CLASS}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={MODAL_BTN_SECONDARY_CLASS}
          >
            <X size={15} className="text-gray-500 shrink-0" />
            <span>Batal</span>
          </button>
          <button
            type="submit"
            form="category-form"
            disabled={isSubmitting}
            className={MODAL_BTN_PRIMARY_CLASS}
          >
            <Save size={15} className="shrink-0" />
            <span>{isSubmitting ? 'Menyimpan...' : editingCategory ? 'Simpan Perubahan' : 'Simpan Kategori'}</span>
          </button>
        </div>
      }
    >
      <form id="category-form" noValidate onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
            Nama Kategori Perhiasan
          </label>
          <input
            type="text"
            required
            autoFocus
            value={categoryName}
            onChange={e => setCategoryName(e.target.value)}
            placeholder="Cth: Cincin Tunangan, Gelang Kaki, dsb..."
            className="w-full px-4 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-500 focus:bg-white"
          />
          <p className="text-xs text-gray-500 mt-1.5">
            {editingCategory
              ? 'Perubahan nama kategori akan otomatis diperbarui pada seluruh produk terkait.'
              : 'Kategori baru akan langsung tersedia di filter etalase dan formulir tambah produk.'}
          </p>
        </div>
      </form>
    </ModalShell>
  );
};
