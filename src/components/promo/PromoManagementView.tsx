import React, { useState, useMemo } from 'react';
import {
  BadgePercent,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Sparkles,
  Tag,
  Package,
  Plus,
  Pencil,
  Trash2,
  ShoppingCart,
} from 'lucide-react';
import { PromoCampaign, Product } from '../../types';
import { AddEditPromoModal } from './AddEditPromoModal';
import { PromoCard } from '../pos/PromoCard';
import { usePagination } from '../../hooks/usePagination';
import { PaginationControls } from '../common/PaginationControls';
import { useDebounce } from '../../hooks/useDebounce';

interface PromoManagementViewProps {
  promos: PromoCampaign[];
  products: Product[];
  onSavePromo: (promo: PromoCampaign) => void;
  onDeletePromo: (id: string) => void;
  onTogglePromoStatus: (id: string) => void;
  onNavigateToPosWithPromo?: (promo: PromoCampaign) => void;
}

export const PromoManagementView: React.FC<PromoManagementViewProps> = ({
  promos,
  products,
  onSavePromo,
  onDeletePromo,
  onTogglePromoStatus,
  onNavigateToPosWithPromo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 200);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCampaign | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // O(1) Lookup Map untuk produk
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  // Statistics dengan useMemo
  const { activePromos, totalPromoProducts, avgDiscount } = useMemo(() => {
    const active = promos.filter(p => p.isActive);
    const productSet = new Set<number>();
    let totalDiscount = 0;
    for (const p of active) {
      totalDiscount += p.discountPercent;
      for (const id of p.productIds) {
        productSet.add(id);
      }
    }
    const avg = active.length > 0 ? Math.round(totalDiscount / active.length) : 0;
    return {
      activePromos: active,
      totalPromoProducts: productSet.size,
      avgDiscount: avg,
    };
  }, [promos]);

  // Filtered List dengan useMemo
  const filteredPromos = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return promos.filter(promo => {
      const matchesSearch =
        !q ||
        promo.name.toLowerCase().includes(q) ||
        promo.code.toLowerCase().includes(q) ||
        (promo.description && promo.description.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? promo.isActive
          : !promo.isActive;

      return matchesSearch && matchesStatus;
    });
  }, [promos, debouncedSearch, statusFilter]);

  // Pagination untuk kampanye promo
  const {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    goToPage,
    setPageSize,
  } = usePagination(filteredPromos, { initialPageSize: 10 });

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const handleOpenAddModal = () => {
    setEditingPromo(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (promo: PromoCampaign) => {
    setEditingPromo(promo);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Top Header */}
      <div className="bg-white p-5 sm:p-6 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-yellow-100 text-yellow-800 rounded-md">
              <BadgePercent size={18} strokeWidth={2.4} />
            </span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Manajemen Promosi & Diskon
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Kelola & Atur Promo Toko
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Buat, aktifkan, dan atur besaran diskon perhiasan yang berlaku untuk kasir dan pelanggan
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>Buat Promo Baru</span>
        </button>
      </div>

      {/* KPI & Live Preview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: 3 Metric Cards */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200 flex flex-col justify-between shadow-xs">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Promo Aktif
            </span>
            <div className="my-2">
              <span className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tracking-tight">
                {activePromos.length}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">dari {promos.length} promo</span>
            </div>
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} /> Sedang berlangsung
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200 flex flex-col justify-between shadow-xs">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Produk Terdampak
            </span>
            <div className="my-2">
              <span className="text-xl sm:text-2xl font-bold text-gray-900 font-mono tracking-tight">
                {totalPromoProducts}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">perhiasan</span>
            </div>
            <p className="text-xs text-gray-500">
              Mendapatkan potongan harga di kasir
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200 flex flex-col justify-between shadow-xs">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Rata-Rata Diskon
            </span>
            <div className="my-2">
              <span className="text-xl sm:text-2xl font-bold text-orange-600 font-mono tracking-tight">
                {avgDiscount}%
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">potongan</span>
            </div>
            <p className="text-xs text-gray-500">
              Hemat maksimal bagi pelanggan
            </p>
          </div>
        </div>

        {/* Right: Live Preview of the Yellow Promo Card */}
        <div className="lg:col-span-4 bg-white p-4 rounded-lg border border-gray-200 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tampilan Live di Kasir
            </span>
            <span className="text-xs bg-yellow-100 text-yellow-800 font-semibold px-2 py-0.5 rounded">
              Card Promo Kuning
            </span>
          </div>
          <div className="flex-1 max-w-xs mx-auto w-full flex items-center justify-center">
            <PromoCard promoCount={totalPromoProducts} />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari promo berdasarkan nama atau kode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-gray-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none font-medium"
          />
        </div>

        {/* Status Filters */}
        <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center ${
              statusFilter === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Semua ({promos.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center ${
              statusFilter === 'active'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Aktif ({activePromos.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center ${
              statusFilter === 'inactive'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Nonaktif ({promos.length - activePromos.length})
          </button>
        </div>
      </div>

      {/* Promo Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedItems.map(promo => {
          const promoProductsList = promo.productIds
            .map(id => productMap.get(id))
            .filter((p): p is Product => Boolean(p));

          return (
            <div
              key={promo.id}
              className={`bg-white rounded-lg border transition-all p-5 flex flex-col justify-between shadow-xs ${
                promo.isActive
                  ? 'border-gray-200 hover:border-yellow-500'
                  : 'border-gray-200 opacity-70 bg-gray-50/50'
              }`}
            >
              <div>
                {/* Header Card: Name, Code & Switch */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-yellow-400 text-gray-950 uppercase tracking-wide">
                        {promo.label || `Diskon ${promo.discountPercent}%`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(promo.code)}
                        className="inline-flex items-center px-2.5 py-0.5 text-xs font-mono font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                        title="Klik untuk salin kode"
                      >
                        {promo.code} {copiedCode === promo.code ? '(Tersalin)' : ''}
                      </button>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                      {promo.name}
                    </h3>
                  </div>

                  {/* Toggle Active Switch */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onTogglePromoStatus(promo.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        promo.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                      aria-label="Toggle Status Promo"
                      title={promo.isActive ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          promo.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {promo.description && (
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 leading-relaxed">
                    {promo.description}
                  </p>
                )}

                {/* Period */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3.5 bg-gray-50 p-2.5 rounded-md border border-gray-100">
                  <Calendar size={14} className="text-gray-400 shrink-0" />
                  <span>
                    Berlaku: <span className="font-semibold text-gray-700 font-mono">{promo.startDate}</span> s/d{' '}
                    <span className="font-semibold text-gray-700 font-mono">{promo.endDate}</span>
                  </span>
                </div>

                {/* Associated Products Preview */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Package size={14} className="text-orange-500" />
                      Produk Promo ({promoProductsList.length} item)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {promoProductsList.map(p => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gray-100 text-gray-800 rounded font-medium border border-gray-200"
                      >
                        <img src={p.image} alt={p.name} className="w-3.5 h-3.5 rounded object-cover" />
                        <span className="truncate max-w-[140px]">{p.name}</span>
                        <span className="text-xs font-bold font-mono text-orange-600">
                          -{promo.discountPercent}%
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(promo)}
                    className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded border border-gray-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <Pencil size={12} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePromo(promo.id)}
                    className="px-2.5 py-1 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded border border-gray-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    <span>Hapus</span>
                  </button>
                </div>

                {onNavigateToPosWithPromo && promo.isActive && (
                  <button
                    type="button"
                    onClick={() => onNavigateToPosWithPromo(promo)}
                    className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-semibold text-xs sm:text-sm rounded transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingCart size={13} />
                    <span>Buka di Kasir</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredPromos.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-lg border border-gray-200 text-gray-400">
            <BadgePercent size={40} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-bold text-gray-700">Tidak ada promo yang ditemukan</p>
            <p className="text-xs text-gray-400 mt-1">
              Coba ganti kata kunci pencarian atau buat promo baru
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
      />

      {/* Add / Edit Promo Modal */}
      <AddEditPromoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSavePromo}
        editingPromo={editingPromo}
        products={products}
      />
    </div>
  );
};
