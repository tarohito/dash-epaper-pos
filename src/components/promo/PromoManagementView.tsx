import React, { useState, useEffect, useMemo } from 'react';
import {
  BadgePercent,
  CheckCircle2,
  Copy,
  Eye,
  Loader2,
  MessageCircle,
  Package,
  Pencil,
  Percent,
  Plus,
  Trash2,
} from 'lucide-react';
import { PromoCampaign, Product, PromoStatsSummary } from '../../types';
import { AddEditPromoModal } from './AddEditPromoModal';
import { PromoBroadcastModal } from './PromoBroadcastModal';
import { PaginationControls } from '../common/PaginationControls';
import { ConfirmModal } from '../common/ConfirmModal';
import { useDebounce } from '../../hooks/useDebounce';
import { posApi } from '../../services/api';
import { SearchInput } from '../common/SearchInput';
import { ErrorBanner } from '../common/ErrorBanner';
import { useToast } from '../../contexts/ToastContext';
import Tooltip from '../Tooltip';
import { ActionDropdownMenu } from '../common/ActionDropdownMenu';
import { formatIDR } from '../../utils/formatters';
import {
  ModalShell,
  MODAL_FOOTER_END_CLASS,
  MODAL_BTN_PRIMARY_CLASS,
} from '../common/ModalShell';
import { MoneyAmount } from '../common/MoneyAmount';
import { KpiCard } from '../common/KpiCard';
import {
  SortableTh,
  SortDirection,
  getNextColumnSort,
} from '../common/TableSortControls';

