import React, { useState, useEffect } from 'react';
import { X, BadgePercent, Calendar, Check, Package, Tag, AlertCircle } from 'lucide-react';
import { PromoCampaign, Product } from '../../types';
import { formatIDR } from '../../utils/formatters';

interface AddEditPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (promo: PromoCampaign) => void;
  editingPromo?: PromoCampaign | null;
  products: Product[];
}

export const AddEditPromoModal: React.FC<AddEditPromoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPromo,
  products,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [label, setLabel] = useState('Diskon 10%');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [minPurchase, setMinPurchase] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingPromo) {
      setName(editingPromo.name);
      setCode(editingPromo.code);
      setDiscountPercent(editingPromo.discountPercent);
      setLabel(editingPromo.label);
      setStartDate(editingPromo.startDate);
      setEndDate(editingPromo.endDate);
      setSelectedProductIds(editingPromo.productIds || []);
      setIsActive(editingPromo.isActive);
      setMinPurchase(editingPromo.minPurchase || 0);
      setDescription(editingPromo.description || '');
    } else {
      setName('');
      setCode('PROMO' + Math.floor(100 + Math.random() * 900));
      setDiscountPercent(10);
      setLabel('Diskon 10%');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]);
      setSelectedProductIds([]);
      setIsActive(true);
      setMinPurchase(0);
      setDescription('');
    }
    setError('');
  }, [editingPromo, isOpen]);

  if (!isOpen) return null;

  const handleToggleProduct = (id: number) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAllProducts = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map(p => p.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama promo tidak boleh kosong');
      return;
    }
    if (!code.trim()) {
      setError('Kode promo tidak boleh kosong');
      return;
    }
    if (discountPercent <= 0 || discountPercent > 100) {
      setError('Persentase diskon harus antara 1% - 100%');
      return;
    }
    if (selectedProductIds.length === 0) {
      setError('Pilih minimal 1 perhiasan yang mendapatkan promo ini');
      return;
    }

    const payload: PromoCampaign = {
      id: editingPromo ? editingPromo.id : `PRM-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      discountPercent: Number(discountPercent),
      label: label.trim() || `Diskon ${discountPercent}%`,
      startDate,
      endDate,
      productIds: selectedProductIds,
      isActive,
      minPurchase: minPurchase > 0 ? Number(minPurchase) : undefined,
      description: description.trim() || undefined,
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-yellow-400 text-gray-900 flex items-center justify-center shrink-0">
              <BadgePercent size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                {editingPromo ? 'Edit Promo Perhiasan' : 'Buat Promo Baru'}
              </h2>
              <p className="text-xs text-gray-500">
                Atur diskon, kode kupon, dan produk yang berhak mendapatkan promo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Grid 1: Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama Promo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Promo Kilau Emas 18K"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Kode Promo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: KILAU10"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none uppercase"
              />
            </div>
          </div>

          {/* Grid 2: Discount & Label */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Diskon (%) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={discountPercent}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setDiscountPercent(val);
                    setLabel(`Diskon ${val}%`);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  %
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Label Badge Promo</label>
              <input
                type="text"
                placeholder="Diskon 10%"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Status Promo</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full py-2 px-3 text-xs font-bold rounded-md border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-gray-100 text-gray-600 border-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                {isActive ? 'Aktif (Berlaku)' : 'Nonaktif (Diarsipkan)'}
              </button>
            </div>
          </div>

          {/* Grid 3: Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Mulai</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Berakhir</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Product Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Package size={15} className="text-orange-500" />
                Pilih Perhiasan yang Mendapatkan Promo ({selectedProductIds.length}/{products.length})
              </label>
              <button
                type="button"
                onClick={handleSelectAllProducts}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                {selectedProductIds.length === products.length ? 'Batalkan Semua' : 'Pilih Semua'}
              </button>
            </div>

            <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100 bg-gray-50/50">
              {products.map(product => {
                const isSelected = selectedProductIds.includes(product.id);
                const discountedPrice = Math.round(product.harga * (1 - discountPercent / 100));

                return (
                  <div
                    key={product.id}
                    onClick={() => handleToggleProduct(product.id)}
                    className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-yellow-50/80 hover:bg-yellow-100/70' : 'hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-yellow-400 border-yellow-600 text-gray-900'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-8 h-8 rounded object-cover border border-gray-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate leading-tight">
                          {product.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {product.sku} • {product.category} • {product.berat.toFixed(2)}g
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isSelected ? (
                        <>
                          <p className="text-xs font-black text-orange-600 leading-tight">
                            {formatIDR(discountedPrice)}
                          </p>
                          <p className="text-[10px] text-gray-400 line-through">
                            {formatIDR(product.harga)}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs font-bold text-gray-700">{formatIDR(product.harga)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Catatan / Deskripsi Promo</label>
            <textarea
              rows={2}
              placeholder="Deskripsi syarat & ketentuan promo perhiasan..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200/60 rounded-md transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors cursor-pointer"
          >
            {editingPromo ? 'Simpan Perubahan' : 'Buat Promo'}
          </button>
        </div>
      </div>
    </div>
  );
};
