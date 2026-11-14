import React, { useState, useEffect } from 'react';
import { AlertCircle, Search, Loader2 } from 'lucide-react';
import { PromoCampaign, Product } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { NumericInput } from '../common/NumericInput';
import { CustomCheckbox } from '../common/CustomCheckbox';
import { posApi } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../contexts/ToastContext';
import {
  ModalShell,
  MODAL_FOOTER_END_CLASS,
  MODAL_BTN_SECONDARY_CLASS,
  MODAL_BTN_PRIMARY_CLASS,
} from '../common/ModalShell';

interface AddEditPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (promo: PromoCampaign, isEdit?: boolean) => Promise<void> | void;
  editingPromo?: PromoCampaign | null;
}

export const AddEditPromoModal: React.FC<AddEditPromoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPromo,
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
  const [isSaving, setIsSaving] = useState(false);

  // Server-side searchable product picker inside modal
  const [productSearch, setProductSearch] = useState('');
  const debouncedProductSearch = useDebounce(productSearch, 200);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productLoadError, setProductLoadError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
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
    setProductSearch('');
    setError('');
    setProductLoadError(null);
  }, [editingPromo, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setIsLoadingProducts(true);
    setProductLoadError(null);

    posApi
      .getProducts(
        {
          page: 1,
          pageSize: 50,
          search: debouncedProductSearch || undefined,
        },
        controller.signal
      )
      .then(res => {
        setProducts(res.items);
        setTotalProducts(res.totalAllProducts || res.total);
        setIsLoadingProducts(false);
      })
      .catch(err => {
        if ((err as Error).name !== 'AbortError') {
          const msg = err instanceof Error ? err.message : 'Gagal memuat daftar perhiasan.';
          setProductLoadError(msg);
          setIsLoadingProducts(false);
          showToast('error', msg);
        }
      });

    return () => controller.abort();
  }, [isOpen, debouncedProductSearch, showToast]);

  const handleToggleProduct = (id: number) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const allVisibleSelected =
    products.length > 0 && products.every(p => selectedProductIds.includes(p.id));

  const handleSelectAllVisibleProducts = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(products.map(p => p.id));
      setSelectedProductIds(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      setSelectedProductIds(prev => {
        const merged = new Set(prev);
        for (const p of products) merged.add(p.id);
        return Array.from(merged);
      });
    }
  };

  const failValidation = (msg: string) => {
    setError(msg);
    showToast('error', msg, 'Validasi Form Promo');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanName) {
      failValidation('Nama promo tidak boleh kosong.');
      return;
    }
    if (!cleanCode || cleanCode.length < 3 || !/^[A-Z0-9_-]+$/.test(cleanCode)) {
      failValidation('Kode promo minimal 3 karakter (hanya huruf, angka, "-" atau "_" tanpa spasi).');
      return;
    }
    if (Number.isNaN(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      failValidation('Persentase diskon harus antara 1% hingga 100%.');
      return;
    }
    if (!startDate || !endDate) {
      failValidation('Tanggal mulai dan tanggal berakhir promo wajib diisi.');
      return;
    }
    if (endDate < startDate) {
      failValidation('Tanggal berakhir promo tidak boleh lebih awal dari tanggal mulai.');
      return;
    }
    if (selectedProductIds.length === 0) {
      failValidation('Pilih minimal 1 perhiasan yang mendapatkan promo ini.');
      return;
    }

    const payload: PromoCampaign = {
      id: editingPromo ? editingPromo.id : `PRM-${Date.now().toString().slice(-4)}`,
      name: cleanName,
      code: cleanCode,
      discountPercent: Number(discountPercent),
      label: label.trim() || `Diskon ${discountPercent}%`,
      startDate,
      endDate,
      productIds: selectedProductIds,
      isActive,
      minPurchase: minPurchase > 0 ? Number(minPurchase) : undefined,
      description: description.trim() || undefined,
    };

    try {
      setIsSaving(true);
      await onSave(payload, Boolean(editingPromo));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan promo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={editingPromo ? 'Edit Promo' : 'Buat Promo Baru'}
      subtitle="Atur diskon, kupon, dan produk promosi"
      disableEscapeClose={isSaving}
      footer={
        <div className={MODAL_FOOTER_END_CLASS}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={MODAL_BTN_SECONDARY_CLASS}
          >
            Batal
          </button>
          <button
            type="submit"
            form="add-edit-promo-form"
            disabled={isSaving}
            className={MODAL_BTN_PRIMARY_CLASS}
          >
            {isSaving ? 'Menyimpan...' : editingPromo ? 'Simpan Perubahan' : 'Buat Promo'}
          </button>
        </div>
      }
    >
      <form id="add-edit-promo-form" noValidate onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Grid 1: Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Nama Promo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Promo Kilau Emas 18K"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm font-medium rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Kode Promo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: KILAU10"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm font-mono font-bold rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none uppercase"
              />
            </div>
          </div>

          {/* Grid 2: Discount & Label */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Diskon (%) <span className="text-red-500">*</span>
              </label>
              <NumericInput
                value={discountPercent}
                onChange={val => {
                  setDiscountPercent(val);
                  setLabel(`Diskon ${val}%`);
                }}
                min={1}
                max={100}
                suffix="%"
                placeholder="10"
                required
                className="w-full px-3 py-2 text-sm font-bold font-mono rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Label Badge Promo
              </label>
              <input
                type="text"
                placeholder="Diskon 10%"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="w-full px-3 py-2 text-sm font-medium rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Status Promo
              </label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full py-2 px-3 text-xs sm:text-sm font-semibold rounded-md border flex items-center justify-center gap-2 cursor-pointer transition-colors min-h-[38px] ${
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
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-medium rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Tanggal Berakhir
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-medium rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none font-mono"
              />
            </div>
          </div>

          {/* Section: Product Selection */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs sm:text-sm font-semibold text-gray-800">
                Pilih Perhiasan ({selectedProductIds.length} terpilih dari {totalProducts} katalog)
              </label>
              <button
                type="button"
                onClick={handleSelectAllVisibleProducts}
                className="text-xs sm:text-sm font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                {allVisibleSelected ? 'Batalkan Daftar Ini' : 'Pilih Semua di Daftar'}
              </button>
            </div>

            {/* Search bar inside product picker */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder="Cari perhiasan berdasarkan nama atau SKU..."
                className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm rounded-md border border-gray-200 focus:border-orange-500 outline-none bg-white"
              />
            </div>

            <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100 bg-gray-50/50">
              {isLoadingProducts ? (
                <div className="py-8 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Loader2 size={16} className="animate-spin text-orange-500" />
                  <span>Memuat daftar perhiasan...</span>
                </div>
              ) : productLoadError ? (
                <div className="py-8 px-4 text-center text-xs text-red-600 font-semibold">
                  {productLoadError}
                </div>
              ) : products.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  Tidak ada perhiasan yang cocok dengan pencarian
                </div>
              ) : (
                products.map(product => {
                  const isSelected = selectedProductIds.includes(product.id);
                  const discountedPrice = Math.round(product.harga * (1 - discountPercent / 100));

                  return (
                    <label
                      key={product.id}
                      className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-orange-50/70 hover:bg-orange-50' : 'hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CustomCheckbox
                          checked={isSelected}
                          onChange={() => handleToggleProduct(product.id)}
                        />
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          className="w-8 h-8 rounded object-cover border border-gray-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate leading-tight">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">
                            {product.sku} • {product.category} • {product.berat.toFixed(2)}g
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isSelected ? (
                          <>
                            <p className="text-xs sm:text-sm font-bold font-mono text-orange-600 leading-tight">
                              {formatIDR(discountedPrice)}
                            </p>
                            <p className="text-xs text-gray-400 font-mono line-through">
                              {formatIDR(product.harga)}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs sm:text-sm font-bold font-mono text-gray-700">
                            {formatIDR(product.harga)}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
              Catatan / Deskripsi Promo
            </label>
            <textarea
              rows={2}
              placeholder="Deskripsi syarat & ketentuan promo perhiasan..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none font-medium"
            />
          </div>
        </form>
    </ModalShell>
  );
};
