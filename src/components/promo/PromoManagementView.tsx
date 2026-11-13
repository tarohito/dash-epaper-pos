import React, { useState, useEffect, useMemo } from 'react';
import {
  BadgePercent,
  Calendar,
  CheckCircle2,
  Package,
  Plus,
  Pencil,
  Trash2,
  ShoppingCart,
  Loader2,
} from 'lucide-react';
import { PromoCampaign, Product, PromoStatsSummary } from '../../types';
import { AddEditPromoModal } from './AddEditPromoModal';
import { PromoCard } from '../pos/PromoCard';
import { PaginationControls } from '../common/PaginationControls';
import { ConfirmModal } from '../common/ConfirmModal';
import { useDebounce } from '../../hooks/useDebounce';
import { posApi } from '../../services/api';
import { SearchInput } from '../common/SearchInput';
import { ErrorBanner } from '../common/ErrorBanner';
import { useToast } from '../../contexts/ToastContext';

interface PromoManagementViewProps {
  refreshTrigger: number;
  onSavePromo: (promo: PromoCampaign, isEdit?: boolean) => Promise<void>;
  onDeletePromo: (id: string) => Promise<void>;
  onTogglePromoStatus: (id: string) => Promise<void>;
  onNavigateToPosWithPromo?: (promo: PromoCampaign) => void;
}

export const PromoManagementView: React.FC<PromoManagementViewProps> = ({
  refreshTrigger,
  onSavePromo,
  onDeletePromo,
  onTogglePromoStatus,
  onNavigateToPosWithPromo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 220);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCampaign | null>(null);
  const [deletingPromo, setDeletingPromo] = useState<PromoCampaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Server-side paginated promos + stats
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [items, setItems] = useState<PromoCampaign[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<PromoStatsSummary>({
    totalPromos: 0,
    activeCount: 0,
    totalPromoProducts: 0,
    avgDiscount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { showToast } = useToast();

  // Product summary lookup for rendering item badges on promo cards
  const [productList, setProductList] = useState<Product[]>([]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setFetchError(null);

    posApi
      .getPromos(
        {
          page: currentPage,
          pageSize,
          search: debouncedSearch || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
        controller.signal
      )
      .then(res => {
        setItems(Array.isArray(res.items) ? res.items : []);
        setTotalItems(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
        if (res.stats) setStats(res.stats);
        setIsLoading(false);
      })
      .catch(err => {
        if ((err as Error).name !== 'AbortError') {
          const msg = err instanceof Error ? err.message : 'Gagal memuat daftar promo.';
          setFetchError(msg);
          setIsLoading(false);
          showToast('error', msg);
        }
      });

    return () => controller.abort();
  }, [currentPage, pageSize, debouncedSearch, statusFilter, refreshTrigger, retryCount, showToast]);

  useEffect(() => {
    const controller = new AbortController();
    posApi
      .getProducts({ page: 1, pageSize: 100 }, controller.signal)
      .then(res => setProductList(res.items))
      .catch(() => {
        // Fallback silently if background preview list aborts
      });
    return () => controller.abort();
  }, [refreshTrigger]);

  const productMap = useMemo(() => new Map(productList.map(p => [p.id, p])), [productList]);

  const handleCopyCode = (code: string) => {
    try {
      navigator.clipboard?.writeText(code);
      setCopiedCode(code);
      showToast('success', `Kode promo "${code}" disalin ke clipboard.`);
      setTimeout(() => setCopiedCode(null), 1800);
    } catch {
      showToast('error', 'Gagal menyalin kode promo.');
    }
  };

  const handleOpenAddModal = () => {
    setEditingPromo(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (promo: PromoCampaign) => {
    setEditingPromo(promo);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPromo) return;
    setIsDeleting(true);
    try {
      await onDeletePromo(deletingPromo.id);
      setDeletingPromo(null);
    } finally {
      setIsDeleting(false);
    }
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
                {stats.activeCount}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">
                dari {stats.totalPromos} promo
              </span>
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
                {stats.totalPromoProducts}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">perhiasan</span>
            </div>
            <p className="text-xs text-gray-500">Mendapatkan potongan harga di kasir</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-lg border border-gray-200 flex flex-col justify-between shadow-xs">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Rata-Rata Diskon
            </span>
            <div className="my-2">
              <span className="text-xl sm:text-2xl font-bold text-orange-600 font-mono tracking-tight">
                {stats.avgDiscount}%
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1.5">potongan</span>
            </div>
            <p className="text-xs text-gray-500">Hemat maksimal bagi pelanggan</p>
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
            <PromoCard promoCount={stats.totalPromoProducts} />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-gray-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cari promo berdasarkan nama atau kode..."
        />

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
            Semua ({stats.totalPromos})
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
            Aktif ({stats.activeCount})
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
            Nonaktif ({Math.max(0, stats.totalPromos - stats.activeCount)})
          </button>
        </div>
      </div>

      {fetchError && (
        <ErrorBanner message={fetchError} onRetry={() => setRetryCount(c => c + 1)} />
      )}

      {/* Promo Campaigns Grid */}
      {isLoading && items.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center bg-white rounded-lg border border-gray-200 text-gray-500 gap-2">
          <Loader2 size={24} className="animate-spin text-orange-500" />
          <span className="text-xs font-medium">Memuat daftar promo dari SQLite...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(promo => {
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
                        onClick={() => void onTogglePromoStatus(promo.id)}
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
                      Berlaku:{' '}
                      <span className="font-semibold text-gray-700 font-mono">{promo.startDate}</span> s/d{' '}
                      <span className="font-semibold text-gray-700 font-mono">{promo.endDate}</span>
                    </span>
                  </div>

                  {/* Associated Products Preview */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Package size={14} className="text-orange-500" />
                        Produk Promo ({promo.productIds.length} item)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {promoProductsList.slice(0, 8).map(p => (
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
                      {promo.productIds.length > promoProductsList.length && (
                        <span className="inline-flex items-center px-2.5 py-1 text-xs bg-gray-50 text-gray-600 rounded font-medium border border-gray-200">
                          +{promo.productIds.length - promoProductsList.length} produk lainnya
                        </span>
                      )}
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
                      onClick={() => setDeletingPromo(promo)}
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

          {!isLoading && items.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white rounded-lg border border-gray-200 text-gray-400">
              <BadgePercent size={40} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-700">Tidak ada promo yang ditemukan</p>
              <p className="text-xs text-gray-400 mt-1">
                Coba ganti kata kunci pencarian atau buat promo baru
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        isLoading={isLoading}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Add / Edit Promo Modal */}
      <AddEditPromoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSavePromo}
        editingPromo={editingPromo}
      />

      <ConfirmModal
        isOpen={!!deletingPromo}
        title="Hapus Kampanye Promo"
        description={
          deletingPromo
            ? `Apakah Anda yakin ingin menghapus promo "${deletingPromo.name}" (${deletingPromo.code})?`
            : ''
        }
        confirmLabel="Ya, Hapus Promo"
        isLoading={isDeleting}
        onCancel={() => setDeletingPromo(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
