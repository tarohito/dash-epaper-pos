import React, { useEffect, useState } from 'react';
import { Gem, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { CategoryStatsItem } from '../../types';
import Tooltip from '../Tooltip';
import { ConfirmModal } from '../common/ConfirmModal';
import { posApi } from '../../services/api';
import { usePagination } from '../../hooks/usePagination';
import { PaginationControls } from '../common/PaginationControls';
import { ErrorBanner } from '../common/ErrorBanner';
import { useToast } from '../../contexts/ToastContext';

interface CategoryListViewProps {
  refreshTrigger: number;
  onOpenAddCategoryModal: () => void;
  onEditCategory: (category: string) => void;
  onDeleteCategory: (category: string) => Promise<void>;
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

  const {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    goToPage,
    setPageSize,
  } = usePagination(categories, { initialPageSize: 12 });

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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Daftar Kategori Perhiasan</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Pengelompokan etalase perhiasan emas berdasarkan jenis produk
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddCategoryModal}
          className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer self-stretch sm:self-auto shadow-xs active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>Tambah Kategori</span>
        </button>
      </div>

      {fetchError && (
        <ErrorBanner message={fetchError} onRetry={() => setRetryCount(c => c + 1)} />
      )}

      {isLoading && categories.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-gray-200 flex items-center justify-center gap-2 text-xs text-gray-500">
          <Loader2 size={18} className="animate-spin text-orange-500" />
          <span>Memuat statistik kategori...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            {paginatedItems.map(cat => {
              const stats = categoryStats[cat] || { count: 0, totalStok: 0, totalGram: 0 };
              return (
                <div
                  key={cat}
                  className="bg-white p-5 rounded-lg border border-gray-200 hover:border-orange-500 transition-all shadow-xs"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2.5 bg-orange-50 text-orange-600 rounded-lg font-bold">
                      <Gem size={20} />
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full font-mono mr-1">
                        {stats.count} Model SKU
                      </span>
                      <Tooltip content="Edit Nama Kategori" side="top">
                        <button
                          type="button"
                          onClick={() => onEditCategory(cat)}
                          className="w-7 h-7 rounded-md bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                          aria-label="Edit Nama Kategori"
                        >
                          <Pencil size={13} />
                        </button>
                      </Tooltip>
                      <Tooltip
                        content={
                          stats.count > 0
                            ? `Tidak dapat dihapus: masih digunakan oleh ${stats.count} produk`
                            : 'Hapus Kategori'
                        }
                        side="top"
                      >
                        <button
                          type="button"
                          disabled={stats.count > 0}
                          onClick={() => setDeletingCategory(cat)}
                          className="w-7 h-7 rounded-md bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-gray-400"
                          aria-label="Hapus Kategori"
                        >
                          <Trash2 size={13} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-gray-900">{cat}</h3>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs sm:text-sm text-gray-500">
                    <span>
                      Total Stok: <strong className="text-gray-800 font-mono">{stats.totalStok} pcs</strong>
                    </span>
                    <span>
                      Gramasi: <strong className="text-orange-600 font-mono">{stats.totalGram.toFixed(2)}g</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={goToPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </>
      )}

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
