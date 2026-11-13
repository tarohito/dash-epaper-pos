import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Product } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { NumericInput } from '../common/NumericInput';
import { generateJewelrySku, isValidCode128 } from '../../utils/barcode';
import { JewelryBarcodeTag } from '../common/JewelryBarcodeTag';
import { useToast } from '../../contexts/ToastContext';
import {
  ModalShell,
  MODAL_FOOTER_END_CLASS,
  MODAL_BTN_SECONDARY_CLASS,
  MODAL_BTN_PRIMARY_CLASS,
} from '../common/ModalShell';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  editingProduct?: Product | null;
  onSaveProduct: (productData: Omit<Product, 'id'>, editId?: number) => Promise<void> | void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  categories,
  editingProduct,
  onSaveProduct,
}) => {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: categories[0] || 'Cincin',
    berat: '2.50',
    harga: '3500000',
    stok: '10',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80',
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      const defaultCategory = categories[0] || 'Cincin';
      if (editingProduct) {
        setFormData({
          sku: editingProduct.sku,
          name: editingProduct.name,
          category: editingProduct.category || defaultCategory,
          berat: String(editingProduct.berat),
          harga: String(editingProduct.harga),
          stok: String(editingProduct.stok),
          image: editingProduct.image,
        });
      } else {
        setFormData({
          sku: generateJewelrySku(defaultCategory, ''),
          name: '',
          category: defaultCategory,
          berat: '2.50',
          harga: '3500000',
          stok: '10',
          image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80',
        });
      }
    }
  }, [isOpen, editingProduct, categories]);

  const handleRegenerateSku = () => {
    setFormData(prev => ({
      ...prev,
      sku: generateJewelrySku(prev.category, prev.name),
    }));
  };

  const failValidation = (msg: string) => {
    setErrorMsg(msg);
    showToast('error', msg, 'Validasi Form Barang');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanSku = formData.sku.trim().toUpperCase();
    const cleanName = formData.name.trim();
    if (!cleanSku) {
      failValidation('SKU / Barcode barang wajib diisi.');
      return;
    }
    if (!isValidCode128(cleanSku)) {
      failValidation('SKU barcode hanya boleh berisi huruf, angka, dan tanda hubung standar ASCII (Code 128).');
      return;
    }
    if (!cleanName || cleanName.length < 2) {
      failValidation('Nama perhiasan emas wajib diisi (minimal 2 karakter).');
      return;
    }
    if (!formData.category.trim()) {
      failValidation('Kategori perhiasan wajib dipilih.');
      return;
    }

    const beratNum = parseFloat(formData.berat);
    const hargaNum = parseFloat(String(formData.harga).replace(/[^0-9]/g, ''));
    const stokRaw = String(formData.stok).trim();
    const stokNum = parseInt(stokRaw, 10);

    if (Number.isNaN(beratNum) || beratNum <= 0) {
      failValidation('Berat barang harus lebih dari 0 gram.');
      return;
    }
    if (Number.isNaN(hargaNum) || hargaNum <= 0) {
      failValidation('Harga jual harus lebih dari Rp 0.');
      return;
    }
    if (stokRaw === '' || Number.isNaN(stokNum) || stokNum < 0) {
      failValidation('Jumlah stok tidak valid (minimal 0 pcs).');
      return;
    }

    const cleanImage = formData.image.trim();
    if (
      cleanImage &&
      !/^(https?:\/\/|data:image\/|\/)/i.test(cleanImage)
    ) {
      failValidation('URL foto produk tidak valid. Gunakan awalan http:// atau https://.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveProduct(
        {
          sku: cleanSku,
          name: cleanName,
          category: formData.category,
          berat: beratNum,
          harga: hargaNum,
          stok: stokNum,
          image:
            cleanImage ||
            'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80',
        },
        editingProduct?.id
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan produk.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewBerat = parseFloat(formData.berat) || 0;
  const previewHarga = parseFloat(String(formData.harga).replace(/[^0-9]/g, '')) || 0;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={editingProduct ? 'Edit Barang Perhiasan' : 'Tambah Barang Baru'}
      subtitle={
        editingProduct
          ? `Perbarui data barang SKU ${editingProduct.sku}`
          : 'Tambahkan koleksi perhiasan ke inventaris'
      }
      disableEscapeClose={isSubmitting}
      footer={
        <div className={MODAL_FOOTER_END_CLASS}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={MODAL_BTN_SECONDARY_CLASS}
          >
            Batal
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={isSubmitting}
            className={MODAL_BTN_PRIMARY_CLASS}
          >
            {isSubmitting ? 'Menyimpan...' : editingProduct ? 'Simpan Perubahan' : 'Simpan Barang'}
          </button>
        </div>
      }
    >
      <form id="product-form" noValidate onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                  SKU / Barcode (Code 128)
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateSku}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer inline-flex items-center gap-1"
                  title="Generate kode SKU standar toko emas (Kadar-Kategori-Urut)"
                >
                  <RefreshCw size={12} className="shrink-0" />
                  <span>Auto SKU</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="Cth: 22K-CN-418"
                className="w-full px-3.5 py-2.5 text-sm font-mono font-bold bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white uppercase"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Kategori Perhiasan
              </label>
              <CustomSelect
                value={formData.category}
                onChange={val => setFormData({ ...formData, category: val })}
                options={categories}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
              Nama Perhiasan Emas
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Cth: Cincin Solitaire Berlian 18K"
              className="w-full px-3.5 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Berat (gram)
              </label>
              <NumericInput
                value={formData.berat}
                onChange={val => setFormData({ ...formData, berat: String(val) })}
                allowDecimal={true}
                placeholder="2.50"
                suffix="gr"
                required
                className="w-full px-3.5 py-2 text-sm font-bold font-mono bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Harga Jual (Rp)
              </label>
              <NumericInput
                value={formData.harga}
                onChange={val => setFormData({ ...formData, harga: String(val) })}
                prefix="Rp"
                placeholder="3.500.000"
                required
                className="w-full px-3.5 py-2 text-sm font-bold font-mono text-orange-600 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Stok (pcs)
              </label>
              <NumericInput
                value={formData.stok}
                onChange={val => setFormData({ ...formData, stok: String(val) })}
                placeholder="10"
                required
                className="w-full px-3.5 py-2 text-sm font-bold font-mono bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Live Code 128 + QR Code Preview */}
          {formData.sku.trim() && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  Pratinjau Label Barcode (Standar Code 128 + QR)
                </span>
                <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                  Siap Cetak &amp; Scan
                </span>
              </div>
              <div className="flex justify-center">
                <JewelryBarcodeTag
                  compact
                  format="hybrid"
                  product={{
                    sku: formData.sku.trim().toUpperCase(),
                    name: formData.name.trim() || 'Nama Perhiasan',
                    category: formData.category,
                    berat: previewBerat,
                    harga: previewHarga,
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs sm:text-sm font-semibold text-gray-700">
                Pilihan Foto Cepat (Preset Gambar Emas)
              </label>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-2">
              {[
                {
                  label: 'Cincin',
                  img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80',
                },
                {
                  label: 'Gelang',
                  img: 'https://images.unsplash.com/photo-1611591475711-d0b16f39e38d?auto=format&fit=crop&w=300&q=80',
                },
                {
                  label: 'Kalung',
                  img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=300&q=80',
                },
                {
                  label: 'Anting',
                  img: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=300&q=80',
                },
                {
                  label: 'Liontin',
                  img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=300&q=80',
                },
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFormData({ ...formData, image: p.img })}
                  className={`p-1.5 border rounded-md flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    formData.image === p.img
                      ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-400/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img src={p.img} alt={p.label} className="w-9 h-9 sm:w-10 sm:h-10 object-cover rounded-lg" />
                  <span className="text-xs font-medium text-gray-700">{p.label}</span>
                </button>
              ))}
            </div>
            <input
              type="url"
              value={formData.image}
              onChange={e => setFormData({ ...formData, image: e.target.value })}
              placeholder="Atau masukkan URL foto kustom..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-gray-600 font-medium"
            />
          </div>

      </form>
    </ModalShell>
  );
};
