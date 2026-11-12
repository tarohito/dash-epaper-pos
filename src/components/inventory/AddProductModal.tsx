import React, { useState, useEffect } from'react';
import { Gem, X } from'lucide-react';
import { Product } from'../../types';
import { formatNumber } from'../../utils/formatters';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onSaveProduct: (productData: Omit<Product,'id'>) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSaveProduct,
}) => {
  const [formData, setFormData] = useState({
    sku:'',
    name:'',
    category: categories[0] ||'Cincin',
    berat:'2.50',
    harga:'3500000',
    stok:'10',
    image:'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        sku: `${Math.floor(10 + Math.random() * 90)}-${Math.floor(100 + Math.random() * 900)}`,
        name:'',
        category: categories[0] ||'Cincin',
        berat:'2.50',
        harga:'3500000',
        stok:'10',
        image:'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80',
      });
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) {
      alert('Harap masukkan SKU dan Nama Barang.');
      return;
    }
    const beratNum = parseFloat(formData.berat) || 1.0;
    const hargaNum = parseFloat(formData.harga.replace(/[^0-9]/g,'')) || 1000000;
    const stokNum = parseInt(formData.stok) || 1;

    onSaveProduct({
      sku: formData.sku.trim().toUpperCase(),
      name: formData.name.trim(),
      category: formData.category,
      berat: beratNum,
      harga: hargaNum,
      stok: stokNum,
      image: formData.image.trim() ||'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-orange-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500 text-white flex items-center justify-center">
              <Gem size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">Tambah Barang Perhiasan</h3>
              <p className="text-xs text-gray-500">Daftarkan koleksi emas baru ke katalog & inventaris kasir</p>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">SKU / Kode Barcode</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Cth: 19-204"
                className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kategori Perhiasan</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white"
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Nama Perhiasan Emas</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Cth: Cincin Solitaire Berlian 18K"
              className="w-full px-3.5 py-2.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Berat (gram)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.berat}
                onChange={e => setFormData({ ...formData, berat: e.target.value })}
                placeholder="2.50"
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Harga Jual (Rp)</label>
              <input
                type="text"
                required
                value={formatNumber(formData.harga)}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g,'');
                  setFormData({ ...formData, harga: raw });
                }}
                placeholder="3.500.000"
                className="w-full px-3.5 py-2.5 text-xs font-bold text-orange-600 bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Stok Awal (pcs)</label>
              <input
                type="number"
                required
                value={formData.stok}
                onChange={e => setFormData({ ...formData, stok: e.target.value })}
                placeholder="10"
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700">Pilihan Foto Cepat (Preset Gambar Emas)</label>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-2">
              {[
                { label:'Cincin', img:'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=300&q=80' },
                { label:'Gelang', img:'https://images.unsplash.com/photo-1611591475711-d0b16f39e38d?auto=format&fit=crop&w=300&q=80' },
                { label:'Kalung', img:'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=300&q=80' },
                { label:'Anting', img:'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=300&q=80' },
                { label:'Liontin', img:'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=300&q=80' },
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFormData({ ...formData, image: p.img })}
                  className={`p-1 border rounded-md flex flex-col items-center gap-1 cursor-pointer transition-all ${ formData.image === p.img ?'border-orange-500 bg-orange-50/50 ring-2 ring-orange-400/20' :'border-gray-200 hover:border-gray-300' }`}
                >
                  <img src={p.img} alt={p.label} className="w-9 h-9 sm:w-10 sm:h-10 object-cover rounded-lg" />
                  <span className="text-[9px] sm:text-[10px] font-medium text-gray-700">{p.label}</span>
                </button>
              ))}
            </div>
            <input
              type="url"
              value={formData.image}
              onChange={e => setFormData({ ...formData, image: e.target.value })}
              placeholder="Atau masukkan URL foto kustom..."
              className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-orange-500 focus:bg-white text-gray-500"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer text-center min-h-[40px]"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-xs rounded-md transition-all cursor-pointer min-h-[40px]"
            >
              Simpan Barang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