const PROMO_DATE_FMT = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function parsePromoUtcMs(dateStr: string): number | null {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (match) {
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = Date.parse(dateStr);
  return Number.isNaN(parsed) ? null : parsed;
}

function getPromoDurationDays(startDate: string, endDate: string): number | null {
  const startMs = parsePromoUtcMs(startDate);
  const endMs = parsePromoUtcMs(endDate);
  if (startMs === null || endMs === null) return null;
  const diffDays = Math.round((endMs - startMs) / 86_400_000) + 1;
  return diffDays > 0 ? diffDays : 0;
}

function formatPromoDate(dateStr: string): string {
  const ms = parsePromoUtcMs(dateStr);
  if (ms === null) return dateStr;
  return PROMO_DATE_FMT.format(new Date(ms));
}

interface PromoManagementViewProps {
  refreshTrigger: number;
  storeName?: string;
  onSavePromo: (promo: PromoCampaign, isEdit?: boolean) => Promise<void>;
  onDeletePromo: (id: string) => Promise<void>;
  onTogglePromoStatus: (id: string) => Promise<void>;
}

export const PromoManagementView: React.FC<PromoManagementViewProps> = ({
  refreshTrigger,
  storeName,
  onSavePromo,
  onDeletePromo,
  onTogglePromoStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 220);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCampaign | null>(null);
  const [detailPromo, setDetailPromo] = useState<PromoCampaign | null>(null);
  const [deletingPromo, setDeletingPromo] = useState<PromoCampaign | null>(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastPromo, setBroadcastPromo] = useState<PromoCampaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const [productList, setProductList] = useState<Product[]>([]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, sortBy, sortDir]);

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
          sortBy,
          sortDir,
        },
        controller.signal
      )
      .then(res => {
        setItems(Array.isArray(res.items) ? res.items : []);
        setTotalItems(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
        if (res.stats) setStats(res.stats);
        if (res.page !== currentPage) setCurrentPage(res.page ?? 1);
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
  }, [
    currentPage,
    pageSize,
    debouncedSearch,
    statusFilter,
    sortBy,
    sortDir,
    refreshTrigger,
    retryCount,
    showToast,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    posApi
      .getProducts({ page: 1, pageSize: 200 }, controller.signal)
      .then(res => setProductList(res.items))
      .catch(() => {
        // Ignore background abort
      });
    return () => controller.abort();
  }, [refreshTrigger]);

  const productMap = useMemo(() => new Map(productList.map(p => [p.id, p])), [productList]);

  const handleHeaderSort = (key: string, defaultDir: SortDirection = 'desc') => {
    const next = getNextColumnSort(key, sortBy, sortDir, defaultDir);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

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

  const handleToggleStatus = async (promo: PromoCampaign) => {
    setTogglingId(promo.id);
    try {
      await onTogglePromoStatus(promo.id);
      setDetailPromo(prev => (prev && prev.id === promo.id ? { ...prev, isActive: !prev.isActive } : prev));
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPromo) return;
    setIsDeleting(true);
    try {
      await onDeletePromo(deletingPromo.id);
      if (detailPromo?.id === deletingPromo.id) {
        setDetailPromo(null);
      }
      setDeletingPromo(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const detailProducts = useMemo(() => {
    if (!detailPromo) return [];
    return detailPromo.productIds
      .map(id => productMap.get(id))
      .filter((p): p is Product => Boolean(p));
  }, [detailPromo, productMap]);

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
            Manajemen Promo &amp; Diskon
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Kelola kampanye diskon perhiasan, periode berlaku, dan status promo aktif di kasir POS.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setBroadcastPromo(null);
              setIsBroadcastOpen(true);
            }}
            className="h-9 px-4 text-xs sm:text-sm font-semibold text-white bg-[#25D366] hover:bg-[#1EBE5D] rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs active:scale-[0.98]"
          >
            <MessageCircle size={15} />
            <span>Broadcast WA</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="h-9 px-4 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Buat Promo Baru</span>
          </button>
        </div>
      </div>

      {/* 4 Modern KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          title="Total Kampanye Promo"
          accent="orange"
          icon={<BadgePercent size={16} strokeWidth={2} />}
          value={
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 group-hover:text-white tracking-tight truncate tabular-nums transition-colors duration-200">
              {stats?.totalPromos ?? 0} Promo
            </div>
          }
          footer={
            <p className="text-xs text-gray-400 group-hover:text-white/85 mt-1 truncate transition-colors duration-200">
              Seluruh kampanye terdaftar
            </p>
          }
        />

        <KpiCard
          title="Promo Aktif"
          accent="emerald"
          icon={<CheckCircle2 size={16} strokeWidth={2} />}
          value={
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 group-hover:text-white tracking-tight truncate tabular-nums transition-colors duration-200">
              {stats?.activeCount ?? 0} Aktif
            </div>
          }
          footer={
            <p className="text-xs text-gray-400 group-hover:text-white/85 mt-1 truncate transition-colors duration-200">
              Sedang berlaku di kasir
            </p>
          }
        />

        <KpiCard
          title="Produk Terdampak"
          accent="blue"
          icon={<Package size={16} strokeWidth={2} />}
          value={
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 group-hover:text-white tracking-tight truncate tabular-nums transition-colors duration-200">
              {stats?.totalPromoProducts ?? 0} SKU
            </div>
          }
          footer={
            <p className="text-xs text-gray-400 group-hover:text-white/85 mt-1 truncate transition-colors duration-200">
              Mendapat potongan harga
            </p>
          }
        />

        <KpiCard
          title="Rata-Rata Diskon"
          accent="amber"
          icon={<Percent size={16} strokeWidth={2} />}
          value={
            <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900 group-hover:text-white tracking-tight truncate tabular-nums transition-colors duration-200">
              {stats?.avgDiscount ?? 0}%
            </div>
          }
          footer={
            <p className="text-xs text-gray-400 group-hover:text-white/85 mt-1 truncate transition-colors duration-200">
              Rata-rata promo aktif
            </p>
          }
        />
      </div>

      {/* Table Workspace Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari nama promo, kode voucher, atau deskripsi..."
          />

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center overflow-x-auto max-w-full no-scrollbar">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Semua ({stats?.totalPromos ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                  statusFilter === 'active'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Aktif ({stats?.activeCount ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                  statusFilter === 'inactive'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Nonaktif ({Math.max(0, (stats?.totalPromos ?? 0) - (stats?.activeCount ?? 0))})
              </button>
            </div>
          </div>
        </div>

        {fetchError && (
          <ErrorBanner
            message={fetchError}
            onRetry={() => setRetryCount(c => c + 1)}
            className="mb-3"
          />
        )}

        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
          {isLoading && items.length === 0 ? (
            <div className="py-12 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-400">
              <Loader2 size={18} className="animate-spin text-orange-500" />
              <span>Memuat daftar promo...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 px-4 text-center text-gray-400">
              <BadgePercent size={36} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">Tidak ada promo ditemukan</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {searchQuery || statusFilter !== 'all'
                  ? 'Coba ubah filter status atau kata kunci pencarian.'
                  : 'Belum ada kampanye promo yang dibuat.'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer border border-orange-200"
                >
                  <Plus size={14} />
                  <span>Buat Promo Baru</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* MOBILE CARDS (md:hidden) */}
              <div className="md:hidden divide-y divide-gray-100">
                {items.map(promo => (
                  <div
                    key={promo.id}
                    className={`p-4 space-y-2.5 transition-colors ${
                      promo.isActive ? 'hover:bg-orange-50/25' : 'bg-gray-50/60 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="px-2 py-0.5 text-xs font-bold font-mono rounded bg-amber-50 text-amber-800 border border-amber-200">
                            -{promo.discountPercent}%
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(promo.code)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 cursor-pointer"
                          >
                            <span>{promo.code}</span>
                            <Copy size={11} className="text-gray-400" />
                          </button>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">{promo.name}</h4>
                        {(() => {
                          const days = getPromoDurationDays(promo.startDate, promo.endDate);
                          return (
                            <div className="mt-1">
                              {days !== null && (
                                <span className="text-xs font-mono font-bold text-gray-900 block tabular-nums">
                                  {days} Hari
                                </span>
                              )}
                              <span className="text-xs text-gray-500 block tabular-nums">
                                {formatPromoDate(promo.startDate)} s/d {formatPromoDate(promo.endDate)}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      <Tooltip
                        content={promo.isActive ? 'Aktif — klik untuk nonaktifkan' : 'Nonaktif — klik untuk aktifkan'}
                        side="top"
                      >
                        <button
                          type="button"
                          role="switch"
                          aria-checked={promo.isActive}
                          disabled={togglingId === promo.id}
                          onClick={() => void handleToggleStatus(promo)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                            promo.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                          aria-label="Toggle Status Promo"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-2xs transition-transform ${
                              promo.isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </Tooltip>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                        {promo.productIds.length} SKU Terdampak
                      </span>
                      <ActionDropdownMenu
                        ariaLabel={`Aksi untuk ${promo.name}`}
                        items={[
                          {
                            id: 'detail',
                            label: 'Lihat Detail',
                            icon: <Eye size={14} />,
                            onClick: () => setDetailPromo(promo),
                          },
                          {
                            id: 'broadcast',
                            label: 'Broadcast WA',
                            icon: <MessageCircle size={14} />,
                            tone: 'whatsapp',
                            onClick: () => {
                              setBroadcastPromo(promo);
                              setIsBroadcastOpen(true);
                            },
                          },
                          {
                            id: 'edit',
                            label: 'Edit Promo',
                            icon: <Pencil size={14} />,
                            onClick: () => handleOpenEditModal(promo),
                          },
                          {
                            id: 'delete',
                            label: 'Hapus Promo',
                            icon: <Trash2 size={14} />,
                            tone: 'danger',
                            dividerBefore: true,
                            onClick: () => setDeletingPromo(promo),
                          },
                        ]}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left border-collapse">
                  <thead className="bg-gray-50/80 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200 tracking-wider">
                    <tr>
                      <SortableTh
                        label="Promo & Kode"
                        sortKey="name"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'asc')}
                        className="py-3 px-4 min-w-[210px]"
                      />
                      <SortableTh
                        label="Diskon"
                        sortKey="discountPercent"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'desc')}
                        align="center"
                        className="py-3 px-4 w-[140px]"
                      />
                      <SortableTh
                        label="Periode Berlaku"
                        sortKey="endDate"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'desc')}
                        className="py-3 px-4 min-w-[180px]"
                      />
                      <th className="py-3 px-4 text-center w-[110px]">Produk</th>
                      <SortableTh
                        label="Status"
                        sortKey="isActive"
                        currentSortBy={sortBy}
                        currentSortDir={sortDir}
                        onSort={key => handleHeaderSort(key, 'desc')}
                        align="center"
                        className="py-3 px-4 w-[100px]"
                      />
                      <th className="py-3 px-3 text-center w-[72px]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                    {items.map(promo => (
                      <tr
                        key={promo.id}
                        className={`transition-colors ${
                          promo.isActive ? 'hover:bg-orange-50/30' : 'bg-gray-50/60 opacity-80'
                        }`}
                      >
                        <td className="py-3.5 px-4 align-middle max-w-[260px]">
                          <span className="font-bold text-gray-900 text-xs sm:text-sm block truncate">
                            {promo.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Tooltip content="Klik untuk salin kode promo" side="top">
                              <button
                                type="button"
                                onClick={() => handleCopyCode(promo.code)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 transition-colors cursor-pointer"
                              >
                                <span>{promo.code}</span>
                                <Copy size={11} className="text-gray-400" />
                              </button>
                            </Tooltip>
                            {copiedCode === promo.code && (
                              <span className="text-xs font-semibold text-emerald-600">Tersalin</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap align-middle">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono font-bold text-xs">
                            -{promo.discountPercent}%
                          </span>
                          {promo.label && (
                            <span className="block text-xs text-gray-400 mt-0.5 truncate max-w-[130px] mx-auto">
                              {promo.label}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                          {(() => {
                            const days = getPromoDurationDays(promo.startDate, promo.endDate);
                            return (
                              <div>
                                <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm block tabular-nums">
                                  {days !== null ? `${days} Hari` : '-'}
                                </span>
                                <span className="text-xs text-gray-500 block mt-0.5 tabular-nums">
                                  {formatPromoDate(promo.startDate)} s/d {formatPromoDate(promo.endDate)}
                                </span>
                              </div>
                            );
                          })()}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap align-middle">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 font-mono text-xs font-bold tabular-nums">
                            {promo.productIds.length} SKU
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap align-middle">
                          <Tooltip
                            content={promo.isActive ? 'Aktif — klik untuk nonaktifkan' : 'Nonaktif — klik untuk aktifkan'}
                            side="top"
                          >
                            <button
                              type="button"
                              role="switch"
                              aria-checked={promo.isActive}
                              disabled={togglingId === promo.id}
                              onClick={() => void handleToggleStatus(promo)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                                promo.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                              }`}
                              aria-label="Toggle Status Promo"
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-2xs transition-transform ${
                                  promo.isActive ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </Tooltip>
                        </td>

                        <td className="py-3.5 px-3 text-center whitespace-nowrap align-middle">
                          <ActionDropdownMenu
                            ariaLabel={`Aksi untuk ${promo.name}`}
                            items={[
                              {
                                id: 'detail',
                                label: 'Lihat Detail',
                                icon: <Eye size={14} />,
                                onClick: () => setDetailPromo(promo),
                              },
                              {
                                id: 'broadcast',
                                label: 'Broadcast WA',
                                icon: <MessageCircle size={14} />,
                                tone: 'whatsapp',
                                onClick: () => {
                                  setBroadcastPromo(promo);
                                  setIsBroadcastOpen(true);
                                },
                              },
                              {
                                id: 'edit',
                                label: 'Edit Promo',
                                icon: <Pencil size={14} />,
                                onClick: () => handleOpenEditModal(promo),
                              },
                              {
                                id: 'delete',
                                label: 'Hapus Promo',
                                icon: <Trash2 size={14} />,
                                tone: 'danger',
                                dividerBefore: true,
                                onClick: () => setDeletingPromo(promo),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

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
        </div>
      </div>

      {/* Promo Detail Modal */}
      <ModalShell
        isOpen={!!detailPromo}
        onClose={() => setDetailPromo(null)}
        size="xl"
        title={detailPromo?.name ?? 'Detail Promo'}
        subtitle={
          detailPromo
            ? `${detailPromo.startDate} s/d ${detailPromo.endDate} • ${detailPromo.isActive ? 'Aktif' : 'Nonaktif'}`
            : undefined
        }
        footer={
          detailPromo ? (
            <div className={MODAL_FOOTER_END_CLASS}>
              <button
                type="button"
                onClick={() => {
                  const target = detailPromo;
                  setDetailPromo(null);
                  setBroadcastPromo(target);
                  setIsBroadcastOpen(true);
                }}
                className="h-9 px-4 text-xs sm:text-sm font-semibold text-white bg-[#25D366] hover:bg-[#1EBE5D] rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs active:scale-[0.98]"
              >
                <MessageCircle size={15} className="shrink-0" />
                <span>Broadcast WA</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = detailPromo;
                  setDetailPromo(null);
                  handleOpenEditModal(target);
                }}
                className={MODAL_BTN_PRIMARY_CLASS}
              >
                <Pencil size={15} className="shrink-0" />
                <span>Edit Promo</span>
              </button>
            </div>
          ) : undefined
        }
      >
        {detailPromo && (
          <div className="space-y-4">
            {/* Promo Coupon Banner */}
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xs flex flex-col sm:flex-row items-stretch">
              {/* Left Body: Discount Value */}
              <div className="flex-1 px-4 py-4 sm:px-5 sm:py-5 flex flex-col justify-center min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-orange-100 block">
                  Besaran Potongan Harga
                </span>
                <p className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white mt-0.5">
                  Diskon {detailPromo.discountPercent}%
                </p>
                <p className="text-xs text-orange-100 mt-1 truncate">
                  Label: <strong className="text-white">{detailPromo.label || '-'}</strong>
                </p>
              </div>

              {/* Perforated Coupon Tear Line */}
              <div className="relative shrink-0 h-0 w-full sm:h-auto sm:w-0">
                {/* Mobile Horizontal Perforation & Notches */}
                <div className="sm:hidden absolute inset-x-3 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/50" />
                <span
                  aria-hidden="true"
                  className="sm:hidden absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white z-10"
                />
                <span
                  aria-hidden="true"
                  className="sm:hidden absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white z-10"
                />

                {/* Desktop Vertical Perforation & Notches */}
                <div className="hidden sm:block absolute inset-y-3 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-white/50" />
                <span
                  aria-hidden="true"
                  className="hidden sm:block absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white z-10"
                />
                <span
                  aria-hidden="true"
                  className="hidden sm:block absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white z-10"
                />
              </div>

              {/* Right Coupon Stub: Promo Code */}
              <div className="bg-black/10 px-4 py-3.5 sm:px-6 sm:py-5 flex sm:flex-col items-center sm:justify-center justify-between gap-2 shrink-0 sm:min-w-[178px]">
                <span className="text-xs font-semibold uppercase tracking-wider text-orange-100">
                  Kode Promo
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(detailPromo.code)}
                  title="Klik untuk salin kode promo"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-mono font-bold text-xs sm:text-sm border border-dashed border-white/60 transition-colors cursor-pointer active:scale-[0.98]"
                >
                  <span>{detailPromo.code}</span>
                  <Copy size={13} />
                </button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5 min-w-0">
                <span className="text-gray-500 block mb-1">Minimal Pembelian</span>
                {detailPromo.minPurchase ? (
                  <MoneyAmount
                    value={detailPromo.minPurchase}
                    maxFontPx={15}
                    minFontPx={12}
                    className="font-mono font-bold text-gray-900 tabular-nums"
                  />
                ) : (
                  <span className="font-mono font-bold text-gray-900 text-sm">
                    Tanpa Minimal Belanja
                  </span>
                )}
              </div>
              <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5">
                <span className="text-gray-500 block mb-1">Total Produk Terdaftar</span>
                <span className="font-mono font-bold text-gray-900 text-sm">
                  {detailPromo.productIds.length} Item Perhiasan (SKU)
                </span>
              </div>
            </div>

            {detailPromo.description && (
              <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5 text-xs">
                <span className="font-bold text-gray-800 block mb-1">Deskripsi &amp; Syarat Promo</span>
                <p className="text-gray-600 leading-relaxed">{detailPromo.description}</p>
              </div>
            )}

            {/* Product List */}
            <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 mb-2.5">
                <span className="text-xs font-bold text-gray-800">
                  Daftar Perhiasan dalam Promo ({detailPromo.productIds.length})
                </span>
              </div>
              {detailProducts.length === 0 ? (
                <p className="text-xs text-gray-500 py-3 text-center">
                  {detailPromo.productIds.length > 0
                    ? `${detailPromo.productIds.length} produk terpilih pada kampanye ini.`
                    : 'Belum ada produk yang dipilih pada kampanye ini.'}
                </p>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200/70 divide-y divide-gray-100 max-h-60 overflow-y-auto">
                  {detailProducts.map(prod => {
                    const discountedPrice = Math.round(
                      prod.harga * (1 - detailPromo.discountPercent / 100)
                    );
                    return (
                      <div key={prod.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-9 h-9 rounded-md object-cover border border-gray-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-gray-900 block truncate">{prod.name}</span>
                            <span className="text-xs text-gray-500 font-mono">
                              {prod.sku} &bull; {prod.category}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-orange-600 block tabular-nums">
                            {formatIDR(discountedPrice)}
                          </span>
                          <span className="font-mono text-xs text-gray-400 line-through tabular-nums">
                            {formatIDR(prod.harga)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </ModalShell>

      {/* Add / Edit Promo Modal */}
      <AddEditPromoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSavePromo}
        editingPromo={editingPromo}
      />

      {/* Promo WhatsApp Broadcast Modal */}
      <PromoBroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => {
          setIsBroadcastOpen(false);
          setBroadcastPromo(null);
        }}
        promos={
          broadcastPromo && !items.some(p => p.id === broadcastPromo.id)
            ? [broadcastPromo, ...items]
            : items
        }
        initialPromo={broadcastPromo}
        storeName={storeName}
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
