import React, { useEffect, useMemo, useState } from 'react';
import {
  Gem,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { CategoryStatsItem } from '../../types';
import Tooltip from '../Tooltip';
import { ConfirmModal } from '../common/ConfirmModal';
import { posApi } from '../../services/api';
import { usePagination } from '../../hooks/usePagination';
import { PaginationControls } from '../common/PaginationControls';
import { ErrorBanner } from '../common/ErrorBanner';
import { SearchInput } from '../common/SearchInput';
import { useToast } from '../../contexts/ToastContext';
import {
  SortableTh,
  SortDirection,
  getNextColumnSort,
} from '../common/TableSortControls';

interface CategoryListViewProps {
  refreshTrigger: number;
  onOpenAddCategoryModal: () => void;
  onEditCategory: (category: string) => void;
  onDeleteCategory: (category: string) => Promise<void>;
}

interface CategoryRow {
  name: string;
  count: number;
  totalStok: number;
  totalGram: number;
}

export const CategoryListView: React.FC<CategoryListViewProps> = ({
  refreshTrigger,
  onOpenAddCategoryModal,
  onEditCategory,
  onDeleteCategory,
}) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryStats, setCategoryStats] = useState<Record<string, CategoryStatsItem>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'filled' | 'empty'>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setFetchError(null);
    posApi
      .getCategoriesWithStats(controller.signal)
      .then(res => {
        setCategories(res.categories);
        setCategoryStats(res.stats);
        setIsLoading(false);
      })
      .catch(err => {
        if ((err as Error).name !== 'AbortError') {
          const msg = err instanceof Error ? err.message : 'Gagal memuat daftar kategori.';
          setFetchError(msg);
          setIsLoading(false);
          showToast('error', msg);
        }
      });
    return () => controller.abort();
  }, [refreshTrigger, retryCount, showToast]);

  const rows = useMemo<CategoryRow[]>(() => {
    return categories.map(name => {
      const stats = categoryStats[name] || { count: 0, totalStok: 0, totalGram: 0 };
      return {
        name,
        count: stats.count ?? 0,
        totalStok: stats.totalStok ?? 0,
        totalGram: stats.totalGram ?? 0,
      };
    });
  }, [categories, categoryStats]);

  const summary = useMemo(() => {
    let filledCount = 0;
    let emptyCount = 0;
    let totalSku = 0;

    for (const row of rows) {
      if (row.count > 0) filledCount += 1;
      else emptyCount += 1;
      totalSku += row.count;
    }

    return {
      totalCategories: rows.length,
      filledCount,
      emptyCount,
      totalSku,
    };
  }, [rows]);

  const filteredAndSortedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter(row => {
      if (q && !row.name.toLowerCase().includes(q)) return false;
      if (statusFilter === 'filled' && row.count === 0) return false;
      if (statusFilter === 'empty' && row.count > 0) return false;
      return true;
    });

    const factor = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortBy === 'count') return (a.count - b.count) * factor;
      if (sortBy === 'totalStok') return (a.totalStok - b.totalStok) * factor;
      if (sortBy === 'totalGram') return (a.totalGram - b.totalGram) * factor;
      return a.name.localeCompare(b.name, 'id-ID') * factor;
    });
  }, [rows, search, statusFilter, sortBy, sortDir]);

  const {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    goToPage,
    setPageSize,
  } = usePagination(filteredAndSortedRows, { initialPageSize: 10 });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    goToPage(1);
  };

  const handleStatusFilterChange = (nextStatus: 'all' | 'filled' | 'empty') => {
    setStatusFilter(nextStatus);
    goToPage(1);
  };

  const handleHeaderSort = (key: string, defaultDir: SortDirection = 'desc') => {
    const next = getNextColumnSort(key, sortBy, sortDir, defaultDir);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
    goToPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      await onDeleteCategory(deletingCategory);
      setDeletingCategory(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilter = search.trim().length > 0 || statusFilter !== 'all';

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Daftar Kategori Perhiasan
            </h3>
            {isLoading && <Loader2 size={14} className="animate-spin text-orange-500" />}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Kelola klasifikasi etalase perhiasan emas serta pantau sebaran model SKU, stok fisik, dan gramasi.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onOpenAddCategoryModal}
            className="h-9 px-4 text-xs sm:text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Tambah Kategori</span>
          </button>
        </div>
      </div>

      {/* Search, Filter & Table Workspace */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-4">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari nama kategori perhiasan..."
          />

          <div className="inline-flex h-9 p-0.5 bg-gray-100 rounded-lg border border-gray-200 items-center overflow-x-auto max-w-full shrink-0">
            {[
              { id: 'all' as const, label: `Semua (${summary.totalCategories})` },
              { id: 'filled' as const, label: `Terisi (${summary.filledCount})` },
              { id: 'empty' as const, label: `Kosong (${summary.emptyCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleStatusFilterChange(tab.id)}
                className={`h-full px-3 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {fetchError && (
          <ErrorBanner
            message={fetchError}
            onRetry={() => setRetryCount(c => c + 1)}
            className="mb-3"
          />
        )}

        {/* Inner Table & Mobile Cards Container */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-2xs">
          {/* MOBILE LIST CARDS (md:hidden) */}
          <div className="md:hidden divide-y divide-gray-100">
            {isLoading && rows.length === 0 ? (
              <div className="py-12 px-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Loader2 size={18} className="animate-spin text-orange-500" />
                <span>Memuat daftar kategori...</span>
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="py-12 px-4 text-center text-gray-400">
                <Layers size={36} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">Tidak ada kategori perhiasan</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {hasActiveFilter
                    ? 'Coba ubah filter status atau kata kunci pencarian.'
                    : 'Belum ada kategori terdaftar di etalase toko.'}
                </p>
                {!hasActiveFilter && (
                  <button
                    type="button"
                    onClick={onOpenAddCategoryModal}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer border border-orange-200"
                  >
                    <Plus size={14} />
                    <span>Tambah Kategori Baru</span>
                  </button>
                )}
              </div>
            ) : (
              paginatedItems.map(row => {
                const sharePercent =
                  summary.totalSku > 0 ? Math.round((row.count / summary.totalSku) * 100) : 0;
                return (
                  <div
                    key={row.name}
                    className="p-4 flex flex-col gap-3 hover:bg-orange-50/25 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0">
                          <Gem size={18} />
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 truncate">{row.name}</h4>
                          <p className="text-xs text-gray-500 mt-0.5 font-mono tabular-nums">
                            {row.count} SKU · {sharePercent}% katalog
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border shrink-0 ${
                          row.count > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {row.count > 0 ? 'Terisi' : 'Kosong'}
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          Stok:{' '}
                          <strong className="text-gray-900 font-mono tabular-nums">
                            {row.totalStok} pcs
                          </strong>
                        </span>
                        <span>
                          Gramasi:{' '}
                          <strong className="text-orange-600 font-mono tabular-nums">
                            {row.totalGram.toFixed(2)} gr
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Tooltip content="Edit Kategori" side="top">
                          <button
                            type="button"
                            onClick={() => onEditCategory(row.name)}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                            aria-label="Edit Kategori"
                          >
                            <Pencil size={15} />
                          </button>
                        </Tooltip>

                        <Tooltip
                          content={row.count > 0 ? 'Masih dipakai produk' : 'Hapus Kategori'}
                          side="top"
                        >
                          <button
                            type="button"
                            disabled={row.count > 0}
                            onClick={() => setDeletingCategory(row.name)}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-gray-600 disabled:active:scale-100"
                            aria-label="Hapus Kategori"
                          >
                            <Trash2 size={15} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase font-semibold tracking-wider text-xs">
                <tr>
                  <SortableTh
                    label="Kategori Perhiasan"
                    sortKey="name"
                    currentSortBy={sortBy}
                    currentSortDir={sortDir}
                    onSort={key => handleHeaderSort(key, 'asc')}
                    className="py-3 px-3.5 sm:px-4"
                  />
                  <SortableTh
                    label="Model SKU"
                    sortKey="count"
                    currentSortBy={sortBy}
                    currentSortDir={sortDir}
                    onSort={key => handleHeaderSort(key, 'desc')}
                    align="center"
                    className="py-3 px-3 sm:px-4"
                  />
                  <SortableTh
                    label="Total Stok"
                    sortKey="totalStok"
                    currentSortBy={sortBy}
                    currentSortDir={sortDir}
                    onSort={key => handleHeaderSort(key, 'desc')}
                    align="center"
                    className="py-3 px-3 sm:px-4"
                  />
                  <SortableTh
                    label="Total Gramasi"
                    sortKey="totalGram"
                    currentSortBy={sortBy}
                    currentSortDir={sortDir}
                    onSort={key => handleHeaderSort(key, 'desc')}
                    align="right"
                    className="py-3 px-3 sm:px-4"
                  />
                  <th className="py-3 px-3 sm:px-4 text-center">Status</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {isLoading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin text-orange-500" />
                        <span>Memuat daftar kategori...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <Layers size={36} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-semibold text-gray-600">
                        Tidak ada kategori perhiasan
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {hasActiveFilter
                          ? 'Coba ubah filter status atau kata kunci pencarian.'
                          : 'Belum ada kategori terdaftar di etalase toko.'}
                      </p>
                      {!hasActiveFilter && (
                        <button
                          type="button"
                          onClick={onOpenAddCategoryModal}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer border border-orange-200"
                        >
                          <Plus size={14} />
                          <span>Tambah Kategori Baru</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map(row => {
                    const sharePercent =
                      summary.totalSku > 0 ? Math.round((row.count / summary.totalSku) * 100) : 0;
                    return (
                      <tr key={row.name} className="hover:bg-orange-50/25 transition-colors">
                        <td className="py-3.5 px-3.5 sm:px-4">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-lg bg-orange-50/80 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0">
                              <Gem size={16} />
                            </span>
                            <div className="min-w-0">
                              <span className="font-bold text-gray-900 text-xs sm:text-sm block truncate">
                                {row.name}
                              </span>
                              <span className="text-xs text-gray-400 font-normal block mt-0.5">
                                {sharePercent}% porsi koleksi etalase
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                          <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm tabular-nums">
                            {row.count} SKU
                          </span>
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                          <span className="font-mono font-semibold text-gray-800 text-xs sm:text-sm tabular-nums">
                            {row.totalStok} pcs
                          </span>
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                          <span className="font-mono font-bold text-orange-600 text-xs sm:text-sm tabular-nums">
                            {row.totalGram.toFixed(2)} gr
                          </span>
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                              row.count > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {row.count > 0 ? 'Terisi Produk' : 'Kosong'}
                          </span>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <Tooltip content="Edit Kategori" side="top">
                              <button
                                type="button"
                                onClick={() => onEditCategory(row.name)}
                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                                aria-label="Edit Kategori"
                              >
                                <Pencil size={15} />
                              </button>
                            </Tooltip>

                            <Tooltip
                              content={row.count > 0 ? 'Masih dipakai produk' : 'Hapus Kategori'}
                              side="top"
                            >
                              <button
                                type="button"
                                disabled={row.count > 0}
                                onClick={() => setDeletingCategory(row.name)}
                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 inline-flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-gray-600 disabled:active:scale-100"
                                aria-label="Hapus Kategori"
                              >
                                <Trash2 size={15} />
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            isLoading={isLoading}
            onPageChange={goToPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deletingCategory}
        title="Hapus Kategori Perhiasan"
        description={
          deletingCategory
            ? `Apakah Anda yakin ingin menghapus kategori "${deletingCategory}"? Kategori hanya dapat dihapus jika tidak ada barang yang menggunakannya.`
            : ''
        }
        confirmLabel="Ya, Hapus Kategori"
        isLoading={isDeleting}
        onCancel={() => setDeletingCategory(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
